import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as cpactions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

interface BeStackProps extends StackProps {
  vpc: ec2.IVpc;
  db: rds.DatabaseInstance;
  /** Pipeline 의 Manual Approval stage 가 알림 보낼 SNS topic (Slack 으로 전달됨) */
  approvalTopic?: sns.ITopic;
}

export class BeStack extends Stack {
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly ecrRepo: ecr.Repository;
  // Phase 4 — Slack 의 rollback 버튼 (ALB listener default action swap) 용 reference.
  public prodListener!: elbv2.ApplicationListener;
  public blueTg!: elbv2.ApplicationTargetGroup;
  public greenTg!: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: BeStackProps) {
    super(scope, id, props);

    const dbSecret = props.db.secret;
    if (!dbSecret) {
      throw new Error('DbStack 의 RDS 인스턴스에 secret 이 없습니다');
    }

    // ── ECR
    this.ecrRepo = new ecr.Repository(this, 'DpBackRepo', {
      repositoryName: 'dp-back',
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [{ maxImageCount: 30 }],
    });

    // ── JWT secret
    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      secretName: 'igallery/jwt-secret',
      generateSecretString: {
        passwordLength: 64,
        excludePunctuation: true,
      },
    });

    // ── ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: 'igallery',
    });

    // ── Security Groups
    const albSg = new ec2.SecurityGroup(this, 'AlbSg', {
      vpc: props.vpc,
      description: 'ALB security group',
      allowAllOutbound: true,
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'prod HTTP');
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080), 'blue/green test HTTP');

    const taskSg = new ec2.SecurityGroup(this, 'TaskSg', {
      vpc: props.vpc,
      description: 'ECS task security group',
      allowAllOutbound: true,
    });
    taskSg.addIngressRule(albSg, ec2.Port.tcp(8080), 'ALB to dp-back');

    // RDS ingress: ECS task → RDS
    const dbSg = props.db.connections.securityGroups[0];
    if (!dbSg) {
      throw new Error('RDS 인스턴스에 security group 이 없습니다');
    }
    new ec2.CfnSecurityGroupIngress(this, 'DbIngressFromTask', {
      groupId: dbSg.securityGroupId,
      sourceSecurityGroupId: taskSg.securityGroupId,
      ipProtocol: 'tcp',
      fromPort: 5432,
      toPort: 5432,
      description: 'ECS task to RDS',
    });

    // ── Log group
    const logGroup = new logs.LogGroup(this, 'TaskLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ── Task Definition (Fargate, arm64, 0.25 vCPU / 0.5 GB)
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    taskDef.addContainer('dp-back', {
      image: ecs.ContainerImage.fromEcrRepository(this.ecrRepo, 'latest'),
      essential: true,
      portMappings: [{ containerPort: 8080 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'dp-back',
        logGroup,
      }),
      environment: {
        REDIS_URL: 'redis://localhost:6379',
      },
      secrets: {
        DB_USER: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
        DB_HOST: ecs.Secret.fromSecretsManager(dbSecret, 'host'),
        DB_PORT: ecs.Secret.fromSecretsManager(dbSecret, 'port'),
        DB_NAME: ecs.Secret.fromSecretsManager(dbSecret, 'dbname'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
      },
    });

    taskDef.addContainer('redis', {
      image: ecs.ContainerImage.fromRegistry('redis:7-alpine'),
      essential: true,
      portMappings: [{ containerPort: 6379 }],
      memoryReservationMiB: 128,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'redis',
        logGroup,
      }),
    });

    // ── ALB
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc: props.vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: albSg,
    });

    // ── Blue / Green target groups
    const blueTg = new elbv2.ApplicationTargetGroup(this, 'BlueTg', {
      vpc: props.vpc,
      port: 8080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyHttpCodes: '200',
      },
      deregistrationDelay: Duration.seconds(30),
    });
    this.blueTg = blueTg;

    const greenTg = new elbv2.ApplicationTargetGroup(this, 'GreenTg', {
      vpc: props.vpc,
      port: 8080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyHttpCodes: '200',
      },
      deregistrationDelay: Duration.seconds(30),
    });
    this.greenTg = greenTg;

    // prod listener 80 → blue (실서비스 트래픽).
    // construct id 는 기존 stack 의 listener 와 동일하게 'Http' — logical id 가 같아야
    // CloudFormation 이 in-place update 로 처리 (포트 80 충돌 회피).
    const prodListener = this.alb.addListener('Http', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [blueTg],
      open: false,
    });
    this.prodListener = prodListener;

    // test listener 8080 → green (배포 검증용)
    const testListener = this.alb.addListener('Test', {
      port: 8080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [greenTg],
      open: false,
    });
    void testListener;

    // ── ECS Fargate Service (CodeDeploy controller)
    // construct id 를 'ServiceV2' 로 — deploymentController 변경은 ECS API 가 in-place
    // 거부하므로, logical id 변경으로 CloudFormation 이 service 를 destroy → recreate.
    const service = new ecs.FargateService(this, 'ServiceV2', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      assignPublicIp: true,
      securityGroups: [taskSg],
      deploymentController: {
        type: ecs.DeploymentControllerType.CODE_DEPLOY,
      },
      healthCheckGracePeriod: Duration.seconds(60),
    });

    // 초기에는 blue TG 에만 등록. 이후 배포는 CodeDeploy 가 swap.
    service.attachToApplicationTargetGroup(blueTg);

    // ── CloudWatch Alarm (auto-rollback 트리거)
    // 데이터가 없을 땐 OK 로 — 첫 배포가 INSUFFICIENT_DATA 로 막히는 걸 방지.
    const tg5xxAlarm = new cloudwatch.Alarm(this, 'Tg5xxAlarm', {
      alarmName: `${this.stackName}-target-5xx`,
      metric: blueTg.metrics.httpCodeTarget(
        elbv2.HttpCodeTarget.TARGET_5XX_COUNT,
        { period: Duration.minutes(1), statistic: 'Sum' },
      ),
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    const tgLatencyAlarm = new cloudwatch.Alarm(this, 'TgLatencyAlarm', {
      alarmName: `${this.stackName}-target-latency-p95`,
      metric: blueTg.metrics.targetResponseTime({
        period: Duration.minutes(1),
        statistic: 'p95',
      }),
      threshold: 1,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // ── CodeDeploy ECS application + blue/green deployment group
    const cdApp = new codedeploy.EcsApplication(this, 'CdApp', {
      applicationName: 'dp-back',
    });

    const cdGroup = new codedeploy.EcsDeploymentGroup(this, 'CdGroup', {
      application: cdApp,
      deploymentGroupName: 'prod',
      service,
      blueGreenDeploymentConfig: {
        blueTargetGroup: blueTg,
        greenTargetGroup: greenTg,
        listener: prodListener,
        testListener,
        // Phase 4 — 사용자 클릭 게이트 = CodeDeploy READY 단계로 복원.
        //   green task healthy → READY 상태 (4h 대기) → EventBridge READY event
        //   → Slack 알림 → 사용자 [✅ Reroute] 클릭 → continue-deployment → swap
        deploymentApprovalWaitTime: Duration.hours(4),
        // blue task 24시간 동안 살아있게 — 즉시 ALB swap 으로 롤백 가능.
        terminationWaitTime: Duration.minutes(1440),
      },
      // Reroute 클릭 시 즉시 100% Green (AllAtOnce). LINEAR 원하면 LINEAR_10PERCENT_EVERY_1MINUTES.
      deploymentConfig: codedeploy.EcsDeploymentConfig.ALL_AT_ONCE,
      alarms: [tg5xxAlarm, tgLatencyAlarm],
      autoRollback: {
        failedDeployment: true,
        stoppedDeployment: true,
        deploymentInAlarm: true,
      },
    });

    // ──────────────────────────────────────────────────────────────────
    //  CodePipeline (Phase 1) — ECR push 감지 → Build → CodeDeploy → 사람이 콘솔 클릭으로 swap
    // ──────────────────────────────────────────────────────────────────
    //
    // 흐름:
    //   1. GitHub Actions 가 git tag push 시 docker build → ECR push (tag, sha, latest)
    //   2. ECR 의 'latest' tag 갱신 이벤트가 이 Pipeline 의 Source 를 트리거
    //   3. CodeBuild 가 task definition 의 image 만 새 sha 로 swap 한 taskdef.json + appspec.yaml 출력
    //   4. CodeDeploy 가 위에 만든 cdGroup 으로 deployment 시작 — Green task 띄우고 healthy 됨
    //   5. ⏸ "트래픽 재라우팅" 대기 (deploymentApprovalWaitTime=4시간)
    //   6. 사용자가 CodeDeploy 콘솔에서 "Reroute traffic now" 클릭 → 즉시 swap (AllAtOnce)
    //
    // Pipeline 자체에 Manual Approval stage 없음 — CodeDeploy 의 Reroute 버튼이 게이트.

    const sourceArtifact = new codepipeline.Artifact('source');
    const buildArtifact = new codepipeline.Artifact('build');

    // ECR Source — 'latest' tag 가 갱신될 때 트리거 (EventBridge rule 자동 생성)
    const sourceAction = new cpactions.EcrSourceAction({
      actionName: 'ECR_Source',
      repository: this.ecrRepo,
      imageTag: 'latest',
      output: sourceArtifact,
    });

    // CodeBuild — task def 의 image 만 새 sha 로 render
    const buildProject = new codebuild.PipelineProject(this, 'BeBuild', {
      projectName: 'dp-back-build',
      environment: {
        buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      environmentVariables: {
        TD_FAMILY: { value: taskDef.family },
        CONTAINER_NAME: { value: 'dp-back' },
        CONTAINER_PORT: { value: '8080' },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo "=== Source artifact (ECR) ==="',
              'cat imageDetail.json',
              'IMAGE_URI=$(jq -r ".ImageURI" imageDetail.json)',
              'echo "image: $IMAGE_URI"',
              'echo "=== current task def ($TD_FAMILY) ==="',
              'aws ecs describe-task-definition --task-definition "$TD_FAMILY" --query taskDefinition > td_full.json',
              'jq --arg IMG "$IMAGE_URI" --arg NAME "$CONTAINER_NAME" \'(.containerDefinitions[] | select(.name == $NAME)).image = $IMG\' td_full.json > td_with_image.json',
              'jq \'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy, .deregisteredAt, .enableFaultInjection)\' td_with_image.json > taskdef.json',
              'echo "=== new taskdef.json ==="',
              'cat taskdef.json',
              'echo "=== generate appspec.yaml ==="',
              'cat > appspec.yaml <<EOF\nversion: 0.0\nResources:\n  - TargetService:\n      Type: AWS::ECS::Service\n      Properties:\n        TaskDefinition: <TASK_DEFINITION>\n        LoadBalancerInfo:\n          ContainerName: $CONTAINER_NAME\n          ContainerPort: $CONTAINER_PORT\n        PlatformVersion: LATEST\nEOF',
              'cat appspec.yaml',
            ],
          },
        },
        artifacts: {
          files: ['taskdef.json', 'appspec.yaml'],
        },
      }),
    });

    // CodeBuild role 에 ECS describe-task-definition 권한 추가
    buildProject.role!.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:DescribeTaskDefinition'],
        resources: ['*'],
      }),
    );

    const buildAction = new cpactions.CodeBuildAction({
      actionName: 'TaskDefRender',
      project: buildProject,
      input: sourceArtifact,
      outputs: [buildArtifact],
    });

    const deployAction = new cpactions.CodeDeployEcsDeployAction({
      actionName: 'BlueGreenDeploy',
      deploymentGroup: cdGroup,
      appSpecTemplateInput: buildArtifact,
      taskDefinitionTemplateInput: buildArtifact,
    });

    // Phase 4 — Pipeline 의 Approval stage 제거.
    // 사용자 클릭 게이트는 CodeDeploy 의 READY 단계 (deploymentApprovalWaitTime).
    // EventBridge rule → SNS → Slack 알림 → 사용자 클릭 → continue-deployment.
    void props.approvalTopic; // intentionally unused (EventBridge 로 전달)
    const pipeline = new codepipeline.Pipeline(this, 'BePipeline', {
      pipelineName: 'dp-back-pipeline',
      pipelineType: codepipeline.PipelineType.V2,
      executionMode: codepipeline.ExecutionMode.SUPERSEDED,
      stages: [
        { stageName: 'Source', actions: [sourceAction] },
        { stageName: 'Build', actions: [buildAction] },
        { stageName: 'Deploy', actions: [deployAction] },
      ],
    });

    new CfnOutput(this, 'BePipelineName', { value: pipeline.pipelineName });
    new CfnOutput(this, 'BePipelineConsoleUrl', {
      value: `https://${this.region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipeline.pipelineName}/view?region=${this.region}`,
    });
  }
}

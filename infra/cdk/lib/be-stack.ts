import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

interface BeStackProps extends StackProps {
  vpc: ec2.IVpc;
  db: rds.DatabaseInstance;
}

export class BeStack extends Stack {
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly ecrRepo: ecr.Repository;

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

    // prod listener 80 → blue (실서비스 트래픽).
    // construct id 는 기존 stack 의 listener 와 동일하게 'Http' — logical id 가 같아야
    // CloudFormation 이 in-place update 로 처리 (포트 80 충돌 회피).
    const prodListener = this.alb.addListener('Http', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [blueTg],
      open: false,
    });
    void prodListener;

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

    new codedeploy.EcsDeploymentGroup(this, 'CdGroup', {
      application: cdApp,
      deploymentGroupName: 'prod',
      service,
      blueGreenDeploymentConfig: {
        blueTargetGroup: blueTg,
        greenTargetGroup: greenTg,
        listener: prodListener,
        testListener,
        terminationWaitTime: Duration.minutes(5),
      },
      deploymentConfig:
        codedeploy.EcsDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTES,
      alarms: [tg5xxAlarm, tgLatencyAlarm],
      autoRollback: {
        failedDeployment: true,
        stoppedDeployment: true,
        deploymentInAlarm: true,
      },
    });
  }
}

import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as cpactions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * IgalleryFeCicd — FE Lambda 의 CI/CD 인프라.
 *
 * IgalleryFe stack 의 Lambda alias drift (cdk template 의 currentVersion vs
 * 운영이 시프트한 실 v) 를 회피하기 위해, Pipeline 만 별도 stack 으로 분리.
 * IgalleryFe stack 은 손대지 않음 — 봉인 상태.
 *
 * 흐름 (server / image 둘 다 동일 패턴):
 *   GitHub Actions deploy.yml → S3 source bucket 에 server.zip / image.zip upload
 *   → 이 Pipeline 의 Source 가 변경 감지
 *   → Build CodeBuild: update-function-code + publish-version + appspec.json 생성
 *   → ⏸ Manual Approval (사람이 콘솔에서 "Approve" 클릭해야 다음 단계)
 *   → Deploy CodeBuild: aws deploy create-deployment (LINEAR 10%/1min) + wait
 *
 * Manual Approval gate 는 BE 의 "Reroute traffic now" 와 동일한 의도 —
 * 빌드된 새 v 를 검토 후 사람이 명시적으로 시프트 시작.
 * Approval 안 누르면 Pipeline 은 7일 timeout 까지 대기 (CodePipeline 기본).
 */

interface FeCicdStackProps extends StackProps {
  /** IgalleryFe 가 만든 server Lambda 의 실 함수명 */
  serverFunctionName: string;
  /** IgalleryFe 가 만든 image Lambda 의 실 함수명 */
  imageFunctionName: string;
  /** IgalleryFe 가 만든 CodeDeploy application 이름 (server) */
  serverCodeDeployApp: string;
  /** IgalleryFe 가 만든 CodeDeploy application 이름 (image) */
  imageCodeDeployApp: string;
  /** CodeDeploy deployment group 이름 (둘 다 'prod') */
  codeDeployGroup: string;
}

export class FeCicdStack extends Stack {
  constructor(scope: Construct, id: string, props: FeCicdStackProps) {
    super(scope, id, props);

    // ── Source bucket (server.zip / image.zip 보관)
    //   versioning 활성화 = CodePipeline S3 source 요구.
    //   eventBridgeEnabled = PutObject 시 native EventBridge event 발행 (CloudTrail 불필요).
    //   lifecycle 30일 = 옛 zip 자동 삭제.
    const sourceBucket = new s3.Bucket(this, 'SourceBucket', {
      bucketName: 'igallery-fe-source',
      versioned: true,
      eventBridgeEnabled: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: Duration.days(30),
          abortIncompleteMultipartUploadAfter: Duration.days(1),
        },
      ],
    });

    this.buildPipeline(this, 'Server', {
      bucket: sourceBucket,
      sourceKey: 'fe/server/latest.zip',
      functionName: props.serverFunctionName,
      codeDeployApp: props.serverCodeDeployApp,
      codeDeployGroup: props.codeDeployGroup,
      pipelineName: 'igallery-fe-server-pipeline',
      appSpecResourceKey: 'ServerLambda',
    });

    this.buildPipeline(this, 'Image', {
      bucket: sourceBucket,
      sourceKey: 'fe/image/latest.zip',
      functionName: props.imageFunctionName,
      codeDeployApp: props.imageCodeDeployApp,
      codeDeployGroup: props.codeDeployGroup,
      pipelineName: 'igallery-fe-image-pipeline',
      appSpecResourceKey: 'ImageLambda',
    });

    new CfnOutput(this, 'SourceBucketName', { value: sourceBucket.bucketName });
  }

  private buildPipeline(
    scope: Construct,
    idPrefix: 'Server' | 'Image',
    opts: {
      bucket: s3.IBucket;
      sourceKey: string;
      functionName: string;
      codeDeployApp: string;
      codeDeployGroup: string;
      pipelineName: string;
      appSpecResourceKey: 'ServerLambda' | 'ImageLambda';
    },
  ) {
    const sourceArtifact = new codepipeline.Artifact('source');
    const buildArtifact = new codepipeline.Artifact('build');

    // ── Source: S3 zip 변경 감지 (EventBridge rule 자동 생성)
    const sourceAction = new cpactions.S3SourceAction({
      actionName: 'S3_Source',
      bucket: opts.bucket,
      bucketKey: opts.sourceKey,
      output: sourceArtifact,
      trigger: cpactions.S3Trigger.EVENTS,
    });

    // ── Build: lambda update-function-code + publish-version + appspec 생성
    const buildProject = new codebuild.PipelineProject(scope, `${idPrefix}Build`, {
      projectName: `igallery-fe-${idPrefix.toLowerCase()}-build`,
      environment: {
        buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      environmentVariables: {
        FN_NAME: { value: opts.functionName },
        APPSPEC_KEY: { value: opts.appSpecResourceKey },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo "=== source artifact contents ==="',
              'ls -la',
              // Source artifact 의 zip 안 내용이 풀린 상태로 도착 → 다시 zip 으로 묶기
              'zip -qr lambda.zip ./* -x lambda.zip',
              'echo "=== update-function-code ==="',
              'aws lambda update-function-code --function-name "$FN_NAME" --zip-file fileb://lambda.zip > /dev/null',
              'aws lambda wait function-updated-v2 --function-name "$FN_NAME"',
              'echo "=== publish-version ==="',
              'NEW=$(aws lambda publish-version --function-name "$FN_NAME" --description "via pipeline $CODEBUILD_BUILD_ID" --query Version --output text)',
              'echo "new version: $NEW"',
              'CURRENT=$(aws lambda get-alias --function-name "$FN_NAME" --name prod --query FunctionVersion --output text)',
              'echo "current alias version: $CURRENT"',
              'echo "$NEW" > new_version.txt',
              'echo "$CURRENT" > current_version.txt',
              // appspec.json 생성 — Deploy stage 가 이걸 사용
              'jq -nc --arg name "$FN_NAME" --arg key "$APPSPEC_KEY" --arg current "$CURRENT" --arg target "$NEW" \'{version:0.0,Resources:[{($key):{Type:"AWS::Lambda::Function",Properties:{Name:$name,Alias:"prod",CurrentVersion:$current,TargetVersion:$target}}}]}\' > appspec.json',
              'echo "=== appspec.json ==="',
              'cat appspec.json',
            ],
          },
        },
        artifacts: {
          files: ['appspec.json', 'new_version.txt', 'current_version.txt'],
        },
      }),
    });

    buildProject.role!.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'lambda:UpdateFunctionCode',
          'lambda:PublishVersion',
          'lambda:GetFunction',
          'lambda:GetFunctionConfiguration',
          'lambda:GetAlias',
          'lambda:ListVersionsByFunction',
        ],
        resources: [
          `arn:aws:lambda:${this.region}:${this.account}:function:${opts.functionName}`,
          `arn:aws:lambda:${this.region}:${this.account}:function:${opts.functionName}:*`,
        ],
      }),
    );

    const buildAction = new cpactions.CodeBuildAction({
      actionName: 'PublishVersion',
      project: buildProject,
      input: sourceArtifact,
      outputs: [buildArtifact],
    });

    // ── Deploy: aws deploy create-deployment + wait (LINEAR 10분 진행)
    const deployProject = new codebuild.PipelineProject(scope, `${idPrefix}Deploy`, {
      projectName: `igallery-fe-${idPrefix.toLowerCase()}-deploy`,
      environment: {
        buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      environmentVariables: {
        APP_NAME: { value: opts.codeDeployApp },
        GROUP_NAME: { value: opts.codeDeployGroup },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'cat appspec.json',
              'REV=$(jq -nc --argjson c "$(cat appspec.json)" \'{revisionType:"AppSpecContent",appSpecContent:{content:($c|tostring)}}\')',
              'echo "=== create-deployment ==="',
              'DID=$(aws deploy create-deployment --application-name "$APP_NAME" --deployment-group-name "$GROUP_NAME" --revision "$REV" --query deploymentId --output text)',
              'echo "deployment id: $DID"',
              'echo "=== wait deployment-successful (max ~10min for LINEAR 10%/1min) ==="',
              'aws deploy wait deployment-successful --deployment-id "$DID"',
              'echo "✅ deployment done"',
            ],
          },
        },
      }),
    });

    deployProject.role!.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'codedeploy:CreateDeployment',
          'codedeploy:GetDeployment',
          'codedeploy:GetDeploymentConfig',
          'codedeploy:RegisterApplicationRevision',
        ],
        resources: ['*'],
      }),
    );

    const deployAction = new cpactions.CodeBuildAction({
      actionName: 'CodeDeployLinear',
      project: deployProject,
      input: buildArtifact,
    });

    // ── Approval: Build (새 v publish) 끝나면 멈춰서 사람이 콘솔에서 Approve 클릭 대기.
    //    Approve 안 누르면 alias 시프트 안 시작 (옛 v 로 유저 트래픽 그대로).
    const approvalAction = new cpactions.ManualApprovalAction({
      actionName: 'Manual_Approval',
      additionalInformation:
        `${idPrefix} Lambda 의 새 version 이 publish 되었습니다. ` +
        `Approve 클릭 시 CodeDeploy 가 alias 'prod' 를 새 version 으로 LINEAR 10%/1min 시프트 시작합니다.`,
    });

    const pipeline = new codepipeline.Pipeline(scope, `${idPrefix}Pipeline`, {
      pipelineName: opts.pipelineName,
      pipelineType: codepipeline.PipelineType.V2,
      executionMode: codepipeline.ExecutionMode.SUPERSEDED,
      stages: [
        { stageName: 'Source', actions: [sourceAction] },
        { stageName: 'Build', actions: [buildAction] },
        { stageName: 'Approval', actions: [approvalAction] },
        { stageName: 'Deploy', actions: [deployAction] },
      ],
    });

    new CfnOutput(scope, `${idPrefix}PipelineName`, { value: pipeline.pipelineName });
    new CfnOutput(scope, `${idPrefix}PipelineConsoleUrl`, {
      value: `https://${this.region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipeline.pipelineName}/view?region=${this.region}`,
    });
  }
}

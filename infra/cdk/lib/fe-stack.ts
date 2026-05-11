import {
  Stack,
  StackProps,
  RemovalPolicy,
  Duration,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as path from 'path';

interface FeStackProps extends StackProps {
  alb: elbv2.IApplicationLoadBalancer;
}

export class FeStack extends Stack {
  constructor(scope: Construct, id: string, props: FeStackProps) {
    super(scope, id, props);

    const openNextPath = path.resolve(
      process.cwd(),
      '../../apps/dp-front/.open-next',
    );

    // ── S3 bucket: assets + ISR HTML 캐시
    const bucket = new s3.Bucket(this, 'AssetsBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          // 구버전 정적 chunk 는 buildId 가 박혀 immutable. 30일이면 안 쓰는 건 안전하게 삭제.
          prefix: '_assets/_next/static/',
          expiration: Duration.days(30),
        },
      ],
    });

    // ── DynamoDB: ISR cache tag store
    const cacheTable = new dynamodb.Table(this, 'CacheTable', {
      partitionKey: { name: 'tag', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'path', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ── SQS: revalidation 큐 (FIFO)
    const revalidationQueue = new sqs.Queue(this, 'RevalidationQueue', {
      fifo: true,
      contentBasedDeduplication: true,
      visibilityTimeout: Duration.seconds(30),
    });

    // ── Server Lambda
    const serverFn = new lambda.Function(this, 'ServerFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(openNextPath, 'server-functions/default'),
      ),
      memorySize: 1024,
      timeout: Duration.seconds(30),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        CACHE_BUCKET_NAME: bucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: '_cache',
        CACHE_BUCKET_REGION: this.region,
        CACHE_DYNAMO_TABLE: cacheTable.tableName,
        REVALIDATION_QUEUE_URL: revalidationQueue.queueUrl,
        REVALIDATION_QUEUE_REGION: this.region,
      },
    });
    bucket.grantReadWrite(serverFn);
    cacheTable.grantReadWriteData(serverFn);
    revalidationQueue.grantSendMessages(serverFn);

    // 매 cdk deploy 시 새 version 을 publish (asset hash 변경 시).
    const serverAlias = new lambda.Alias(this, 'ServerAliasProd', {
      aliasName: 'prod',
      version: serverFn.currentVersion,
    });

    // Function URL 은 alias 단위로 — CodeDeploy 가 alias routing 만 옮기면
    // CloudFront 의 origin 은 그대로 같은 URL.
    const serverFnUrl = serverAlias.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    // ── Image Optimization Lambda
    const imageFn = new lambda.Function(this, 'ImageFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(openNextPath, 'image-optimization-function'),
      ),
      memorySize: 1536,
      timeout: Duration.seconds(25),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        BUCKET_KEY_PREFIX: '_assets',
      },
    });
    bucket.grantRead(imageFn);

    const imageAlias = new lambda.Alias(this, 'ImageAliasProd', {
      aliasName: 'prod',
      version: imageFn.currentVersion,
    });

    const imageFnUrl = imageAlias.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // ── Revalidation Lambda: SQS 트리거 → ISR 백그라운드 재생성
    // 트래픽 수신자가 아니라 alias / blue-green 불필요.
    const revalidationFn = new lambda.Function(this, 'RevalidationFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(openNextPath, 'revalidation-function'),
      ),
      memorySize: 512,
      timeout: Duration.seconds(30),
      architecture: lambda.Architecture.ARM_64,
    });
    revalidationQueue.grantConsumeMessages(revalidationFn);
    revalidationFn.addEventSourceMapping('SqsTrigger', {
      eventSourceArn: revalidationQueue.queueArn,
      batchSize: 5,
    });

    // ── S3 정적 자산 / 초기 ISR HTML 배포 (첫 1회용; CI/CD 들어오면 aws s3 sync 로 대체)
    new s3deploy.BucketDeployment(this, 'AssetsDeployment', {
      sources: [s3deploy.Source.asset(path.join(openNextPath, 'assets'))],
      destinationBucket: bucket,
      destinationKeyPrefix: '_assets',
      prune: false,
      memoryLimit: 1024,
    });

    new s3deploy.BucketDeployment(this, 'CacheDeployment', {
      sources: [s3deploy.Source.asset(path.join(openNextPath, 'cache'))],
      destinationBucket: bucket,
      destinationKeyPrefix: '_cache',
      prune: false,
      memoryLimit: 1024,
    });

    // ── CloudFront origins
    const serverOrigin = new origins.FunctionUrlOrigin(serverFnUrl);
    const imageOrigin = new origins.FunctionUrlOrigin(imageFnUrl);
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(bucket, {
      originPath: '/_assets',
    });
    const albOrigin = new origins.LoadBalancerV2Origin(props.alb, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      httpPort: 80,
    });

    // ── CloudFront Function: /api/* → ALB 에 보낼 때 /api prefix 제거
    const apiPathRewriteFn = new cloudfront.Function(this, 'ApiPathRewrite', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  if (request.uri.indexOf('/api/') === 0) {
    request.uri = request.uri.substring(4);
  } else if (request.uri === '/api') {
    request.uri = '/';
  }
  return request;
}
      `),
    });

    // ── CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: serverOrigin,
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      additionalBehaviors: {
        '/_next/static/*': {
          origin: s3Origin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        // public/ 디렉터리의 정적 자산은 S3 직접 서빙 (server Lambda fallback 안 함).
        '/favicon/*': {
          origin: s3Origin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        '/favicon.ico': {
          origin: s3Origin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        '/dummy/*': {
          origin: s3Origin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        '/_next/image*': {
          origin: imageOrigin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        '/api/*': {
          origin: albOrigin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          functionAssociations: [
            {
              function: apiPathRewriteFn,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
      },
    });

    // ── Lambda CodeDeploy (Server / Image)
    const serverCdApp = new codedeploy.LambdaApplication(this, 'ServerCdApp', {
      applicationName: 'igallery-server',
    });

    const serverErrorAlarm = new cloudwatch.Alarm(this, 'ServerErrorAlarm', {
      alarmName: `${this.stackName}-server-errors`,
      metric: serverAlias.metricErrors({
        period: Duration.minutes(1),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    const serverLatencyAlarm = new cloudwatch.Alarm(
      this,
      'ServerLatencyAlarm',
      {
        alarmName: `${this.stackName}-server-latency-p95`,
        metric: serverAlias.metricDuration({
          period: Duration.minutes(1),
          statistic: 'p95',
        }),
        threshold: 5000,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      },
    );

    new codedeploy.LambdaDeploymentGroup(this, 'ServerCdGroup', {
      application: serverCdApp,
      deploymentGroupName: 'prod',
      alias: serverAlias,
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarms: [serverErrorAlarm, serverLatencyAlarm],
      autoRollback: {
        failedDeployment: true,
        stoppedDeployment: true,
        deploymentInAlarm: true,
      },
    });

    const imageCdApp = new codedeploy.LambdaApplication(this, 'ImageCdApp', {
      applicationName: 'igallery-image',
    });

    const imageErrorAlarm = new cloudwatch.Alarm(this, 'ImageErrorAlarm', {
      alarmName: `${this.stackName}-image-errors`,
      metric: imageAlias.metricErrors({
        period: Duration.minutes(1),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    new codedeploy.LambdaDeploymentGroup(this, 'ImageCdGroup', {
      application: imageCdApp,
      deploymentGroupName: 'prod',
      alias: imageAlias,
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarms: [imageErrorAlarm],
      autoRollback: {
        failedDeployment: true,
        stoppedDeployment: true,
        deploymentInAlarm: true,
      },
    });

    new CfnOutput(this, 'CloudFrontDomain', {
      value: distribution.distributionDomainName,
    });
    new CfnOutput(this, 'AssetsBucketName', {
      value: bucket.bucketName,
    });
    new CfnOutput(this, 'ServerFunctionName', {
      value: serverFn.functionName,
    });
    new CfnOutput(this, 'ImageFunctionName', {
      value: imageFn.functionName,
    });
  }
}

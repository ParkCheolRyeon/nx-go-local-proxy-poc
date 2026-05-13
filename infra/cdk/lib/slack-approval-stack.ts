import * as path from 'node:path';
import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

interface SlackApprovalStackProps extends StackProps {
  /** Slack 채널 ID (C로 시작) — backend-monorepo 패턴 */
  slackChannelId: string;
  /** Bot Token 이 들어있는 Secrets Manager secret 이름 */
  slackBotTokenSecretName: string;
  /** Signing Secret 이 들어있는 Secrets Manager secret 이름 */
  slackSigningSecretName: string;
}

/**
 * IgallerySlackApproval — Pipeline 의 Manual Approval 을 Slack 알림 + 버튼 으로 외부화.
 *
 * 흐름:
 *   Pipeline Approval stage → SNS Topic → notifier Lambda → Slack 채널에 알림 + 버튼
 *   사용자가 Slack 의 [✅ 배포 승인 / ❌ 거부] 클릭
 *     → Slack interactivity POST → API Gateway → handler Lambda
 *     → CodePipeline PutApprovalResult → Pipeline 의 Deploy stage 진입
 *
 * 운영 창구가 Slack 으로 통일 — BE/FE 어느 쪽이든 Slack 에서만 클릭.
 */
export class SlackApprovalStack extends Stack {
  public readonly approvalTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: SlackApprovalStackProps) {
    super(scope, id, props);

    // ── SNS Topic — Pipeline Approval stage 가 여기로 알림
    this.approvalTopic = new sns.Topic(this, 'ApprovalTopic', {
      topicName: 'igallery-deploy-approval',
      displayName: 'iGallery Deploy Approval',
    });

    // ── Secrets Manager 의 token / signing secret 참조
    const botTokenSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'BotTokenSecret',
      props.slackBotTokenSecretName,
    );
    const signingSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'SigningSecret',
      props.slackSigningSecretName,
    );

    // ── API Gateway — Slack interactivity endpoint
    const api = new apigateway.RestApi(this, 'SlackApi', {
      restApiName: 'igallery-slack-approval',
      description: 'Slack Interactivity Endpoint for deploy approvals',
    });

    // ── handler Lambda (Slack → CodePipeline PutApprovalResult)
    const handlerFn = new lambda_nodejs.NodejsFunction(this, 'ApprovalHandler', {
      functionName: 'igallery-approval-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', 'lambda', 'approval-handler', 'index.ts'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        SLACK_SIGNING_SECRET_NAME: props.slackSigningSecretName,
      },
      bundling: { minify: true, sourceMap: false, externalModules: [] },
    });
    handlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['codepipeline:PutApprovalResult'],
        resources: ['*'],
      }),
    );
    signingSecret.grantRead(handlerFn);

    api.root
      .addResource('slack')
      .addResource('interaction')
      .addMethod('POST', new apigateway.LambdaIntegration(handlerFn));

    // ── notifier Lambda (SNS → Slack chat.postMessage)
    const notifierFn = new lambda_nodejs.NodejsFunction(
      this,
      'ApprovalNotifier',
      {
        functionName: 'igallery-approval-notifier',
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'handler',
        entry: path.join(
          __dirname,
          '..',
          'lambda',
          'approval-notifier',
          'index.ts',
        ),
        timeout: Duration.seconds(30),
        memorySize: 256,
        environment: {
          SLACK_BOT_TOKEN_SECRET: props.slackBotTokenSecretName,
          SLACK_CHANNEL_ID: props.slackChannelId,
        },
        bundling: { minify: true, sourceMap: false, externalModules: [] },
      },
    );
    botTokenSecret.grantRead(notifierFn);
    this.approvalTopic.addSubscription(
      new sns_subscriptions.LambdaSubscription(notifierFn),
    );

    new CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description:
        'Slack App 의 Interactivity Request URL 에 입력 — 끝에 slack/interaction 추가',
    });
    new CfnOutput(this, 'SlackInteractionUrl', {
      value: `${api.url}slack/interaction`,
      description: 'Slack App Interactivity Request URL (그대로 복붙)',
    });
    new CfnOutput(this, 'ApprovalTopicArn', { value: this.approvalTopic.topicArn });
  }
}

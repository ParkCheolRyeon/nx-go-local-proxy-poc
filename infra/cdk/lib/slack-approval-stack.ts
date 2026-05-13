import * as path from 'node:path';
import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

interface SlackApprovalStackProps extends StackProps {
  slackChannelId: string;
  slackBotTokenSecretName: string;
  slackSigningSecretName: string;
  /** BE 의 prod listener (rollback 시 default action swap 대상) */
  beProdListener: elbv2.IApplicationListener;
  beBlueTg: elbv2.IApplicationTargetGroup;
  beGreenTg: elbv2.IApplicationTargetGroup;
  /** BE CodeDeploy 정보 (READY/SUCCESS event filter + Slack 메시지에 표시) */
  beCodeDeployApp: string;
  beCodeDeployGroup: string;
}

/**
 * Phase 4 — Slack 으로 CodeDeploy lifecycle 의 사용자 클릭 게이트 외부화.
 *
 * 흐름:
 *   CodeDeploy deployment 가 READY 상태 도달 (green healthy + traffic shift 대기)
 *     → EventBridge rule → SNS → notifier Lambda → Slack 알림 + [✅ Reroute / ❌ Stop]
 *     → 사용자 [✅] → handler → aws deploy continue-deployment → listener swap
 *
 *   deployment 가 SUCCESS 도달
 *     → EventBridge rule → SNS → notifier → Slack 알림 + [🔙 롤백] (terminationWaitTime 24h 안)
 *     → 사용자 [🔙] → handler → aws elbv2 modify-listener (default action TG swap)
 */
export class SlackApprovalStack extends Stack {
  public readonly approvalTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: SlackApprovalStackProps) {
    super(scope, id, props);

    this.approvalTopic = new sns.Topic(this, 'ApprovalTopic', {
      topicName: 'igallery-deploy-approval',
      displayName: 'iGallery Deploy Approval',
    });

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
    });

    // ── handler Lambda
    const handlerFn = new lambda_nodejs.NodejsFunction(this, 'ApprovalHandler', {
      functionName: 'igallery-approval-handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', 'lambda', 'approval-handler', 'index.ts'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        SLACK_SIGNING_SECRET_NAME: props.slackSigningSecretName,
        PROD_LISTENER_ARN: props.beProdListener.listenerArn,
        BLUE_TG_ARN: props.beBlueTg.targetGroupArn,
        GREEN_TG_ARN: props.beGreenTg.targetGroupArn,
        CODEDEPLOY_APP: props.beCodeDeployApp,
        CODEDEPLOY_GROUP: props.beCodeDeployGroup,
      },
      bundling: { minify: true, sourceMap: false, externalModules: [] },
    });
    handlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          // 옛 — Pipeline Approval (FE 가 쓸 수 있어 유지)
          'codepipeline:PutApprovalResult',
          // BE — CodeDeploy READY 단계 게이트
          'codedeploy:ContinueDeployment',
          'codedeploy:StopDeployment',
          'codedeploy:GetDeployment',
          // BE — Rollback (ALB listener default action swap)
          'elasticloadbalancing:ModifyListener',
          'elasticloadbalancing:DescribeListeners',
          // FE — BeforeAllowTraffic hook 의 게이트 처리
          'codedeploy:PutLifecycleEventHookExecutionStatus',
          // FE — Rollback (Lambda alias FunctionVersion 변경)
          'lambda:UpdateAlias',
          'lambda:GetAlias',
        ],
        resources: ['*'],
      }),
    );
    signingSecret.grantRead(handlerFn);

    api.root
      .addResource('slack')
      .addResource('interaction')
      .addMethod('POST', new apigateway.LambdaIntegration(handlerFn));

    // ── notifier Lambda
    const notifierFn = new lambda_nodejs.NodejsFunction(this, 'ApprovalNotifier', {
      functionName: 'igallery-approval-notifier',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', 'lambda', 'approval-notifier', 'index.ts'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        SLACK_BOT_TOKEN_SECRET: props.slackBotTokenSecretName,
        SLACK_CHANNEL_ID: props.slackChannelId,
      },
      bundling: { minify: true, sourceMap: false, externalModules: [] },
    });
    botTokenSecret.grantRead(notifierFn);
    notifierFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ecr:DescribeImages'],
        resources: ['*'],
      }),
    );
    this.approvalTopic.addSubscription(
      new sns_subscriptions.LambdaSubscription(notifierFn),
    );

    // ── post-swap-notifier Lambda — CodeDeploy AfterAllowTraffic hook.
    // step 6 swap 직후 invoke → Slack SUCCESS 메시지 + [🔙 롤백] 버튼 post + hook Succeeded.
    // functionName 고정 — BeStack 의 buildSpec 이 by-name 으로 appspec.yaml 에 박음.
    const postSwapFn = new lambda_nodejs.NodejsFunction(this, 'PostSwapNotifier', {
      functionName: 'igallery-post-swap-notifier',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', 'lambda', 'post-swap-notifier', 'index.ts'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        SLACK_BOT_TOKEN_SECRET: props.slackBotTokenSecretName,
        SLACK_CHANNEL_ID: props.slackChannelId,
      },
      bundling: { minify: true, sourceMap: false, externalModules: [] },
    });
    botTokenSecret.grantRead(postSwapFn);
    postSwapFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'codedeploy:PutLifecycleEventHookExecutionStatus',
          'ecr:DescribeImages',
        ],
        resources: ['*'],
      }),
    );

    new CfnOutput(this, 'PostSwapHookFunctionName', { value: postSwapFn.functionName });

    // ── FE BeforeAllowTraffic hook — Lambda CodeDeploy 의 사용자 클릭 게이트
    //   사용자 클릭 대기 동안 hook execution status 안 PUT — handler 가 사용자 클릭 시 PUT.
    const feBeforeFn = new lambda_nodejs.NodejsFunction(this, 'FeBeforeAllowTraffic', {
      functionName: 'igallery-fe-before-allow-traffic',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(
        __dirname,
        '..',
        'lambda',
        'fe-before-allow-traffic',
        'index.ts',
      ),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        SLACK_BOT_TOKEN_SECRET: props.slackBotTokenSecretName,
        SLACK_CHANNEL_ID: props.slackChannelId,
      },
      bundling: { minify: true, sourceMap: false, externalModules: [] },
    });
    botTokenSecret.grantRead(feBeforeFn);
    feBeforeFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'codedeploy:GetDeployment',
          'codedeploy:ListDeploymentTargets',
          'codedeploy:GetDeploymentTarget',
          'lambda:GetFunctionConfiguration',
        ],
        resources: ['*'],
      }),
    );

    // ── FE AfterAllowTraffic hook — swap 직후 [🔙 롤백] 알림 + hook Succeeded
    const fePostFn = new lambda_nodejs.NodejsFunction(this, 'FePostSwap', {
      functionName: 'igallery-fe-post-swap',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', 'lambda', 'fe-post-swap', 'index.ts'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        SLACK_BOT_TOKEN_SECRET: props.slackBotTokenSecretName,
        SLACK_CHANNEL_ID: props.slackChannelId,
      },
      bundling: { minify: true, sourceMap: false, externalModules: [] },
    });
    botTokenSecret.grantRead(fePostFn);
    fePostFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'codedeploy:GetDeployment',
          'codedeploy:ListDeploymentTargets',
          'codedeploy:GetDeploymentTarget',
          'codedeploy:PutLifecycleEventHookExecutionStatus',
          'lambda:GetFunctionConfiguration',
        ],
        resources: ['*'],
      }),
    );

    // ── Lambda resource-based policy — IgalleryFe stack 의 LambdaDeploymentGroup 의 service role 이
    //    이 hook 들 invoke 할 수 있게 허용 (IgalleryFe stack 무손상 — drift 회피).
    feBeforeFn.addPermission('AllowCodeDeployInvoke', {
      principal: new iam.ServicePrincipal('codedeploy.amazonaws.com'),
    });
    fePostFn.addPermission('AllowCodeDeployInvoke', {
      principal: new iam.ServicePrincipal('codedeploy.amazonaws.com'),
    });

    new CfnOutput(this, 'FeBeforeHookFunctionName', { value: feBeforeFn.functionName });
    new CfnOutput(this, 'FePostHookFunctionName', { value: fePostFn.functionName });

    // ── EventBridge Rule — CodeDeploy deployment state change
    // detail.state: READY (green healthy + reroute 대기) / SUCCESS (deployment 완료)
    // detail.application: BE 의 CodeDeploy 만 필터
    new events.Rule(this, 'CodeDeployStateChange', {
      ruleName: 'igallery-codedeploy-state-change',
      eventPattern: {
        source: ['aws.codedeploy'],
        detailType: ['CodeDeploy Deployment State-change Notification'],
        detail: {
          state: ['READY', 'SUCCESS'],
          application: [props.beCodeDeployApp],
        },
      },
      targets: [
        new targets.SnsTopic(this.approvalTopic, {
          // EventBridge → SNS 의 message 가 그대로 SNS subscription Lambda 에 도달.
          // notifier 가 message format 으로 CodeDeploy event 인지 인식 후 처리.
        }),
      ],
    });

    new CfnOutput(this, 'ApiGatewayUrl', { value: api.url });
    new CfnOutput(this, 'SlackInteractionUrl', {
      value: `${api.url}slack/interaction`,
    });
    new CfnOutput(this, 'ApprovalTopicArn', { value: this.approvalTopic.topicArn });
  }
}

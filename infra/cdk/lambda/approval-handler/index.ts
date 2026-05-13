import * as crypto from 'node:crypto';
import * as https from 'node:https';

interface SlackInteractionPayload {
  type: string;
  user: { id: string; username: string; name: string };
  actions: Array<{
    action_id: string;
    value: string;
  }>;
  response_url: string;
}

interface PipelineApprovalValue {
  pipelineName: string;
  stageName: string;
  actionName: string;
  token: string;
}

interface CodeDeployButtonValue {
  deploymentId: string;
  action: 'reroute' | 'rollback';
}

const SLACK_SIGNING_SECRET_NAME = process.env.SLACK_SIGNING_SECRET_NAME ?? '';
const PROD_LISTENER_ARN = process.env.PROD_LISTENER_ARN ?? '';
const BLUE_TG_ARN = process.env.BLUE_TG_ARN ?? '';
const GREEN_TG_ARN = process.env.GREEN_TG_ARN ?? '';

let cachedSigningSecret: string | null = null;
async function getSigningSecret(): Promise<string> {
  if (cachedSigningSecret) return cachedSigningSecret;
  const { SecretsManagerClient, GetSecretValueCommand } = await import(
    '@aws-sdk/client-secrets-manager'
  );
  const client = new SecretsManagerClient({});
  const result = await client.send(
    new GetSecretValueCommand({ SecretId: SLACK_SIGNING_SECRET_NAME }),
  );
  cachedSigningSecret = result.SecretString ?? '';
  return cachedSigningSecret;
}

function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;
  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${crypto
    .createHmac('sha256', signingSecret)
    .update(base)
    .digest('hex')}`;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

interface ApiGatewayEvent {
  body: string | null;
  isBase64Encoded?: boolean;
  headers: Record<string, string>;
}

export const handler = async (
  event: ApiGatewayEvent,
): Promise<{ statusCode: number; body: string }> => {
  try {
    let rawBody = event.body ?? '';
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
    }

    const headers = Object.fromEntries(
      Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
    );
    const timestamp = headers['x-slack-request-timestamp'];
    const signature = headers['x-slack-signature'];
    if (!timestamp || !signature) {
      return { statusCode: 400, body: 'Missing Slack signature headers' };
    }
    const signingSecret = await getSigningSecret();
    if (!verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
      return { statusCode: 401, body: 'Invalid Slack signature' };
    }

    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get('payload');
    if (!payloadStr) return { statusCode: 400, body: 'Missing payload' };

    const payload: SlackInteractionPayload = JSON.parse(payloadStr);
    const action = payload.actions[0];

    switch (action.action_id) {
      case 'approve_deployment':
      case 'reject_deployment':
        return await handlePipelineApproval(payload, action);
      case 'approve_reroute':
      case 'reject_reroute':
        return await handleCodeDeployReroute(payload, action);
      case 'rollback_deployment':
        return await handleRollback(payload, action);
      case 'approve_fe_reroute':
      case 'reject_fe_reroute':
        return await handleFeReroute(payload, action);
      case 'rollback_fe_lambda':
        return await handleFeRollback(payload, action);
      case 'open_console':
      case 'open_pipeline':
        return { statusCode: 200, body: '' }; // URL button — no-op
      default:
        return { statusCode: 200, body: '' };
    }
  } catch (error) {
    console.error('approval-handler error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};

async function handlePipelineApproval(
  payload: SlackInteractionPayload,
  action: SlackInteractionPayload['actions'][0],
) {
  const data: PipelineApprovalValue = JSON.parse(action.value);
  const isApproved = action.action_id === 'approve_deployment';
  const status: 'Approved' | 'Rejected' = isApproved ? 'Approved' : 'Rejected';
  const emoji = isApproved ? '✅' : '❌';
  const summary = `${status} by ${payload.user.name}`;

  const { CodePipelineClient, PutApprovalResultCommand } = await import(
    '@aws-sdk/client-codepipeline'
  );
  const client = new CodePipelineClient({});
  await client.send(
    new PutApprovalResultCommand({
      pipelineName: data.pipelineName,
      stageName: data.stageName,
      actionName: data.actionName,
      token: data.token,
      result: { summary, status },
    }),
  );

  await replaceMessage(payload.response_url, {
    text: `${emoji} ${data.pipelineName} — ${status} by ${payload.user.name}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${data.pipelineName}*\n${status} by *${payload.user.name}*`,
        },
      },
    ],
  });
  return { statusCode: 200, body: '' };
}

async function handleCodeDeployReroute(
  payload: SlackInteractionPayload,
  action: SlackInteractionPayload['actions'][0],
) {
  const data: CodeDeployButtonValue = JSON.parse(action.value);
  const isApprove = action.action_id === 'approve_reroute';

  const { CodeDeployClient, ContinueDeploymentCommand, StopDeploymentCommand } =
    await import('@aws-sdk/client-codedeploy');
  const client = new CodeDeployClient({});

  if (isApprove) {
    await client.send(
      new ContinueDeploymentCommand({
        deploymentId: data.deploymentId,
        deploymentWaitType: 'READY_WAIT',
      }),
    );
    await replaceMessage(payload.response_url, {
      text: `✅ Reroute triggered by ${payload.user.name}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Reroute 시작* — \`${data.deploymentId}\`\nby *${payload.user.name}*. ALB listener 가 즉시 swap 됩니다.`,
          },
        },
      ],
    });
  } else {
    await client.send(
      new StopDeploymentCommand({
        deploymentId: data.deploymentId,
        autoRollbackEnabled: true,
      }),
    );
    await replaceMessage(payload.response_url, {
      text: `❌ Deployment stopped by ${payload.user.name}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `❌ *Deployment Stop* — \`${data.deploymentId}\`\nby *${payload.user.name}*. 자동 rollback 진행.`,
          },
        },
      ],
    });
  }
  return { statusCode: 200, body: '' };
}

async function handleRollback(
  payload: SlackInteractionPayload,
  action: SlackInteractionPayload['actions'][0],
) {
  // Phase 4 — ALB listener 의 default action 의 TG 를 alternate 로 swap.
  //   현재 = greenTg → blueTg 로 swap (= 옛 v 로 롤백)
  //   현재 = blueTg → greenTg 로 swap (= 직전 롤백을 다시 되돌림)
  const data: CodeDeployButtonValue = JSON.parse(action.value);

  const {
    ElasticLoadBalancingV2Client,
    DescribeListenersCommand,
    ModifyListenerCommand,
  } = await import('@aws-sdk/client-elastic-load-balancing-v2');
  const client = new ElasticLoadBalancingV2Client({});

  const lis = await client.send(
    new DescribeListenersCommand({ ListenerArns: [PROD_LISTENER_ARN] }),
  );
  const current = lis.Listeners?.[0]?.DefaultActions?.[0];
  if (!current) {
    return { statusCode: 500, body: 'listener not found' };
  }

  // current.ForwardConfig 또는 current.TargetGroupArn 으로 현재 TG 확인
  const currentTgArn =
    current.TargetGroupArn ?? current.ForwardConfig?.TargetGroups?.[0]?.TargetGroupArn;
  let newTgArn: string;
  let from: string;
  let to: string;
  if (currentTgArn === BLUE_TG_ARN) {
    newTgArn = GREEN_TG_ARN;
    from = 'Blue';
    to = 'Green';
  } else if (currentTgArn === GREEN_TG_ARN) {
    newTgArn = BLUE_TG_ARN;
    from = 'Green';
    to = 'Blue';
  } else {
    return { statusCode: 500, body: 'unknown current TG' };
  }

  await client.send(
    new ModifyListenerCommand({
      ListenerArn: PROD_LISTENER_ARN,
      DefaultActions: [
        {
          Type: 'forward',
          TargetGroupArn: newTgArn,
        },
      ],
    }),
  );

  await replaceMessage(payload.response_url, {
    text: `🔙 Rollback by ${payload.user.name} — ${from} → ${to}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `🔙 *ALB Rollback* — listener default action: *${from}* → *${to}*\n` +
            `by *${payload.user.name}*. 사용자 트래픽이 즉시 옛 task 로.\n` +
            `(원래 deployment: \`${data.deploymentId}\`)`,
        },
      },
    ],
  });
  return { statusCode: 200, body: '' };
}

interface FeRerouteButtonValue {
  deploymentId: string;
  hookExecId: string;
  functionName: string;
  targetVersion: string;
  currentVersion: string;
  semverTag?: string;
  prevSemverTag?: string;
  action: 'fe_reroute';
}

interface FeRollbackButtonValue {
  functionName: string;
  previousVersion: string;
  currentVersion: string;
  prevSemverTag?: string;
  semverTag?: string;
  deploymentId: string;
  action: 'fe_rollback';
}

async function handleFeReroute(
  payload: SlackInteractionPayload,
  action: SlackInteractionPayload['actions'][0],
) {
  // FE BeforeAllowTraffic hook 의 사용자 클릭 게이트 처리.
  //   approve_fe_reroute → PutLifecycleEventHookExecutionStatus(Succeeded)
  //     → CodeDeploy 가 traffic shift 시작 (LambdaAllAtOnce 즉시 swap)
  //   reject_fe_reroute → PutLifecycleEventHookExecutionStatus(Failed)
  //     → CodeDeploy 의 autoRollback 발동
  const data: FeRerouteButtonValue = JSON.parse(action.value);
  const isApprove = action.action_id === 'approve_fe_reroute';

  const { CodeDeployClient, PutLifecycleEventHookExecutionStatusCommand } =
    await import('@aws-sdk/client-codedeploy');
  const client = new CodeDeployClient({});
  await client.send(
    new PutLifecycleEventHookExecutionStatusCommand({
      deploymentId: data.deploymentId,
      lifecycleEventHookExecutionId: data.hookExecId,
      status: isApprove ? 'Succeeded' : 'Failed',
    }),
  );

  const emoji = isApprove ? '✅' : '❌';
  const verb = isApprove ? 'Reroute 시작' : 'Reject';
  const semverLine =
    data.semverTag && data.prevSemverTag
      ? `${data.prevSemverTag} → *${data.semverTag}*`
      : `v${data.currentVersion} → v${data.targetVersion}`;
  await replaceMessage(payload.response_url, {
    text: `${emoji} FE ${verb} by ${payload.user.name}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `${emoji} *FE ${verb}* — \`${data.functionName}\`\n` +
            `${semverLine}\n` +
            `by *${payload.user.name}* (${data.deploymentId})`,
        },
      },
    ],
  });
  return { statusCode: 200, body: '' };
}

async function handleFeRollback(
  payload: SlackInteractionPayload,
  action: SlackInteractionPayload['actions'][0],
) {
  // Lambda alias 의 FunctionVersion 을 옛 v 로 즉시 변경 — 1초 안 사용자 트래픽 옛 코드로.
  const data: FeRollbackButtonValue = JSON.parse(action.value);

  const { LambdaClient, UpdateAliasCommand } = await import('@aws-sdk/client-lambda');
  const client = new LambdaClient({});
  await client.send(
    new UpdateAliasCommand({
      FunctionName: data.functionName,
      Name: 'prod',
      FunctionVersion: data.previousVersion,
      RoutingConfig: { AdditionalVersionWeights: {} }, // 가중치 비움 = 100% prev v
    }),
  );

  const rbLine =
    data.semverTag && data.prevSemverTag
      ? `${data.semverTag} → *${data.prevSemverTag}*`
      : `v${data.currentVersion} → *v${data.previousVersion}*`;
  await replaceMessage(payload.response_url, {
    text: `🔙 FE Rollback by ${payload.user.name} — ${rbLine}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `🔙 *FE Lambda Rollback* — \`${data.functionName}\`\n` +
            `${rbLine}\n` +
            `by *${payload.user.name}*. 사용자 트래픽이 즉시 옛 코드로.`,
        },
      },
    ],
  });
  return { statusCode: 200, body: '' };
}

function replaceMessage(responseUrl: string, message: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(responseUrl);
    const data = JSON.stringify({ replace_original: true, ...message });
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      res.resume(); // drain response stream
      res.on('end', () => resolve());
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

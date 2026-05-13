import * as https from 'node:https';

/**
 * FE CodeDeploy BeforeAllowTraffic hook.
 *
 * Lambda CodeDeploy 에는 ECS 의 deploymentApprovalWaitTime 같은 READY 단계 없음.
 * → BeforeAllowTraffic hook 으로 대체 — 사용자 클릭까지 hook execution 미완료 상태 유지.
 *
 * 흐름:
 *   1. 이 lambda 가 invoke 됨 (CodeDeploy 가 호출)
 *   2. Slack 알림 + [✅ Reroute / ❌ Stop] 버튼 post (deploymentId + hookExecId 박힘)
 *   3. 이 lambda 는 즉시 return — PutLifecycleEventHookExecutionStatus 호출 안 함
 *   4. CodeDeploy 는 lifecycle event status 가 PUT 될 때까지 wait (default timeout 1h)
 *   5. 사용자 Slack 클릭 → approval-handler 가 PutLifecycleEventHookExecutionStatus 호출
 *   6. CodeDeploy 가 그제야 traffic shift 시작 (LambdaAllAtOnce 즉시 swap)
 */

interface HookEvent {
  DeploymentId: string;
  LifecycleEventHookExecutionId: string;
}

const SLACK_BOT_TOKEN_SECRET = process.env.SLACK_BOT_TOKEN_SECRET ?? '';
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID ?? '';

let cachedBotToken: string | null = null;
async function getBotToken(): Promise<string> {
  if (cachedBotToken) return cachedBotToken;
  const { SecretsManagerClient, GetSecretValueCommand } = await import(
    '@aws-sdk/client-secrets-manager'
  );
  const client = new SecretsManagerClient({});
  const result = await client.send(
    new GetSecretValueCommand({ SecretId: SLACK_BOT_TOKEN_SECRET }),
  );
  cachedBotToken = result.SecretString ?? '';
  return cachedBotToken;
}

function nowKST(): string {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

export const handler = async (event: HookEvent): Promise<{ statusCode: number }> => {
  const { DeploymentId, LifecycleEventHookExecutionId } = event;

  // application + functionName/version 추출 (get-deployment-target 사용 — get-deployment 의 content 비어있음)
  const {
    CodeDeployClient,
    GetDeploymentCommand,
    ListDeploymentTargetsCommand,
    GetDeploymentTargetCommand,
  } = await import('@aws-sdk/client-codedeploy');
  const cd = new CodeDeployClient({});
  const dep = await cd.send(new GetDeploymentCommand({ deploymentId: DeploymentId }));
  const application = dep.deploymentInfo?.applicationName ?? 'unknown';

  const targets = await cd.send(
    new ListDeploymentTargetsCommand({ deploymentId: DeploymentId }),
  );
  const targetId = targets.targetIds?.[0];
  let functionName = 'unknown';
  let targetVersion = '?';
  let currentVersion = '?';
  if (targetId) {
    const target = await cd.send(
      new GetDeploymentTargetCommand({ deploymentId: DeploymentId, targetId }),
    );
    const info = target.deploymentTarget?.lambdaTarget?.lambdaFunctionInfo;
    functionName = info?.functionName ?? functionName;
    targetVersion = info?.targetVersion ?? targetVersion;
    currentVersion = info?.currentVersion ?? currentVersion;
  }

  // semver tag 추출 — lambda Version 의 description ("tag=fe/v0.0.4 sha=xxx") 에서
  const semverTag = await getSemverTag(functionName, targetVersion);
  const prevSemverTag = await getSemverTag(functionName, currentVersion);

  const value = JSON.stringify({
    deploymentId: DeploymentId,
    hookExecId: LifecycleEventHookExecutionId,
    functionName,
    targetVersion,
    currentVersion,
    semverTag,
    prevSemverTag,
    action: 'fe_reroute',
  });

  const consoleUrl = `https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/deployments/${DeploymentId}?region=ap-northeast-2`;
  await postToSlack({
    channel: SLACK_CHANNEL_ID,
    text: `🟢 FE Lambda 트래픽 라우팅 대기 (${application})`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🟢 FE Lambda 라우팅 대기' } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Application:*\n${application}` },
          { type: 'mrkdwn', text: `*Function:*\n${functionName}` },
          {
            type: 'mrkdwn',
            text:
              prevSemverTag.startsWith('fe/') || prevSemverTag.startsWith('be/')
                ? `*Version:*\n${prevSemverTag} → *${semverTag}*`
                : `*Version:*\n→ *${semverTag}*\n(이전 배포는 semver tag 없음)`,
          },
          { type: 'mrkdwn', text: `*시각:*\n${nowKST()}` },
          { type: 'mrkdwn', text: `*Deployment:*\n\`${DeploymentId}\`` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Reroute (즉시 swap)' },
            style: 'primary',
            action_id: 'approve_fe_reroute',
            value,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ Stop' },
            style: 'danger',
            action_id: 'reject_fe_reroute',
            value,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '🔗 콘솔' },
            url: consoleUrl,
            action_id: 'open_console',
          },
        ],
      },
    ],
  });

  // 이 lambda 는 즉시 return. PutLifecycleEventHookExecutionStatus 호출 X.
  // 사용자 Slack 클릭 후 approval-handler 가 PUT 호출.
  return { statusCode: 200 };
};

async function getSemverTag(functionName: string, version: string): Promise<string> {
  if (!functionName || functionName === 'unknown' || !version || version === '?') {
    return `v${version}`;
  }
  try {
    const { LambdaClient, GetFunctionConfigurationCommand } = await import(
      '@aws-sdk/client-lambda'
    );
    const lambda = new LambdaClient({});
    const config = await lambda.send(
      new GetFunctionConfigurationCommand({
        FunctionName: functionName,
        Qualifier: version,
      }),
    );
    const desc = config.Description ?? '';
    const m = desc.match(/tag=(\S+)/);
    return m?.[1] ?? `v${version}`;
  } catch {
    return `v${version}`;
  }
}

function postToSlack(message: object): Promise<void> {
  return new Promise((resolve, reject) => {
    (async () => {
      const token = await getBotToken();
      const data = JSON.stringify(message);
      const options = {
        hostname: 'slack.com',
        path: '/api/chat.postMessage',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${token}`,
          'Content-Length': Buffer.byteLength(data),
        },
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          const parsed = JSON.parse(body);
          if (!parsed.ok) reject(new Error(`Slack: ${parsed.error}`));
          else resolve();
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    })().catch(reject);
  });
}

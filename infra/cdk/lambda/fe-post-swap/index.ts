import * as https from 'node:https';

/**
 * FE CodeDeploy AfterAllowTraffic hook — Lambda alias 시프트 직후.
 *
 * 흐름:
 *   1. alias 의 FunctionVersion 변경 직후 CodeDeploy 가 invoke
 *   2. Slack 에 SUCCESS 메시지 + [🔙 롤백] 버튼 post (functionName + previousVersion 박힘)
 *   3. PutLifecycleEventHookExecutionStatus(Succeeded) 호출 → deployment 마무리
 *   4. 사용자가 언제든 [🔙 롤백] 클릭 시 handler 가 update-alias 로 옛 v 로 즉시 복원
 *
 * Lambda Version 은 영구 보존 (ECS task 와 달리 termination 없음) → 롤백 윈도우 무제한.
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

  const {
    CodeDeployClient,
    GetDeploymentCommand,
    ListDeploymentTargetsCommand,
    GetDeploymentTargetCommand,
    PutLifecycleEventHookExecutionStatusCommand,
  } = await import('@aws-sdk/client-codedeploy');
  const cd = new CodeDeployClient({});

  // application 이름 (Slack 알림용)
  const dep = await cd.send(new GetDeploymentCommand({ deploymentId: DeploymentId }));
  const application = dep.deploymentInfo?.applicationName ?? 'unknown';

  // get-deployment 의 appSpecContent.content 는 비어있음 (sha256 만 저장).
  // → get-deployment-target 의 lambdaFunctionInfo 로 functionName/version 추출.
  const targets = await cd.send(
    new ListDeploymentTargetsCommand({ deploymentId: DeploymentId }),
  );
  const targetId = targets.targetIds?.[0];
  let functionName = 'unknown';
  let targetVersion = '?';
  let previousVersion = '?';
  if (targetId) {
    const target = await cd.send(
      new GetDeploymentTargetCommand({ deploymentId: DeploymentId, targetId }),
    );
    const info = target.deploymentTarget?.lambdaTarget?.lambdaFunctionInfo;
    functionName = info?.functionName ?? functionName;
    targetVersion = info?.targetVersion ?? targetVersion;
    previousVersion = info?.currentVersion ?? previousVersion;
  }

  const semverTag = await getSemverTag(functionName, targetVersion);
  const prevSemverTag = await getSemverTag(functionName, previousVersion);

  // 1) Slack post (실패해도 hook 은 Succeeded 처리)
  try {
    const value = JSON.stringify({
      functionName,
      previousVersion,
      currentVersion: targetVersion,
      prevSemverTag,
      semverTag,
      deploymentId: DeploymentId,
      action: 'fe_rollback',
    });
    const consoleUrl = `https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/deployments/${DeploymentId}?region=ap-northeast-2`;
    await postToSlack({
      channel: SLACK_CHANNEL_ID,
      text: `✅ ${application} swap 완료 (${prevSemverTag} → ${semverTag}) — 롤백 가능`,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: '✅ FE Lambda swap 완료' } },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Application:*\n${application}` },
            { type: 'mrkdwn', text: `*Function:*\n${functionName}` },
            {
              type: 'mrkdwn',
              text:
                `*Version:*\n${prevSemverTag} → *${semverTag}*\n` +
                `(Lambda v${previousVersion} → v${targetVersion})`,
            },
            { type: 'mrkdwn', text: `*Swap 시각:*\n${nowKST()}` },
            {
              type: 'mrkdwn',
              text:
                '*롤백 메커니즘:*\nupdate-alias 로 즉시 옛 v 복원\n(Lambda Version 영구 보존 — 윈도우 무제한)',
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: `🔙 ${prevSemverTag} 로 롤백` },
              style: 'danger',
              action_id: 'rollback_fe_lambda',
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
  } catch (err) {
    console.error('Slack post failed:', err);
  }

  // 2) hook 즉시 Succeeded
  await cd.send(
    new PutLifecycleEventHookExecutionStatusCommand({
      deploymentId: DeploymentId,
      lifecycleEventHookExecutionId: LifecycleEventHookExecutionId,
      status: 'Succeeded',
    }),
  );

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

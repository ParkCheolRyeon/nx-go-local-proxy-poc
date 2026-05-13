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

  const { CodeDeployClient, GetDeploymentCommand, PutLifecycleEventHookExecutionStatusCommand } =
    await import('@aws-sdk/client-codedeploy');
  const cd = new CodeDeployClient({});

  const dep = await cd.send(new GetDeploymentCommand({ deploymentId: DeploymentId }));
  const application = dep.deploymentInfo?.applicationName ?? 'unknown';
  const appspecRaw = dep.deploymentInfo?.revision?.appSpecContent?.content ?? '{}';
  let functionName = 'unknown';
  let targetVersion = '?';
  let previousVersion = '?';
  try {
    const appspec = JSON.parse(appspecRaw);
    for (const r of appspec.Resources ?? []) {
      const k = Object.keys(r)[0];
      const p = r[k]?.Properties;
      if (p) {
        functionName = p.Name;
        targetVersion = p.TargetVersion;
        previousVersion = p.CurrentVersion; // appspec 의 CurrentVersion = 시프트 전 v = 롤백 대상
      }
    }
  } catch {
    /* ignore */
  }

  // 1) Slack post (실패해도 hook 은 Succeeded 처리)
  try {
    const value = JSON.stringify({
      functionName,
      previousVersion,
      currentVersion: targetVersion,
      deploymentId: DeploymentId,
      action: 'fe_rollback',
    });
    const consoleUrl = `https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/deployments/${DeploymentId}?region=ap-northeast-2`;
    await postToSlack({
      channel: SLACK_CHANNEL_ID,
      text: `✅ ${application} swap 완료 (v${previousVersion} → v${targetVersion}) — 롤백 가능`,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: '✅ FE Lambda swap 완료' } },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Application:*\n${application}` },
            { type: 'mrkdwn', text: `*Function:*\n${functionName}` },
            { type: 'mrkdwn', text: `*Version:*\nv${previousVersion} → *v${targetVersion}*` },
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
              text: { type: 'plain_text', text: `🔙 v${previousVersion} 로 롤백` },
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

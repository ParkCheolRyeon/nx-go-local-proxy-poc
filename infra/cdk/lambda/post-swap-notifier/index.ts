import * as https from 'node:https';

/**
 * BE CodeDeploy AfterAllowTraffic hook — ECS blue/green swap 직후.
 * Slack 에 "🐳 BE Swap 완료" 메시지 + [🔙 롤백] 버튼 (24h 윈도우 안).
 */

interface HookEvent {
  DeploymentId: string;
  LifecycleEventHookExecutionId: string;
}

const SLACK_BOT_TOKEN_SECRET = process.env.SLACK_BOT_TOKEN_SECRET ?? '';
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID ?? '';
const BE_COLOR = '#0066cc';

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

async function getBeSemverTags(
  repoName: string,
): Promise<{ current: string; prev: string }> {
  try {
    const { ECRClient, DescribeImagesCommand } = await import(
      '@aws-sdk/client-ecr'
    );
    const ecr = new ECRClient({});
    const result = await ecr.send(
      new DescribeImagesCommand({
        repositoryName: repoName,
        filter: { tagStatus: 'TAGGED' },
      }),
    );
    const sorted = (result.imageDetails ?? [])
      .filter((d) => d.imagePushedAt)
      .sort(
        (a, b) =>
          (b.imagePushedAt?.getTime() ?? 0) - (a.imagePushedAt?.getTime() ?? 0),
      );
    const findSemver = (tags?: string[]) =>
      tags?.find((t) => /^v[0-9]/.test(t));
    const cur = findSemver(sorted[0]?.imageTags);
    const prv = findSemver(sorted[1]?.imageTags);
    return {
      current: cur ? `be/${cur}` : 'unknown',
      prev: prv ? `be/${prv}` : 'unknown',
    };
  } catch {
    return { current: 'unknown', prev: 'unknown' };
  }
}

export const handler = async (event: HookEvent): Promise<{ statusCode: number }> => {
  const deploymentId = event.DeploymentId;
  const hookExecId = event.LifecycleEventHookExecutionId;
  const consoleUrl = `https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/deployments/${deploymentId}?region=ap-northeast-2`;

  const { current, prev } = await getBeSemverTags('dp-back');

  try {
    const value = JSON.stringify({ deploymentId, action: 'rollback' });
    await postToSlack({
      channel: SLACK_CHANNEL_ID,
      text: `🐳 BE Swap 완료: ${prev} → ${current}`,
      attachments: [
        {
          color: BE_COLOR,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '🐳 BE (ECS) Swap 완료' },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*이전 버전:*\n${prev}` },
                { type: 'mrkdwn', text: `*신규 버전:*\n*${current}*` },
                { type: 'mrkdwn', text: `*Swap 시각:*\n${nowKST()}` },
                { type: 'mrkdwn', text: `*Deployment:*\n\`${deploymentId}\`` },
                {
                  type: 'mrkdwn',
                  text:
                    '*롤백:*\n24시간 안 ALB listener 즉시 swap\n(blue task 살아있음)',
                },
              ],
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: `🔙 ${prev} 로 롤백` },
                  action_id: 'rollback_deployment',
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
            { type: 'divider' },
          ],
        },
      ],
    });
  } catch (err) {
    console.error('Slack post failed:', err);
  }

  const { CodeDeployClient, PutLifecycleEventHookExecutionStatusCommand } =
    await import('@aws-sdk/client-codedeploy');
  const cd = new CodeDeployClient({});
  await cd.send(
    new PutLifecycleEventHookExecutionStatusCommand({
      deploymentId,
      lifecycleEventHookExecutionId: hookExecId,
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

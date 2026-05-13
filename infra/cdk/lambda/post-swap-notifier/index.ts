import * as https from 'node:https';

/**
 * CodeDeploy AfterAllowTraffic lifecycle hook.
 *
 * step 6 (AllowTraffic = ALB listener swap 직후) 에 CodeDeploy 가 invoke.
 * 이 lambda 가:
 *   1) Slack 에 SUCCESS 메시지 + [🔙 롤백] 버튼 post (24h 윈도우)
 *   2) PutLifecycleEventHookExecutionStatus(Succeeded) 즉시 호출
 *      → step 7 (BeforeBlockTraffic, terminationWaitTime 24h wait) 정상 진행
 *      → blue task 가 24h 동안 살아있음 (롤백 윈도우)
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
  const deploymentId = event.DeploymentId;
  const hookExecId = event.LifecycleEventHookExecutionId;
  const consoleUrl = `https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/deployments/${deploymentId}?region=ap-northeast-2`;

  // ECR 의 latest image 의 tags 에서 be/v* semver 추출
  const semverTag = await getBeSemverTag('dp-back');

  // 1) Slack post (실패해도 hook 은 Succeeded 처리 — block 안 함)
  try {
    const value = JSON.stringify({ deploymentId, action: 'rollback' });
    await postToSlack({
      channel: SLACK_CHANNEL_ID,
      text: `✅ BE ${semverTag} 배포 완료 — 24h 안 롤백 가능 (\`${deploymentId}\`)`,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: '✅ BE Swap 완료 — 24h 롤백 윈도우' } },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Version:*\n*${semverTag}*` },
            { type: 'mrkdwn', text: `*Deployment:*\n\`${deploymentId}\`` },
            { type: 'mrkdwn', text: `*Swap 시각:*\n${nowKST()}` },
            { type: 'mrkdwn', text: '*롤백 메커니즘:*\nALB listener default action 즉시 swap' },
            { type: 'mrkdwn', text: '*윈도우:*\n24시간 (terminationWaitTime)' },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🔙 롤백 (즉시 swap)' },
              style: 'danger',
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
      ],
    });
  } catch (err) {
    console.error('Slack post failed:', err);
  }

  // 2) CodeDeploy hook 결과 즉시 Succeeded (block 안 함 — step 7 진행)
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

async function getBeSemverTag(repoName: string): Promise<string> {
  try {
    const { ECRClient, DescribeImagesCommand } = await import(
      '@aws-sdk/client-ecr'
    );
    const ecr = new ECRClient({});
    const result = await ecr.send(
      new DescribeImagesCommand({
        repositoryName: repoName,
        imageIds: [{ imageTag: 'latest' }],
      }),
    );
    const tags = result.imageDetails?.[0]?.imageTags ?? [];
    const semver = tags.find((t: string) => t.startsWith('be/'));
    return semver ?? 'unknown';
  } catch {
    return 'unknown';
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

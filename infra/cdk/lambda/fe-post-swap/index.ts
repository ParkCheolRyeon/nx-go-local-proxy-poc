import * as https from 'node:https';

/**
 * FE CodeDeploy AfterAllowTraffic hook — alias 시프트 직후.
 * Slack 에 swap 완료 알림 + [🔙 롤백] 버튼.
 */

interface HookEvent {
  DeploymentId: string;
  LifecycleEventHookExecutionId: string;
}

const SLACK_BOT_TOKEN_SECRET = process.env.SLACK_BOT_TOKEN_SECRET ?? '';
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID ?? '';
const FE_COLOR = '#00aa55';

const APP_TO_FN: Record<string, string> = {
  'igallery-server': 'IgalleryFe-ServerFn4F3A536E-0YLK8VIY9sJH',
  'igallery-image': 'IgalleryFe-ImageFnCD541B83-tB0xvT6AtpR9',
};

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

async function getDescriptionTag(
  lambdaClient: import('@aws-sdk/client-lambda').LambdaClient,
  functionName: string,
  version: string,
): Promise<string> {
  try {
    const { GetFunctionConfigurationCommand } = await import(
      '@aws-sdk/client-lambda'
    );
    const config = await lambdaClient.send(
      new GetFunctionConfigurationCommand({
        FunctionName: functionName,
        Qualifier: version,
      }),
    );
    const desc = config.Description ?? '';
    const m = desc.match(/tag=(\S+)/);
    return m?.[1] ?? 'unknown';
  } catch {
    return 'unknown';
  }
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

  const dep = await cd.send(new GetDeploymentCommand({ deploymentId: DeploymentId }));
  const application = dep.deploymentInfo?.applicationName ?? 'unknown';

  let functionName = APP_TO_FN[application] ?? 'unknown';

  const targets = await cd.send(
    new ListDeploymentTargetsCommand({ deploymentId: DeploymentId }),
  );
  const targetId = targets.targetIds?.[0];
  if (targetId) {
    const target = await cd.send(
      new GetDeploymentTargetCommand({ deploymentId: DeploymentId, targetId }),
    );
    const info = target.deploymentTarget?.lambdaTarget?.lambdaFunctionInfo;
    if (info?.functionName) functionName = info.functionName;
  }

  // BE 의 ECR sort 와 동일 패턴 — publish 시간 순 정렬 → [0]=신규 [1]=직전.
  // alias 의 currentVersion 무관 (사용자가 옛 deploy 의 swap 안 했어도 정확).
  const { LambdaClient, ListVersionsByFunctionCommand } = await import(
    '@aws-sdk/client-lambda'
  );
  const l = new LambdaClient({});
  const versions = await l.send(
    new ListVersionsByFunctionCommand({ FunctionName: functionName }),
  );
  const sorted = (versions.Versions ?? [])
    .filter((v) => v.Version && v.Version !== '$LATEST' && v.LastModified)
    .sort(
      (a, b) =>
        new Date(b.LastModified ?? 0).getTime() -
        new Date(a.LastModified ?? 0).getTime(),
    );
  const newV = sorted[0];
  const prevV = sorted[1];
  const targetVersion = newV?.Version ?? '?';
  const previousVersion = prevV?.Version ?? '?';

  const parseTag = (desc?: string) => desc?.match(/tag=(\S+)/)?.[1];
  const newTag = parseTag(newV?.Description);
  const prevTag = parseTag(prevV?.Description);

  const newLabel = newTag ?? `(lambda v${targetVersion})`;
  const prevLabel = prevTag ?? `(이전 배포, lambda v${previousVersion})`;

  try {
    const value = JSON.stringify({
      functionName,
      previousVersion,
      currentVersion: targetVersion,
      prevSemverTag: prevTag,
      semverTag: newTag,
      deploymentId: DeploymentId,
      action: 'fe_rollback',
    });
    const consoleUrl = `https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/deployments/${DeploymentId}?region=ap-northeast-2`;
    await postToSlack({
      channel: SLACK_CHANNEL_ID,
      text: `⚛️ FE Swap 완료: ${prevLabel} → ${newLabel}`,
      attachments: [
        {
          color: FE_COLOR,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '⚛️ FE (Lambda) Swap 완료' },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*이전 버전:*\n${prevLabel}` },
                { type: 'mrkdwn', text: `*신규 버전:*\n*${newLabel}*` },
                { type: 'mrkdwn', text: `*Application:*\n${application}` },
                { type: 'mrkdwn', text: `*Function:*\n\`${functionName}\`` },
                { type: 'mrkdwn', text: `*Swap 시각:*\n${nowKST()}` },
                {
                  type: 'mrkdwn',
                  text:
                    '*롤백:*\nupdate-alias 로 즉시 옛 v 복원\n(Lambda Version 영구 보존)',
                },
              ],
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: `🔙 ${prevLabel} 로 롤백` },
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
        },
      ],
    });
  } catch (err) {
    console.error('Slack post failed:', err);
  }

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

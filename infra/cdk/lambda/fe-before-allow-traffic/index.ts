import * as https from 'node:https';

/**
 * FE CodeDeploy BeforeAllowTraffic hook — Slack 알림 + 사용자 클릭 게이트.
 * 이 lambda 가 PutLifecycleEventHookExecutionStatus 호출 안 함.
 * 사용자 Slack [✅ Reroute] 클릭 시 handler 가 PUT(Succeeded) 호출 → traffic shift.
 */

interface HookEvent {
  DeploymentId: string;
  LifecycleEventHookExecutionId: string;
}

const SLACK_BOT_TOKEN_SECRET = process.env.SLACK_BOT_TOKEN_SECRET ?? '';
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID ?? '';
const FE_COLOR = '#00aa55';

// application 이름 → Lambda functionName 매핑 (BeforeAllowTraffic 시점에 lambdaFunctionInfo 비어있을 때 fallback)
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
    return m?.[1] ?? `unknown`;
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
  } = await import('@aws-sdk/client-codedeploy');
  const cd = new CodeDeployClient({});
  const dep = await cd.send(new GetDeploymentCommand({ deploymentId: DeploymentId }));
  const application = dep.deploymentInfo?.applicationName ?? 'unknown';

  let functionName = APP_TO_FN[application] ?? 'unknown';
  let targetVersion = '?';
  let currentVersion = '?';

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
    if (info?.targetVersion) targetVersion = info.targetVersion;
    if (info?.currentVersion) currentVersion = info.currentVersion;
  }

  // BeforeAllowTraffic 시점에 비어있으면 lambda API 로 직접 fetch
  const { LambdaClient, GetAliasCommand, ListVersionsByFunctionCommand } =
    await import('@aws-sdk/client-lambda');
  const l = new LambdaClient({});
  if (functionName !== 'unknown' && (currentVersion === '?' || targetVersion === '?')) {
    try {
      if (currentVersion === '?') {
        const a = await l.send(
          new GetAliasCommand({ FunctionName: functionName, Name: 'prod' }),
        );
        currentVersion = a.FunctionVersion ?? '?';
      }
      if (targetVersion === '?') {
        const vs = await l.send(
          new ListVersionsByFunctionCommand({ FunctionName: functionName }),
        );
        const nums = (vs.Versions ?? [])
          .map((v) => parseInt(v.Version ?? '0'))
          .filter((n) => !isNaN(n) && n > 0);
        if (nums.length > 0) targetVersion = String(Math.max(...nums));
      }
    } catch (e) {
      console.error('lambda fallback failed:', e);
    }
  }

  // version description 에서 semver tag 추출
  const currentTag = await getDescriptionTag(l, functionName, currentVersion);
  const targetTag = await getDescriptionTag(l, functionName, targetVersion);

  const prevLabel = currentTag !== 'unknown' ? currentTag : `(이전 배포, lambda v${currentVersion})`;
  const newLabel = targetTag !== 'unknown' ? targetTag : `(lambda v${targetVersion})`;

  const value = JSON.stringify({
    deploymentId: DeploymentId,
    hookExecId: LifecycleEventHookExecutionId,
    functionName,
    targetVersion,
    currentVersion,
    semverTag: targetTag,
    prevSemverTag: currentTag,
    action: 'fe_reroute',
  });

  const consoleUrl = `https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/deployments/${DeploymentId}?region=ap-northeast-2`;
  await postToSlack({
    channel: SLACK_CHANNEL_ID,
    text: `⚛️ FE 배포 대기: ${prevLabel} → ${newLabel}`,
    attachments: [
      {
        color: FE_COLOR,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '⚛️ FE (Lambda) 트래픽 라우팅 대기' },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*이전 버전:*\n${prevLabel}` },
              { type: 'mrkdwn', text: `*신규 버전:*\n*${newLabel}*` },
              { type: 'mrkdwn', text: `*Application:*\n${application}` },
              { type: 'mrkdwn', text: `*Function:*\n\`${functionName}\`` },
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
      },
    ],
  });

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

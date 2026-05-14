import * as https from 'node:https';

interface SNSEvent {
  Records: Array<{
    Sns: {
      Message: string;
    };
  }>;
}

interface PipelineApprovalMessage {
  approval: {
    pipelineName: string;
    stageName: string;
    actionName: string;
    token: string;
    expires: string;
    customData?: string;
  };
  consoleLink: string;
}

interface CodeDeployEventMessage {
  source: 'aws.codedeploy';
  'detail-type': 'CodeDeploy Deployment State-change Notification';
  detail: {
    deploymentId: string;
    state: 'READY' | 'SUCCESS' | 'FAILURE' | 'START' | 'STOP';
    application: string;
    deploymentGroup: string;
  };
}

const SLACK_BOT_TOKEN_SECRET = process.env.SLACK_BOT_TOKEN_SECRET ?? '';
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID ?? '';

// BE 색상 = 파랑, FE 색상 = 초록. attachment color 로 좌측 bar 색상 차별.
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

export const handler = async (event: SNSEvent): Promise<void> => {
  for (const record of event.Records) {
    const parsed = JSON.parse(record.Sns.Message);
    if (parsed.source === 'aws.codedeploy' && parsed['detail-type']) {
      await handleCodeDeployEvent(parsed as CodeDeployEventMessage);
    } else if (parsed.approval) {
      await handlePipelineApproval(parsed as PipelineApprovalMessage);
    }
  }
};

async function handleCodeDeployEvent(msg: CodeDeployEventMessage): Promise<void> {
  const { deploymentId, state, application } = msg.detail;
  if (state !== 'READY') return; // SUCCESS / 기타 무시 — post-swap-notifier 가 완료 알림 담당.

  const consoleUrl = `https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/deployments/${deploymentId}?region=ap-northeast-2`;
  const { current, prev } = await getBeSemverTags('dp-back');

  const value = JSON.stringify({ deploymentId, action: 'reroute' });
  await postToSlack({
    channel: SLACK_CHANNEL_ID,
    text: `🐳 BE 배포 대기: ${prev} → ${current}`,
    attachments: [
      {
        color: BE_COLOR,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '🐳 BE (ECS) 트래픽 라우팅 대기' },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*이전 버전:*\n${prev}` },
              { type: 'mrkdwn', text: `*신규 버전:*\n*${current}*` },
              { type: 'mrkdwn', text: `*Application:*\n${application}` },
              { type: 'mrkdwn', text: `*Deployment:*\n\`${deploymentId}\`` },
              { type: 'mrkdwn', text: `*시각:*\n${nowKST()}` },
              {
                type: 'mrkdwn',
                text:
                  '*검증 (선택):*\n`curl http://...:8080/health`\n(test listener)',
              },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '✅ Reroute (즉시 swap)' },
                action_id: 'approve_reroute',
                value,
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: '❌ Stop' },
                action_id: 'reject_reroute',
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
}

async function handlePipelineApproval(msg: PipelineApprovalMessage): Promise<void> {
  // Legacy Pipeline Approval (현재 안 씀)
  const { approval } = msg;
  const buttonValue = JSON.stringify({
    pipelineName: approval.pipelineName,
    stageName: approval.stageName,
    actionName: approval.actionName,
    token: approval.token,
  });
  await postToSlack({
    channel: SLACK_CHANNEL_ID,
    text: `Pipeline Approval: ${approval.pipelineName}`,
    blocks: [
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Approve' },
            action_id: 'approve_deployment',
            value: buttonValue,
          },
        ],
      },
    ],
  });
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
          if (!parsed.ok) {
            console.error('Slack API error:', body);
            reject(new Error(`Slack: ${parsed.error}`));
          } else resolve();
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    })().catch(reject);
  });
}

import * as https from 'node:https';

interface SNSEvent {
  Records: Array<{
    Sns: {
      Message: string;
      Subject?: string;
    };
  }>;
}

interface ApprovalMessage {
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

function toKST(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  } catch {
    return dateStr;
  }
}

export const handler = async (event: SNSEvent): Promise<void> => {
  for (const record of event.Records) {
    const message: ApprovalMessage = JSON.parse(record.Sns.Message);
    const { approval } = message;

    // Slack button 의 value 는 24KB 한도. 그래서 putApprovalResult 에 필요한
    // 4개 필드만 JSON 으로 넘김.
    const buttonValue = JSON.stringify({
      pipelineName: approval.pipelineName,
      stageName: approval.stageName,
      actionName: approval.actionName,
      token: approval.token,
    });

    const slackMessage = {
      channel: SLACK_CHANNEL_ID,
      text: `🚀 배포 승인 요청: ${approval.pipelineName}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚀 배포 승인 요청' },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Pipeline:*\n${approval.pipelineName}` },
            { type: 'mrkdwn', text: `*Stage:*\n${approval.stageName}` },
            { type: 'mrkdwn', text: `*Info:*\n${approval.customData || 'N/A'}` },
            { type: 'mrkdwn', text: `*요청 시간:*\n${nowKST()}` },
            { type: 'mrkdwn', text: `*만료:*\n${toKST(approval.expires)}` },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✅ 배포 승인' },
              style: 'primary',
              action_id: 'approve_deployment',
              value: buttonValue,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '❌ 거부' },
              style: 'danger',
              action_id: 'reject_deployment',
              value: buttonValue,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '🔗 콘솔에서 확인' },
              url: message.consoleLink,
              action_id: 'open_pipeline',
            },
          ],
        },
      ],
    };

    await postToSlack(slackMessage);
  }
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
          if (!parsed.ok) {
            console.error('Slack API error:', body);
            reject(new Error(`Slack API error: ${parsed.error}`));
          } else resolve();
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    })().catch(reject);
  });
}

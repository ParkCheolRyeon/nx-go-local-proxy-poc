import * as https from 'node:https';

interface SNSEvent {
  Records: Array<{
    Sns: {
      Message: string;
    };
  }>;
}

// 옛 — CodePipeline Manual Approval action 이 SNS publish 하는 형식
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

// 새 — EventBridge → SNS 의 CodeDeploy state-change event
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

export const handler = async (event: SNSEvent): Promise<void> => {
  for (const record of event.Records) {
    const parsed = JSON.parse(record.Sns.Message);

    // 형식 분기
    if (parsed.source === 'aws.codedeploy' && parsed['detail-type']) {
      await handleCodeDeployEvent(parsed as CodeDeployEventMessage);
    } else if (parsed.approval) {
      await handlePipelineApproval(parsed as PipelineApprovalMessage);
    } else {
      console.warn('Unknown SNS message format', record.Sns.Message.slice(0, 200));
    }
  }
};

async function handleCodeDeployEvent(msg: CodeDeployEventMessage): Promise<void> {
  const { deploymentId, state, application, deploymentGroup } = msg.detail;
  const consoleUrl = `https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/deployments/${deploymentId}?region=ap-northeast-2`;

  if (state === 'READY') {
    const value = JSON.stringify({ deploymentId, action: 'reroute' });
    await postToSlack({
      channel: SLACK_CHANNEL_ID,
      text: `🟢 Green task healthy — 트래픽 swap 결정 필요 (${application})`,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: '🟢 트래픽 라우팅 대기' } },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Application:*\n${application}` },
            { type: 'mrkdwn', text: `*DeploymentGroup:*\n${deploymentGroup}` },
            { type: 'mrkdwn', text: `*Deployment:*\n\`${deploymentId}\`` },
            { type: 'mrkdwn', text: `*시각:*\n${nowKST()}` },
            {
              type: 'mrkdwn',
              text:
                '*검증:*\nALB 8080 (test listener) 로 green 응답 확인 가능\n`curl http://Igalle-Alb16-...:8080/health`',
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✅ Reroute (즉시 swap)' },
              style: 'primary',
              action_id: 'approve_reroute',
              value,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '❌ Stop' },
              style: 'danger',
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
      ],
    });
  } else if (state === 'SUCCESS') {
    // terminationWaitTime 24h 안에 ALB swap 으로 즉시 롤백 가능.
    const value = JSON.stringify({ deploymentId, action: 'rollback' });
    await postToSlack({
      channel: SLACK_CHANNEL_ID,
      text: `✅ ${application} 배포 완료 — 24시간 안 롤백 가능`,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: '✅ 배포 완료' } },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Application:*\n${application}` },
            { type: 'mrkdwn', text: `*Deployment:*\n\`${deploymentId}\`` },
            { type: 'mrkdwn', text: `*시각:*\n${nowKST()}` },
            {
              type: 'mrkdwn',
              text:
                '*롤백:*\n24시간 동안 옛 task 가 살아있음.\n클릭 시 ALB listener 즉시 swap.',
            },
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
  } else if (state === 'FAILURE' || state === 'STOP') {
    await postToSlack({
      channel: SLACK_CHANNEL_ID,
      text: `❌ ${application} 배포 ${state}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `❌ *${application}*\nDeployment \`${deploymentId}\` 가 ${state} 됨. <${consoleUrl}|콘솔에서 확인>`,
          },
        },
      ],
    });
  }
  // START 는 무시 (너무 잦음)
}

async function handlePipelineApproval(msg: PipelineApprovalMessage): Promise<void> {
  const { approval } = msg;
  const buttonValue = JSON.stringify({
    pipelineName: approval.pipelineName,
    stageName: approval.stageName,
    actionName: approval.actionName,
    token: approval.token,
  });
  await postToSlack({
    channel: SLACK_CHANNEL_ID,
    text: `🚀 배포 승인 요청: ${approval.pipelineName}`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🚀 배포 승인 요청' } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Pipeline:*\n${approval.pipelineName}` },
          { type: 'mrkdwn', text: `*Stage:*\n${approval.stageName}` },
          { type: 'mrkdwn', text: `*Info:*\n${approval.customData || 'N/A'}` },
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

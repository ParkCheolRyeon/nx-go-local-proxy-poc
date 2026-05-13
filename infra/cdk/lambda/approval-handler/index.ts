import * as crypto from 'node:crypto';
import * as https from 'node:https';

/**
 * Slack interactivity handler.
 *
 * Slack 의 button click → API Gateway → 이 lambda → CodePipeline PutApprovalResult.
 *
 * 보안: Slack 의 signed request 검증 (X-Slack-Signature + signing secret).
 */

interface SlackInteractionPayload {
  type: string;
  user: { id: string; username: string; name: string };
  actions: Array<{
    action_id: string;
    value: string;
  }>;
  response_url: string;
}

interface ApprovalButtonValue {
  pipelineName: string;
  stageName: string;
  actionName: string;
  token: string;
}

const SLACK_SIGNING_SECRET_NAME = process.env.SLACK_SIGNING_SECRET_NAME ?? '';

let cachedSigningSecret: string | null = null;

async function getSigningSecret(): Promise<string> {
  if (cachedSigningSecret) return cachedSigningSecret;
  const { SecretsManagerClient, GetSecretValueCommand } = await import(
    '@aws-sdk/client-secrets-manager'
  );
  const client = new SecretsManagerClient({});
  const result = await client.send(
    new GetSecretValueCommand({ SecretId: SLACK_SIGNING_SECRET_NAME }),
  );
  cachedSigningSecret = result.SecretString ?? '';
  return cachedSigningSecret;
}

function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  // 5분 안 요청만 허용 (replay attack 방지)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${crypto
    .createHmac('sha256', signingSecret)
    .update(base)
    .digest('hex')}`;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

async function putApprovalResult(
  pipelineName: string,
  stageName: string,
  actionName: string,
  token: string,
  status: 'Approved' | 'Rejected',
  summary: string,
): Promise<void> {
  const { CodePipelineClient, PutApprovalResultCommand } = await import(
    '@aws-sdk/client-codepipeline'
  );
  const client = new CodePipelineClient({});
  await client.send(
    new PutApprovalResultCommand({
      pipelineName,
      stageName,
      actionName,
      token,
      result: { summary, status },
    }),
  );
}

interface ApiGatewayEvent {
  body: string | null;
  isBase64Encoded?: boolean;
  headers: Record<string, string>;
}

export const handler = async (
  event: ApiGatewayEvent,
): Promise<{ statusCode: number; body: string }> => {
  try {
    let rawBody = event.body ?? '';
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
    }

    // Slack signed request 검증
    const headers = Object.fromEntries(
      Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
    );
    const timestamp = headers['x-slack-request-timestamp'];
    const signature = headers['x-slack-signature'];
    if (!timestamp || !signature) {
      return { statusCode: 400, body: 'Missing Slack signature headers' };
    }
    const signingSecret = await getSigningSecret();
    if (!verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
      return { statusCode: 401, body: 'Invalid Slack signature' };
    }

    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get('payload');
    if (!payloadStr) return { statusCode: 400, body: 'Missing payload' };

    const payload: SlackInteractionPayload = JSON.parse(payloadStr);
    const action = payload.actions[0];

    if (
      action.action_id !== 'approve_deployment' &&
      action.action_id !== 'reject_deployment'
    ) {
      // 'open_pipeline' button 등은 노액션 (URL button)
      return { statusCode: 200, body: '' };
    }

    const data: ApprovalButtonValue = JSON.parse(action.value);
    const isApproved = action.action_id === 'approve_deployment';
    const status = isApproved ? 'Approved' : 'Rejected';
    const emoji = isApproved ? '✅' : '❌';
    const summary = `${status} by ${payload.user.name} (@${payload.user.username})`;

    await putApprovalResult(
      data.pipelineName,
      data.stageName,
      data.actionName,
      data.token,
      status,
      summary,
    );

    // 원본 메시지 update — 버튼 사라지고 결과 표시
    await updateSlackMessage(payload.response_url, {
      replace_original: true,
      text: `${emoji} ${data.pipelineName} — ${status} by ${payload.user.name}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *${data.pipelineName}*\n${status} by *${payload.user.name}*`,
          },
        },
      ],
    });

    return { statusCode: 200, body: '' };
  } catch (error) {
    console.error('approval-handler error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};

function updateSlackMessage(
  responseUrl: string,
  message: object,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(responseUrl);
    const data = JSON.stringify(message);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve());
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

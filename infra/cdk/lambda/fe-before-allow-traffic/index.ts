import * as https from 'node:https';

/**
 * FE CodeDeploy BeforeAllowTraffic hook — aggregator.
 *
 * server / image 가 같은 tag (예: fe/v0.0.10) 으로 거의 동시에 배포되면
 * hook 도 2번 발화되어 Slack 알림이 2번 옴. 그 둘을 1개 메시지로 묶기 위해:
 *   1) hook 발화 → DDB 에 자신 entry 등록 (PK: tag)
 *   2) AGGREGATE_WAIT_MS 만큼 대기 (sibling hook 이 합류할 시간 확보)
 *   3) CAS 로 "내가 알림 보냄" flag 선점 시도 — 먼저 도착한 hook 만 성공
 *   4) 성공한 hook = DDB 의 모든 entry 읽어서 1개 Slack 메시지 전송
 *   5) 진 hook = 아무것도 안 함
 *
 * PutLifecycleEventHookExecutionStatus 는 여전히 handler 가 호출 (사용자 클릭 시).
 * batch button value 에는 tag 만 들어가고, handler 가 DDB 로 모든 deployment 조회.
 */

interface HookEvent {
  DeploymentId: string;
  LifecycleEventHookExecutionId: string;
}

const SLACK_BOT_TOKEN_SECRET = process.env.SLACK_BOT_TOKEN_SECRET ?? '';
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID ?? '';
const BATCH_TABLE = process.env.BATCH_TABLE ?? '';
const FE_COLOR = '#00aa55';
const AGGREGATE_WAIT_MS = 45_000;
const TTL_SECONDS = 2 * 60 * 60; // 2시간

const APP_TO_FN: Record<string, string> = {
  'igallery-server': 'IgalleryFe-ServerFn4F3A536E-0YLK8VIY9sJH',
  'igallery-image': 'IgalleryFe-ImageFnCD541B83-tB0xvT6AtpR9',
};

interface BatchEntry {
  type: string; // 'server' | 'image'
  application: string;
  functionName: string;
  deploymentId: string;
  hookExecId: string;
  targetVersion: string;
  prevVersion: string;
}

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

async function extractContext(event: HookEvent): Promise<{
  entry: BatchEntry;
  targetTag: string;
  prevTag: string;
}> {
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
  const type = application.replace('igallery-', ''); // 'server' | 'image'

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
  const prevVersion = prevV?.Version ?? '?';

  const parseTag = (desc?: string) => desc?.match(/tag=(\S+)/)?.[1];
  const targetTag = parseTag(newV?.Description) ?? `unknown-${Date.now()}`;
  const prevTag = parseTag(prevV?.Description) ?? `(이전 배포, lambda v${prevVersion})`;

  const entry: BatchEntry = {
    type,
    application,
    functionName,
    deploymentId: DeploymentId,
    hookExecId: LifecycleEventHookExecutionId,
    targetVersion,
    prevVersion,
  };
  return { entry, targetTag, prevTag };
}

async function registerEntry(
  ddb: import('@aws-sdk/client-dynamodb').DynamoDBClient,
  marshalled: { tag: string; type: string; entryItem: Record<string, unknown>; prevTag: string },
): Promise<void> {
  const { UpdateItemCommand } = await import('@aws-sdk/client-dynamodb');
  const { marshall } = await import('@aws-sdk/util-dynamodb');
  const ttl = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  // 1차: entries Map 과 ttl, prevTag 초기화 (없을 때만)
  await ddb.send(
    new UpdateItemCommand({
      TableName: BATCH_TABLE,
      Key: { tag: { S: marshalled.tag } },
      UpdateExpression:
        'SET entries = if_not_exists(entries, :empty), #ttl = if_not_exists(#ttl, :ttl), prevTag = if_not_exists(prevTag, :prevTag)',
      ExpressionAttributeNames: { '#ttl': 'ttl' },
      ExpressionAttributeValues: marshall({
        ':empty': {},
        ':ttl': ttl,
        ':prevTag': marshalled.prevTag,
      }),
    }),
  );
  // 2차: 자신의 entry 추가
  await ddb.send(
    new UpdateItemCommand({
      TableName: BATCH_TABLE,
      Key: { tag: { S: marshalled.tag } },
      UpdateExpression: 'SET entries.#type = :entry',
      ExpressionAttributeNames: { '#type': marshalled.type },
      ExpressionAttributeValues: marshall({ ':entry': marshalled.entryItem }),
    }),
  );
}

async function tryClaimNotifier(
  ddb: import('@aws-sdk/client-dynamodb').DynamoDBClient,
  tag: string,
): Promise<boolean> {
  const { UpdateItemCommand, ConditionalCheckFailedException } = await import(
    '@aws-sdk/client-dynamodb'
  );
  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: BATCH_TABLE,
        Key: { tag: { S: tag } },
        UpdateExpression: 'SET notified = :true',
        ConditionExpression: 'attribute_not_exists(notified)',
        ExpressionAttributeValues: { ':true': { BOOL: true } },
      }),
    );
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return false;
    throw err;
  }
}

async function readBatch(
  ddb: import('@aws-sdk/client-dynamodb').DynamoDBClient,
  tag: string,
): Promise<{ entries: BatchEntry[]; prevTag: string }> {
  const { GetItemCommand } = await import('@aws-sdk/client-dynamodb');
  const { unmarshall } = await import('@aws-sdk/util-dynamodb');
  const result = await ddb.send(
    new GetItemCommand({
      TableName: BATCH_TABLE,
      Key: { tag: { S: tag } },
      ConsistentRead: true,
    }),
  );
  if (!result.Item) return { entries: [], prevTag: '' };
  const item = unmarshall(result.Item) as {
    entries?: Record<string, BatchEntry>;
    prevTag?: string;
  };
  const entries = Object.values(item.entries ?? {});
  return { entries, prevTag: item.prevTag ?? '' };
}

async function sendBatchedSlack(
  targetTag: string,
  prevTag: string,
  entries: BatchEntry[],
): Promise<void> {
  const value = JSON.stringify({ tag: targetTag, action: 'fe_reroute_batch' });
  const targetList = entries
    .map((e) => `• *${e.type}*  →  \`${e.deploymentId}\``)
    .join('\n');
  const consoleUrl =
    entries[0]?.deploymentId
      ? `https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/deployments/${entries[0].deploymentId}?region=ap-northeast-2`
      : 'https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/applications?region=ap-northeast-2';

  const countLabel = entries.length === 1 ? `${entries[0]?.type ?? '?'}` : `${entries.length}개 함수`;

  await postToSlack({
    channel: SLACK_CHANNEL_ID,
    text: `⚛️ FE 배포 대기: ${prevTag} → ${targetTag} (${countLabel})`,
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
              { type: 'mrkdwn', text: `*이전 버전:*\n${prevTag}` },
              { type: 'mrkdwn', text: `*신규 버전:*\n*${targetTag}*` },
              { type: 'mrkdwn', text: `*시각:*\n${nowKST()}` },
              { type: 'mrkdwn', text: `*포함:*\n${entries.length}개 함수` },
            ],
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*배포 대상*\n${targetList}` },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text:
                    entries.length === 1
                      ? '✅ Reroute (즉시 swap)'
                      : `✅ ${entries.length}개 함께 Reroute`,
                },
                action_id: 'approve_fe_reroute_batch',
                value,
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: entries.length === 1 ? '❌ Stop' : `❌ ${entries.length}개 함께 Stop`,
                },
                action_id: 'reject_fe_reroute_batch',
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

export const handler = async (event: HookEvent): Promise<{ statusCode: number }> => {
  const { entry, targetTag, prevTag } = await extractContext(event);

  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const ddb = new DynamoDBClient({});

  await registerEntry(ddb, {
    tag: targetTag,
    type: entry.type,
    entryItem: entry as unknown as Record<string, unknown>,
    prevTag,
  });

  await new Promise((r) => setTimeout(r, AGGREGATE_WAIT_MS));

  const claimed = await tryClaimNotifier(ddb, targetTag);
  if (!claimed) {
    // sibling 이 먼저 Slack 보냄 — 아무것도 안 함
    return { statusCode: 200 };
  }

  const { entries, prevTag: storedPrevTag } = await readBatch(ddb, targetTag);
  await sendBatchedSlack(targetTag, storedPrevTag || prevTag, entries);
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

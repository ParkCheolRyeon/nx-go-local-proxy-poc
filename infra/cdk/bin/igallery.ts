#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import { BeStack } from '../lib/be-stack';
import { CicdStack } from '../lib/cicd-stack';
import { DbStack } from '../lib/db-stack';
import { FeCicdStack } from '../lib/fe-cicd-stack';
import { FeStack } from '../lib/fe-stack';
import { MigrateRunnerStack } from '../lib/migrate-runner-stack';
import { NetworkStack } from '../lib/network-stack';
import { SlackApprovalStack } from '../lib/slack-approval-stack';

const app = new App();

const seoul = {
  account: '588344796279',
  region: 'ap-northeast-2',
};

const network = new NetworkStack(app, 'IgalleryNetwork', { env: seoul });

const db = new DbStack(app, 'IgalleryDb', {
  env: seoul,
  vpc: network.vpc,
});

const be = new BeStack(app, 'IgalleryBe', {
  env: seoul,
  vpc: network.vpc,
  db: db.instance,
});

// igallery-db repo 의 self-hosted GitHub Actions runner.
// dp-back 컨테이너에서 마이그레이션 책임을 떼고 별도 워크플로우가 RDS 에 적용.
new MigrateRunnerStack(app, 'IgalleryMigrateRunner', {
  env: seoul,
  vpc: network.vpc,
  db: db.instance,
});

// Phase 4 — Slack 으로 CodeDeploy 의 READY 단계 클릭 + 24h 안 롤백 외부화.
// BE 의 prod listener / TG / CodeDeploy 정보를 cross-stack ref 로 받음.
new SlackApprovalStack(app, 'IgallerySlackApproval', {
  env: seoul,
  slackChannelId: 'C0B2GJHL95M',
  slackBotTokenSecretName: 'igallery/slack-bot-token',
  slackSigningSecretName: 'igallery/slack-signing-secret',
  beProdListener: be.prodListener,
  beBlueTg: be.blueTg,
  beGreenTg: be.greenTg,
  beCodeDeployApp: 'dp-back',
  beCodeDeployGroup: 'prod',
});

new FeStack(app, 'IgalleryFe', {
  env: seoul,
  alb: be.alb,
});

// Phase 2 — FE 의 CI/CD 인프라. IgalleryFe stack 의 alias drift 회피를 위해 분리.
// 기존 Lambda / CodeDeploy 리소스는 by-name 으로 참조 (cross-stack ref 안 만듦).
new FeCicdStack(app, 'IgalleryFeCicd', {
  env: seoul,
  serverFunctionName: 'IgalleryFe-ServerFn4F3A536E-0YLK8VIY9sJH',
  imageFunctionName: 'IgalleryFe-ImageFnCD541B83-tB0xvT6AtpR9',
  serverCodeDeployApp: 'igallery-server',
  imageCodeDeployApp: 'igallery-image',
  codeDeployGroup: 'prod',
});

new CicdStack(app, 'IgalleryCicd', {
  env: seoul,
  githubRepo: 'ParkCheolRyeon/nx-go-local-proxy-poc',
  // refs/heads/main   = ci.yml 의 main push (검증)
  // refs/tags/be/v*   = deploy.yml 의 BE 배포 (ECR push)
  // refs/tags/fe/v*   = deploy.yml 의 FE 배포 (S3 source upload)
  allowedRefs: ['refs/heads/main', 'refs/tags/be/v*', 'refs/tags/fe/v*'],
});

app.synth();

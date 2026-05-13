#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import { BeStack } from '../lib/be-stack';
import { CicdStack } from '../lib/cicd-stack';
import { DbStack } from '../lib/db-stack';
import { FeCicdStack } from '../lib/fe-cicd-stack';
import { FeStack } from '../lib/fe-stack';
import { NetworkStack } from '../lib/network-stack';

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
  // refs/heads/main = ci.yml 의 main push (검증). refs/tags/v* = deploy.yml 의 tag push (배포).
  allowedRefs: ['refs/heads/main', 'refs/tags/v*'],
});

app.synth();

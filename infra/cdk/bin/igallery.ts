#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import { BeStack } from '../lib/be-stack';
import { CicdStack } from '../lib/cicd-stack';
import { DbStack } from '../lib/db-stack';
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

new CicdStack(app, 'IgalleryCicd', {
  env: seoul,
  githubRepo: 'ParkCheolRyeon/nx-go-local-proxy-poc',
  allowedRefs: ['refs/heads/main'],
});

app.synth();

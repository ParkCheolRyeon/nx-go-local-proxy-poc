const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const { DOMAINS } = require('./config');
const { addHosts } = require('./manage-hosts');

if (process.getuid && process.getuid() !== 0) {
  console.error('x sudo 필요 : pnpm local-proxy start');
  process.exit(1);
}

const CERT_DIR = path.join(__dirname, 'certs');

const keyPath = path.join(CERT_DIR, 'key.pem');
const certPath = path.join(CERT_DIR, 'cert.pem');

if (!fs.existsSync(CERT_DIR) || !fs.existsSync(certPath)) {
  if (!shell.which('mkcert')) {
    console.error('x mkcert 설치 필요 : brew install mkcert');
    process.exit(1);
  }
  const domains = Object.values(DOMAINS).join(' ');
  shell.exec(`mkcert -key-file ${keyPath} -cert-file ${certPath} ${domains}`);
  console.log('v 자가서명 인증서 발급됨.');
}

addHosts();
require('./server');

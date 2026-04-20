const https = require('https');
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy');
const { DOMAINS, TARGETS } = require('./config');

const CERT_DIR = path.join(__dirname, 'certs');

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
  secure: false,
});

proxy.on('error', (err, req, res) => {
  console.error('[proxy error]', err.message);
  if (res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  }
});

const server = https.createServer(
  {
    key: fs.readFileSync(path.join(CERT_DIR, 'key.pem')),
    cert: fs.readFileSync(path.join(CERT_DIR, 'cert.pem')),
  },
  (req, res) => {
    const host = (req.headers.host || '').split(':')[0];

    if (host === DOMAINS.front) {
      proxy.web(req, res, { target: TARGETS.front });
    } else if (host === DOMAINS.api) {
      proxy.web(req, res, { target: TARGETS.api });
    } else {
      res.writeHead(404);
      res.end(`Unknown host: ${host}`);
    }
  },
);

server.on('upgrade', (req, socket, head) => {
  const host = (req.headers.host || '').split(':')[0];
  const target = host === DOMAINS.front ? TARGETS.front : TARGETS.api;
  proxy.ws(req, socket, head, { target });
});

server.listen(443, () => {
  console.log(`v Local Proxy listening on :443 (HTTPS)`);
  console.log(`https://${DOMAINS.front} -> ${TARGETS.front}`);
  console.log(`https://${DOMAINS.api} -> ${TARGETS.api}`);
});

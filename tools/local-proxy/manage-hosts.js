const fs = require('fs');
const shell = require('shelljs');

const {
  DOMAINS,
  TARGETS,
  HOSTS_MARKER_START,
  HOSTS_MARKER_END,
} = require('./config');

const HOSTS_PATH = '/etc/hosts';

function addHosts() {
  const current = fs.readFileSync(HOSTS_PATH, 'utf8');
  if (current.includes(HOSTS_MARKER_START)) {
    return;
  }

  const entries = Object.values(DOMAINS)
    .map((d) => `127.0.0.1 ${d}`)
    .join('\n');

  const block = `\n${HOSTS_MARKER_START}\n${entries}\n${HOSTS_MARKER_END}\n`;
  fs.appendFileSync(HOSTS_PATH, block);
  shell.exec('dscacheutil -flushcache && killall -HUP mDNSResponder', {
    silent: true,
  });
  console.log('v /etc/hosts 엔트리 추가됨.');
}

function removeHosts() {
  const current = fs.readFileSync(HOSTS_PATH, 'utf8');
  const regex = new RegExp(
    `\\n?${HOSTS_MARKER_START}[\\s\\S]*?${HOSTS_MARKER_END}\\n?`,
    'g',
  );
  const cleaned = current.replace(regex, '');
  fs.writeFileSync(HOSTS_PATH, cleaned);
  shell.exec('dscachetuil -flushcache && killall -HUP mDNSResponder', {
    silent: true,
  });
  console.log('v /etc/hosts 엔트리 제거됨.');
}

module.exports = { addHosts, removeHosts };

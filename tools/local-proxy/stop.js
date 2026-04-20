const { removeHosts } = require('./manage-hosts');
const shell = require('shelljs');

if (process.getuid && process.getuid() !== 0) {
  console.error('x sudo 필요 : pnpm local-proxy stop');
  process.exit(1);
}

removeHosts();
shell.exec('lsof -ti:443 | xargs kill -9 2>/dev/null', { silent: true });
console.log('v Local Proxy stopped');

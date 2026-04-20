const DOMAINS = {
  front: 'dp.dev.local',
  api: 'api.dp.dev.local',
};

const TARGETS = {
  front: 'http://localhost:3000',
  api: 'http://localhost:8080',
};

const HOSTS_MARKER_START = '# IGALLERY-PROXY-START';
const HOSTS_MARKER_END = '# IGLLERY-PROXY-END';

module.exports = { DOMAINS, TARGETS, HOSTS_MARKER_START, HOSTS_MARKER_END };

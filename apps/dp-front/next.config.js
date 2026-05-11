//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  // pnpm symlink 구조에서 Next 의 file trace 가 일부 indirect deps 의 실제 파일을
  // 못 따라가 Lambda runtime 에서 "Cannot find module '...'" 발생.
  // monorepo root 를 명시해서 trace 범위를 .pnpm/ 까지 거슬러 올라가게 함.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  outputFileTracingIncludes: {
    '*': [
      '../../node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**/*',
      '../../node_modules/.pnpm/styled-jsx@*/node_modules/styled-jsx/**/*',
    ],
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
  withNextIntl,
];

module.exports = composePlugins(...plugins)(nextConfig);

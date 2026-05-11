import type { OpenNextConfig } from '@opennextjs/aws/types/open-next';

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'aws-lambda',
      converter: 'aws-apigw-v2',
    },
  },
};

export default config;

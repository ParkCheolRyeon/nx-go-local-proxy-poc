import type { OpenNextConfig } from '@opennextjs/aws/types/open-next';

const config: OpenNextConfig = {
  default: {
    override: {
      // CloudFront → Lambda Function URL (RESPONSE_STREAM) 로 호출되는 구조.
      // streaming wrapper 만 명시 (converter 는 default = function URL 호환).
      wrapper: 'aws-lambda-streaming',
    },
  },
  imageOptimization: {
    // image Lambda 도 동일하게 CloudFront → Function URL. default 의 aws-lambda
    // wrapper + apigw-v2 converter 는 payload mismatch 로 400 발생.
    override: {
      wrapper: 'aws-lambda-streaming',
    },
  },
};

export default config;

import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface CicdStackProps extends StackProps {
  /** "owner/repo" (예: ParkCheolRyeon/nx-go-local-proxy-poc) */
  githubRepo: string;
  /** main / production 등 deploy 트리거를 허용할 ref pattern */
  allowedRefs?: string[];
}

/**
 * GitHub Actions OIDC + 배포용 IAM role.
 * deploy.yml 에서 `aws-actions/configure-aws-credentials@v4` 의 role-to-assume 으로 사용.
 */
export class CicdStack extends Stack {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: CicdStackProps) {
    super(scope, id, props);

    // GitHub Actions OIDC provider — 계정당 1회만 만들어두면 됨.
    const provider = new iam.OpenIdConnectProvider(this, 'GitHubOidc', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    const refs = props.allowedRefs ?? ['refs/heads/main'];
    const subPatterns = refs.map(
      (ref) => `repo:${props.githubRepo}:ref:${ref}`,
    );

    this.deployRole = new iam.Role(this, 'DeployRole', {
      roleName: 'gh-actions-deploy',
      assumedBy: new iam.FederatedPrincipal(
        provider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': subPatterns,
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
      description:
        'GitHub Actions deploy role - ECR push, ECS deploy, Lambda publish, S3 sync, CodeDeploy create-deployment',
    });

    // ── 권한 (dev: managed policy 로 시작, 운영 가면 좁힐 것)
    [
      'AmazonEC2ContainerRegistryPowerUser', // ECR push/pull
      'AmazonECS_FullAccess', // ECS update / RunTask
      'AWSCodeDeployFullAccess', // CodeDeploy create-deployment
      'CloudFrontFullAccess', // CreateInvalidation (필요 시)
    ].forEach((name) =>
      this.deployRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName(name),
      ),
    );

    // Lambda: update-function-code / publish-version / get-function
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'lambda:UpdateFunctionCode',
          'lambda:PublishVersion',
          'lambda:GetFunction',
          'lambda:GetFunctionConfiguration',
          'lambda:UpdateAlias',
          'lambda:GetAlias',
        ],
        resources: [`arn:aws:lambda:${this.region}:${this.account}:function:*`],
      }),
    );

    // S3: assets bucket sync (이름 정규식으로 prefix 매칭)
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
          's3:GetBucketLocation',
        ],
        resources: [
          'arn:aws:s3:::igalleryfe-*',
          'arn:aws:s3:::igalleryfe-*/*',
        ],
      }),
    );

    // PassRole — ECS task definition register 시 taskRole / executionRole 을 service 가 사용.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [`arn:aws:iam::${this.account}:role/*`],
        conditions: {
          StringEquals: { 'iam:PassedToService': 'ecs-tasks.amazonaws.com' },
        },
      }),
    );

    new CfnOutput(this, 'DeployRoleArn', { value: this.deployRole.roleArn });
  }
}

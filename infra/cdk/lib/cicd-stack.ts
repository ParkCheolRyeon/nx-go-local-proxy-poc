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

    // ── 권한
    //   Phase 1 후 변경:
    //   - 제거: AmazonECS_FullAccess  (BE 가 CodePipeline 으로 이전, GitHub Actions 가 ECS 직접 안 만짐)
    //   - 제거: iam:PassRole          (task def register 안 함)
    //   - 유지: ECR (BE 이미지 push), CodeDeploy (FE promote 가 호출 — Phase 2 끝나면 제거)
    //   - 유지: Lambda (FE deploy.yml 이 publish-version / promote 가 UpdateAlias)
    //   - 유지: S3 (FE 의 assets/cache sync)
    //   - 유지: CloudFront (Phase 2 의 invalidate 가능성, 안 쓰면 추후 제거)
    [
      'AmazonEC2ContainerRegistryPowerUser', // ECR push/pull (BE)
      'AWSCodeDeployFullAccess',             // FE promote.yml (Phase 2 후 제거 예정)
      'CloudFrontFullAccess',                // CreateInvalidation (필요 시)
    ].forEach((name) =>
      this.deployRole.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName(name),
      ),
    );

    // CloudFormation describe (deploy.yml 의 fe-build 가 IgalleryFe outputs 읽음)
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['cloudformation:DescribeStacks'],
        resources: [`arn:aws:cloudformation:${this.region}:${this.account}:stack/Igallery*/*`],
      }),
    );

    // Lambda: update-function-code / publish-version / get-function / list-versions
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'lambda:UpdateFunctionCode',
          'lambda:PublishVersion',
          'lambda:GetFunction',
          'lambda:GetFunctionConfiguration',
          'lambda:UpdateAlias',
          'lambda:GetAlias',
          'lambda:ListVersionsByFunction',
          'lambda:ListAliases',
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

    new CfnOutput(this, 'DeployRoleArn', { value: this.deployRole.roleArn });
  }
}

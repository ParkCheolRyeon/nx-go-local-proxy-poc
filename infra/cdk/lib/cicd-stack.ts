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
    //   Phase 2 cutover 후:
    //   GitHub Actions 의 책임 = build + 아티팩트 push 만.
    //   배포 (Lambda update / publish / alias / CodeDeploy) 는 CodePipeline 의 CodeBuild 가 처리.
    //   따라서 OIDC role 권한은 매우 좁아짐:
    //     - ECR push (BE 이미지)
    //     - S3 put (FE assets/cache → distribution bucket, FE zip → source bucket)
    //     - CloudFormation describe (FE assets bucket 이름 lookup)
    this.deployRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryPowerUser'),
    );

    // CloudFormation describe (deploy.yml 의 fe-build 가 AssetsBucketName output 읽음)
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['cloudformation:DescribeStacks'],
        resources: [`arn:aws:cloudformation:${this.region}:${this.account}:stack/Igallery*/*`],
      }),
    );

    // S3: FE distribution bucket (igalleryfe-*) + FE source bucket (igallery-fe-source)
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
          'arn:aws:s3:::igallery-fe-source',
          'arn:aws:s3:::igallery-fe-source/*',
        ],
      }),
    );

    new CfnOutput(this, 'DeployRoleArn', { value: this.deployRole.roleArn });
  }
}

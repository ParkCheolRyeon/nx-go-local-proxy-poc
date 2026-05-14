import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import { Construct } from 'constructs';

interface MigrateRunnerStackProps extends StackProps {
  vpc: ec2.IVpc;
  db: rds.DatabaseInstance;
}

/**
 * igallery-db repo 의 GitHub Actions self-hosted runner 를 호스팅하는 EC2.
 *
 * 목적: RDS 마이그레이션을 dp-back 컨테이너에서 떼어내고 별도 워크플로우로 분리.
 * GitHub-hosted runner 는 VPC 밖이라 private RDS 에 닿을 수 없어
 * VPC 안 t4g.nano 에 runner agent 를 띄워서 사용한다 (gallery-board-db 와 동일 패턴).
 *
 * Runner agent 등록은 SSM Session Manager 로 접속 후 수동.
 * `/home/ec2-user/RUNNER_SETUP.md` 에 명령어 메모.
 */
export class MigrateRunnerStack extends Stack {
  public readonly instance: ec2.Instance;

  constructor(scope: Construct, id: string, props: MigrateRunnerStackProps) {
    super(scope, id, props);

    const { vpc, db } = props;
    const dbSecret = db.secret;
    if (!dbSecret) {
      throw new Error('DbStack 의 RDS 인스턴스에 secret 이 없습니다');
    }

    // ── Security Group: outbound only, RDS SG 에 5432 inbound 추가
    const runnerSg = new ec2.SecurityGroup(this, 'RunnerSg', {
      vpc,
      description: 'igallery-db migrate runner SG',
      allowAllOutbound: true,
    });

    const dbSg = db.connections.securityGroups[0];
    if (!dbSg) {
      throw new Error('RDS 인스턴스에 security group 이 없습니다');
    }
    new ec2.CfnSecurityGroupIngress(this, 'DbIngressFromRunner', {
      groupId: dbSg.securityGroupId,
      sourceSecurityGroupId: runnerSg.securityGroupId,
      ipProtocol: 'tcp',
      fromPort: 5432,
      toPort: 5432,
      description: 'Migrate runner to RDS',
    });

    // ── IAM Role (EC2 instance profile)
    const runnerRole = new iam.Role(this, 'RunnerRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'igallery-db migrate runner instance role',
      managedPolicies: [
        // SSM Session Manager 접속 + 기본 SSM 관리
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // RDS secret 읽기 (DATABASE_URL 구성용)
    dbSecret.grantRead(runnerRole);

    // RDS pre-deploy snapshot 권한
    runnerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'rds:CreateDBSnapshot',
          'rds:DescribeDBSnapshots',
          'rds:DescribeDBInstances',
          'rds:DeleteDBSnapshot',
          'rds:AddTagsToResource',
        ],
        resources: [
          db.instanceArn,
          `arn:aws:rds:${this.region}:${this.account}:snapshot:*`,
        ],
      }),
    );

    // CloudWatch Logs (workflow 디버깅용)
    runnerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/igallery-db-migrate*`],
      }),
    );

    // ── user-data: 의존성만 깔아둠. runner agent 등록은 SSM 으로 수동
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'set -eux',
      'dnf update -y',
      // git: actions/checkout 용
      // jq: workflow 안 JSON 파싱
      // libicu: .NET 기반 runner agent 의존성
      // postgresql17: psql 클라이언트 (디버깅/검증용)
      'dnf install -y git jq tar gzip libicu postgresql17',
      // golang-migrate (linux/arm64)
      'MIGRATE_VERSION=v4.18.1',
      'curl -sSL "https://github.com/golang-migrate/migrate/releases/download/${MIGRATE_VERSION}/migrate.linux-arm64.tar.gz" | tar xz -C /usr/local/bin migrate',
      'chmod +x /usr/local/bin/migrate',
      // runner agent 작업 디렉토리
      'install -d -o ec2-user -g ec2-user /home/ec2-user/actions-runner',
      // 안내 메모 파일
      "cat > /home/ec2-user/RUNNER_SETUP.md <<'EOF'",
      '# GitHub Actions self-hosted runner 등록',
      '',
      '## 1. GitHub UI 에서 token 발급',
      '',
      '`https://github.com/ParkCheolRyeon/igallery-db/settings/actions/runners/new`',
      '→ Linux / ARM64 선택 → token 복사',
      '',
      '## 2. SSM 으로 이 EC2 에 접속',
      '',
      '```bash',
      'aws ssm start-session --target <INSTANCE_ID> --region ap-northeast-2',
      '```',
      '',
      '## 3. runner agent 설치 (ec2-user)',
      '',
      '```bash',
      'sudo -iu ec2-user',
      'cd /home/ec2-user/actions-runner',
      'curl -O -L https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-arm64-2.319.1.tar.gz',
      'tar xzf actions-runner-linux-arm64-2.319.1.tar.gz',
      './config.sh \\\\',
      '  --url https://github.com/ParkCheolRyeon/igallery-db \\\\',
      '  --token <TOKEN> \\\\',
      '  --labels self-hosted,igallery-db-migrate \\\\',
      '  --unattended \\\\',
      '  --replace',
      'exit  # ec2-user 빠져나옴 (svc.sh 는 root 권한 필요)',
      'sudo /home/ec2-user/actions-runner/svc.sh install ec2-user',
      'sudo /home/ec2-user/actions-runner/svc.sh start',
      '```',
      '',
      '설치 확인: GitHub → Settings → Actions → Runners 에 `Idle` 상태로 노출',
      'EOF',
      'chown ec2-user:ec2-user /home/ec2-user/RUNNER_SETUP.md',
    );

    // ── EC2 인스턴스 (t4g.nano, public subnet — NAT 0 환경에서 인터넷 접근 위해)
    this.instance = new ec2.Instance(this, 'Runner', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE4_GRAVITON,
        ec2.InstanceSize.NANO,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup: runnerSg,
      role: runnerRole,
      userData,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(8, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
          }),
        },
      ],
    });
    Tags.of(this.instance).add('Name', 'igallery-db-migrate-runner');

    // ── 야간 정지/기동 (KST 18:00 ↔ 07:40 — RDS / ECS 와 동일)
    const ec2SchedulerRole = new iam.Role(this, 'Ec2SchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      description: 'Allow EventBridge Scheduler to start/stop the migrate runner EC2',
    });
    ec2SchedulerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ec2:StopInstances', 'ec2:StartInstances'],
        resources: [
          `arn:aws:ec2:${this.region}:${this.account}:instance/${this.instance.instanceId}`,
        ],
      }),
    );

    const ec2ScheduleInput = Stack.of(this).toJsonString({
      InstanceIds: [this.instance.instanceId],
    });

    new scheduler.CfnSchedule(this, 'Ec2StopSchedule', {
      description: '매일 18:00 KST migrate runner 정지',
      scheduleExpression: 'cron(0 18 * * ? *)',
      scheduleExpressionTimezone: 'Asia/Seoul',
      flexibleTimeWindow: { mode: 'OFF' },
      state: 'ENABLED',
      target: {
        arn: 'arn:aws:scheduler:::aws-sdk:ec2:stopInstances',
        roleArn: ec2SchedulerRole.roleArn,
        input: ec2ScheduleInput,
        retryPolicy: { maximumRetryAttempts: 3, maximumEventAgeInSeconds: 300 },
      },
    });

    new scheduler.CfnSchedule(this, 'Ec2StartSchedule', {
      description: '매일 07:40 KST migrate runner 기동',
      scheduleExpression: 'cron(40 7 * * ? *)',
      scheduleExpressionTimezone: 'Asia/Seoul',
      flexibleTimeWindow: { mode: 'OFF' },
      state: 'ENABLED',
      target: {
        arn: 'arn:aws:scheduler:::aws-sdk:ec2:startInstances',
        roleArn: ec2SchedulerRole.roleArn,
        input: ec2ScheduleInput,
        retryPolicy: { maximumRetryAttempts: 3, maximumEventAgeInSeconds: 300 },
      },
    });
  }
}

import { Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import { Construct } from 'constructs';

interface DbStackProps extends StackProps {
  vpc: ec2.IVpc;
}

export class DbStack extends Stack {
  public readonly instance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: DbStackProps) {
    super(scope, id, props);

    this.instance = new rds.DatabaseInstance(this, 'Postgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_8,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      publiclyAccessible: false,
      databaseName: 'app_dp',
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      backupRetention: Duration.days(0),
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ── 야간 정지/기동 (KST 18:00 ~ 07:40)
    // EventBridge Scheduler 가 Universal Target 으로 RDS API 직접 호출 — Lambda 불필요.
    // multiAz=false, read replica 없음 → stop 가능 조건 충족.
    // RDS 는 stopped 상태 7 일 후 자동 재시작되지만, 우리는 매일 기동하므로 무관.
    const schedulerRole = new iam.Role(this, 'RdsSchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      description: 'Allow EventBridge Scheduler to start/stop the RDS instance',
    });
    schedulerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['rds:StopDBInstance', 'rds:StartDBInstance', 'rds:DescribeDBInstances'],
        resources: [this.instance.instanceArn],
      }),
    );

    const targetInput = JSON.stringify({
      DbInstanceIdentifier: this.instance.instanceIdentifier,
    });

    new scheduler.CfnSchedule(this, 'RdsStopSchedule', {
      description: '매일 18:00 KST RDS 정지',
      scheduleExpression: 'cron(0 18 * * ? *)',
      scheduleExpressionTimezone: 'Asia/Seoul',
      flexibleTimeWindow: { mode: 'OFF' },
      state: 'ENABLED',
      target: {
        arn: 'arn:aws:scheduler:::aws-sdk:rds:stopDBInstance',
        roleArn: schedulerRole.roleArn,
        input: targetInput,
        retryPolicy: { maximumRetryAttempts: 3, maximumEventAgeInSeconds: 300 },
      },
    });

    new scheduler.CfnSchedule(this, 'RdsStartSchedule', {
      description: '매일 07:40 KST RDS 기동',
      scheduleExpression: 'cron(40 7 * * ? *)',
      scheduleExpressionTimezone: 'Asia/Seoul',
      flexibleTimeWindow: { mode: 'OFF' },
      state: 'ENABLED',
      target: {
        arn: 'arn:aws:scheduler:::aws-sdk:rds:startDBInstance',
        roleArn: schedulerRole.roleArn,
        input: targetInput,
        retryPolicy: { maximumRetryAttempts: 3, maximumEventAgeInSeconds: 300 },
      },
    });
  }
}

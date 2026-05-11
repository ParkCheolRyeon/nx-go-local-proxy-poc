import { Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
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
  }
}

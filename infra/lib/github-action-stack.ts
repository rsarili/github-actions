import { Stack, StackProps, aws_iam as iam, Duration} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface GithubActionStackProps extends StackProps {
  readonly repositoryConfig: { owner: string; repo: string; filter?: string }[];
  readonly deployRole: string;
}

// https://towardsthecloud.com/aws-cdk-openid-connect-github
// https://github.com/dannysteenman/aws-cdk-examples/tree/main/openid-connect-github
export class GithubActionStack extends Stack {
  constructor(scope: Construct, id: string, props: GithubActionStackProps) {
    super(scope, id, props);

    const githubDomain = 'token.actions.githubusercontent.com';

    const ghProvider = new iam.OpenIdConnectProvider(this, 'githubProvider', {
      url: `https://${githubDomain}`,
      clientIds: ['sts.amazonaws.com'],
    });

    const iamRepoDeployAccess = props.repositoryConfig.map(r =>
      `repo:${r.owner}/${r.repo}:${r.filter ?? '*'}`);

    // grant only requests coming from a specific GitHub repository.
    const conditions: iam.Conditions = {
      StringLike: {
        [`${githubDomain}:sub`]: iamRepoDeployAccess,
      },
    };

    new iam.Role(this, 'cloudNationGitHubDeployRole', {
      assumedBy: new iam.WebIdentityPrincipal(ghProvider.openIdConnectProviderArn, conditions),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
      ],
      roleName: props.deployRole,
      description: 'This role is used via GitHub Actions to deploy with AWS CDK or Terraform on the target AWS account',
      maxSessionDuration: Duration.hours(1),
    });
  }
}

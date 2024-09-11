---
title: AWS
---

# Configuring Cloud Scanner for AWS

## CloudFormation

### Organization Deployment

Log in to the AWS management console account and open the following url link to deploy Cloud Scanner using CloudFormation in `us-east-1` region.

[Deploy across multiple AWS accounts in AWS organization](https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?templateURL=https://deepfence-public.s3.amazonaws.com/cloud-scanner/self-hosted/organization-deployment/deepfence-cloud-scanner-org-common.template&stackName=Deepfence-Cloud-Scanner&param_CloudScannerImage=quay.io/deepfenceio/cloud_scanner_ce:THREATMAPPER_VERSION)

(Template URL: https://deepfence-public.s3.amazonaws.com/cloud-scanner/self-hosted/organization-deployment/deepfence-cloud-scanner-org-common.template)

Then, fill in the below parameters as needed:

| ![Cloud Scanner](../img/cloud-scanner-aws-1.png) |
|:------------------------------------------------:|
|           Cloud Scanner Configuration            |

:::info
Cloud Scanner Image: quay.io/deepfenceio/cloud_scanner_ce:THREATMAPPER_VERSION
:::

| ![Cloud Scanner](../img/cloud-scanner-aws-2.png) |
|:------------------------------------------------:|
|                     Set Name                     |

### Single Account Deployment

Log in to the AWS management console account and open the following url link to deploy Cloud Scanner using CloudFormation in `us-east-1` region.

[Deploy on a single AWS account](https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?templateURL=https://deepfence-public.s3.amazonaws.com/cloud-scanner/self-hosted/single-account-deployment/deepfence-cloud-scanner.template&stackName=Deepfence-Cloud-Scanner&param_CloudScannerImage=quay.io/deepfenceio/cloud_scanner_ce:THREATMAPPER_VERSION)

(Template URL: https://deepfence-public.s3.amazonaws.com/cloud-scanner/self-hosted/single-account-deployment/deepfence-cloud-scanner.template)

Then, fill in the below parameters as needed:

| ![Cloud Scanner](../img/cloud-scanner-aws-1.png) |
|:------------------------------------------------:|
|           Cloud Scanner Configuration            |

| ![Cloud Scanner](../img/cloud-scanner-aws-2.png) |
|:------------------------------------------------:|
|                     Set Name                     |

#### For Deployment in Existing VPC(Optional)

If you want to deploy Cloud Scanner in an existing VPC (say, for environment where the Deepfence Management Console can only be accessed via a private IP within the VPC), you need to fill in the following params:

| ![Cloud Scanner](../img/cloud-scanner-aws-3.png) |
|:------------------------------------------------:|
|                    Choose VPC                    |

#### Configure CIDR blocks(Optional)

You may want to configure CIDR blocks to avoid collision with existing CIDR blocks:

| ![Cloud Scanner](../img/cloud-scanner-aws-4.png) |
|:------------------------------------------------:|
|                   Choose CIDRs                   |

## Terraform

Cloud Scanner is deployed as a task within your AWS infrastructure.

You need to configure Terraform with the appropriate resources and inputs for your particular scenario, and you will need to provide the IP address or DNS name for the ThreatMapper management console and an API key.

### Single Account Deployment

Copy and paste the following into a new file cloud-scanner.tf. Edit the fields: region, mgmt-console-url and deepfence-key.
```shell
provider "aws" {
  # AWS region: Example: us-east-1
  region = "us-east-1"
}

module "deepfence-cloud-scanner_example_single-account" {
  source                        = "deepfence/cloud-scanner/aws//examples/single-account-ecs"
  version                       = "0.6.0"
  name                          = "deepfence-cloud-scanner"
  # mgmt-console-url: deepfence.customer.com or 22.33.44.55
  mgmt-console-url              = "<Console URL>"
  mgmt-console-port             = "443"
  deepfence-key                 = "<Deepfence key>"
  # AWS Account Name (Optional, for easy identification)
  account_name                  = ""
  image                         = "quay.io/deepfenceio/cloud_scanner_ce:THREATMAPPER_VERSION"
  # Task CPU Units (Default: 4 vCPU)
  cpu                           = "4096"
  # Task Memory (Default: 8 GB)
  memory                        = "8192"
  # Task Ephemeral Storage (Default: 100 GB)
  ephemeral_storage             = "100"
  # Task role: Must be either arn:aws:iam::aws:policy/SecurityAudit or arn:aws:iam::aws:policy/ReadOnlyAccess
  task_role                     = "arn:aws:iam::aws:policy/SecurityAudit"
  debug_logs                    = false
  # Use existing VPC (Optional)
  use_existing_vpc              = false
  # VPC ID (If use_existing_vpc is set to true)
  existing_vpc_id               = ""
  # List of VPC Subnet IDs (If use_existing_vpc is set to true)
  existing_vpc_subnet_ids       = []
  tags = {
    product = "deepfence-cloud-scanner"
  }
  # AWS region: Example: us-east-1
  region                        = "us-east-1"
  ecs_vpc_region_azs            = ["us-east-1a"]
  # Optional: To refresh the cloud resources every hour, provide CloudTrail Trail ARNs (Management events with write-only or read-write).
  # If empty, a trail with management events will be automatically chosen if available.
  # e.g.: ["arn:aws:cloudtrail:us-east-1:123456789012:trail/aws-events"]
  cloudtrail_trails             = []
}
```
Ensure that the `name` parameter is set to some unique string to avoid collision with existing resource names in the account of deployment

Then run
```shell
terraform init
terraform plan
terraform apply
```

For full details, refer to the GitHub repository: https://github.com/deepfence/terraform-aws-cloud-scanner/tree/main/examples/single-account-ecs

### Organization Account Deployment

For full details, refer to the GitHub repository: https://github.com/deepfence/terraform-aws-cloud-scanner/tree/main/examples/organizational-deploy-with-member-account-read-only-access-creation

## What Compliance Scans are Performed?

ThreatMapper builds on a large library of **controls** - these are specific requirements and matching tests.  For example, you will find controls that correspond to best-practice configurations of access to assets, such as enabling TLS access and blocking plain-text HTTP.

Controls are grouped into **benchmarks**. Where multiple benchmarks are available, controls may be used by several benchmarks.

When you run a compliance scan, you can select which benchmarks you wish to measure against, and ThreatMapper will then evaluate the appropriate controls and present the results, by benchmark, once the scan has completed.

For full information, refer to [Operations: Compliance Scanning](/docs/operations/compliance).

:::tip Maximizing Coverage
For maximum coverage, you can use both Cloud Scanner and local Sensor Agent compliance scans together. You could scan your AWS infrastructure using Cloud Scanner, and [scan selected VMs deployed within AWS](other) using the Sensor Agent.
:::

## Cloud Scanner on EKS Cluster using IRSA

:::info

**Pre-requisite:**
1. Associate OIDC provider with the EKS cluster where cloud scanner is going to be deployed.

    ([refer here for aws documentation on enable-iam-roles-for-service-accounts](https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html))

2. kubectl and helm command line tools are installed and configured to access the cluster where cloud scanner is going to be deployed

:::

### Single Account Cloud Scanner on EKS cluster using IRSA

1. Create the EKS IRSA role using the terrafrom script [single-account-eks-iam-role](https://github.com/deepfence/cloud-scanner/tree/main/cloudformation/self-hosted/eks-iam-roles/single-account-eks-iam-role)
2. If cloudformation is preferred create the EKS IRSA role using the cloudformation template [deepfence-cloud-scanner-single-account-iam-role](https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?templateURL=https://deepfence-public.s3.amazonaws.com/cloud-scanner/self-hosted/eks-iam-roles/single-account-eks-iam-role/deepfence-cloud-scanner-single-account-iam-role.template)
3. Note **namespace**, **service account name** and **iam role arn** from the output of terrafrom or cloudformation deployment
4. Add deepfence cloud scanner helm repo
    ```
    helm repo add cloud-scanner https://deepfence-helm-charts.s3.amazonaws.com/cloud-scanner
    ```
5. Download the helm chart values for depfence-cloud-scanner chart to file **cloud-scanner.yaml**
    ```
    helm show values cloud-scanner/deepfence-cloud-scanner > cloud-scanner.yaml
    ```
4. Update the deepfence-cloud-scanner helm chart values with deepfence key and console url, add service account annotation and service account name in **cloud-scanner.yaml** as shown in the example below
    ```yaml
    serviceAccount:
      # Specifies whether a service account should be created
      create: true
      # Automatically mount a ServiceAccount's API credentials?
      automount: true
      # Annotations to add to the service account
      annotations:
        "eks.amazonaws.com/role-arn": "arn:aws:iam::123456789:role/test-cloud-scanner"
      # The name of the service account to use.
      # If not set and create is true, a name is generated using the fullname template
      name: "deepfence-cloud-scanner"
    ```
6. Install the helm chart in the same *namespace* from Step 3.
    ```
    helm install cloud-scanner cloud-scanner/deepfence-cloud-scanner -f cloud-scanner.yaml -n deepfence
    ```

### Organization Account Cloud Scanner on EKS cluster using IRSA

1. Create the EKS IRSA role using the cloudformation template [deepfence-cloud-scanner-organization-stackset-iam-role](https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?templateURL=https://deepfence-public.s3.amazonaws.com/cloud-scanner/self-hosted/eks-iam-roles/organization-eks-iam-role/deepfence-cloud-scanner-organization-stackset-iam-role.template)
2. Note **namespace**, **service account name** and **iam role arn** from the output of cloudformation deployment
3. Add deepfence cloud scanner helm repo
    ```
    helm repo add cloud-scanner https://deepfence-helm-charts.s3.amazonaws.com/cloud-scanner
    ```
4. Download the helm chart values for depfence-cloud-scanner chart to file **cloud-scanner.yaml**
    ```
    helm show values cloud-scanner/deepfence-cloud-scanner > cloud-scanner.yaml
    ```
5. Update the deepfence-cloud-scanner helm chart values with deepfence key and console url, add service account annotation and service account name in **cloud-scanner.yaml** as shown in the example below
    ```yaml
    serviceAccount:
      # Specifies whether a service account should be created
      create: true
      # Automatically mount a ServiceAccount's API credentials?
      automount: true
      # Annotations to add to the service account
      annotations:
        "eks.amazonaws.com/role-arn": "arn:aws:iam::123456789:role/test-cloud-scanner"
      # The name of the service account to use.
      # If not set and create is true, a name is generated using the fullname template
      name: "deepfence-cloud-scanner"
    ```
6. Install the helm chart in the same *namespace* from Step 2.
    ```
    helm install cloud-scanner cloud-scanner/deepfence-cloud-scanner -f cloud-scanner.yaml -n deepfence
    ```
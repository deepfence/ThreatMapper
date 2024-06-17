---
title: Google Compute Platform
---

# Configuring Cloud Scanner for Google Cloud Platform

Cloud Scanner is deployed as a task within your Google Cloud Platform instance.

You need to configure Terraform with the appropriate resources and inputs for your particular scenario, and you will need to provide the IP address or DNS name for the ThreatMapper management console and an API key.

Copy and paste the following (single project or multiple projects) into a new file cloud-scanner.tf. Edit the fields: region, mgmt-console-url and deepfence-key.

## Single Project

```terraform
module "cloud-scanner_example_single-project" {
  source              = "deepfence/cloud-scanner/gcp//examples/single-project"
  version             = "0.5.0"
  name                = "deepfence-cloud-scanner"
  # mgmt-console-url: deepfence.customer.com or 22.33.44.55
  mgmt-console-url    = "<Console URL>"
  mgmt-console-port   = "443"
  deepfence-key       = "<Deepfence-key>"
  image_name          = "us-east1-docker.pkg.dev/deepfenceio/deepfence/cloud-scanner:THREATMAPPER_VERSION"
  # project_id example: dev1-123456
  project_id          = "<PROJECT_ID>"
  # region example: asia-east1
  region              = "<REGION_ID>"
  # Optional for private ip console
  # Name of vpc network in which the management console was deployed
  vpc                 = ""
  # Optional for private ip console
  # IP CIDR range for the connector to above vpc
  # Example: 11.0.0.0/28
  ip_cidr_range_svpca = ""
  cpu                 = "2"
  memory              = "4096Mi"
  labels              = {
    name = "deepfence-cloud-scanner"
  }
}
```

## Multiple Projects (Organization Deployment)

```terraform
module "cloud-scanner_example_multiple-projects" {
  source              = "deepfence/cloud-scanner/gcp//examples/multi-project"
  version             = "0.5.0"
  name                = "deepfence-cloud-scanner"
  # org_domain: root project name
  org_domain          = ""
  # mgmt-console-url: deepfence.customer.com or 22.33.44.55
  mgmt-console-url    = "<Console URL>"
  mgmt-console-port   = "443"
  deepfence-key       = "<Deepfence-key>"
  image_name          = "us-east1-docker.pkg.dev/deepfenceio/deepfence/cloud-scanner:THREATMAPPER_VERSION"
  # project_id example: dev1-123456
  project_id          = "<PROJECT_ID>"
  # region example: asia-east1
  region              = "<REGION_ID>"
  # Optional for private ip console
  # Name of vpc network in which the management console was deployed
  vpc                 = ""
  # Optional for private ip console
  # IP CIDR range for the connector to above vpc
  # Example: 11.0.0.0/28
  ip_cidr_range_svpca = ""
  cpu                 = "4"
  memory              = "8192Mi"
  labels              = {
    name = "deepfence-cloud-scanner"
  }
}
```

Ensure that the `name` parameter is set to some unique string to avoid collision with existing resource names in the project of deployment

Then run
```shell
terraform init
terraform plan
terraform apply
```

To connect to a private ip console on a vpc, this deployment will create a serverless vpc connector. Specify the vpc name of console and ip_cidr_range with a mask of /28 for the connector, default is 11.0.0.0/28.
For full details, refer to the `examples` provided in the GitHub repository: https://github.com/deepfence/terraform-gcp-cloud-scanner

Ensure that the `name` parameter is set to some unique string to avoid collision with existing resource names in the project of deployment

## What Compliance Scans are Performed?

ThreatMapper builds on a large library of **controls** - these are specific requirements and matching tests.  For example, you will find controls that correspond to best-practice configurations of access to assets, such as enabling TLS access and blocking plain-text HTTP.

Controls are grouped into **benchmarks**. Where multiple benchmarks are available, controls may be used by several benchmarks.

When you run a compliance scan, you can select which benchmarks you wish to measure against, and ThreatMapper will then evaluate the appropriate controls and present the results, by benchmark, once the scan has completed.

For full information, refer to [Operations: Compliance Scanning](/docs/operations/compliance).

:::tip Maximizing Coverage
For maximum coverage, you can use both Cloud Scanner and local Sensor Agent compliance scans together. You could scan your GCP infrastructure using Cloud Scanner, and [scan selected VMs deployed within GCP](other) using the Sensor Agent.
:::
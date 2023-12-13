---
title: Google Compute Platform
---

# Configuring Cloud Scanner for Google Cloud Platform

Cloud Scanner is deployed as a task within your Google Cloud Platform instance.

You need to configure Terraform with the appropriate resources and inputs for your particular scenario, and you will need to provide the IP address or DNS name for the ThreatMapper management console and an API key.

Copy and paste the following into a new file cloud-scanner.tf. Edit the fields: region, mgmt-console-url and deepfence-key.

```terraform
module "cloud-scanner_example_single-project" {
  source              = "deepfence/cloud-scanner/gcp//examples/single-project"
  version             = "0.3.0"
  name                = "deepfence-cloud-scanner"
  mgmt-console-url    = "<Console URL> eg. XXX.XXX.XX.XXX"
  mgmt-console-port   = "443"
  deepfence-key       = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  image_name          = "us-east1-docker.pkg.dev/deepfenceio/deepfence/cloud-scanner:2.0.1"
  project_id          = "<PROJECT_ID>; ex. dev1-123456"
  region              = "<REGION_ID>; ex. asia-east1"
  #optional for private ip console
  vpc                 = "<VPC Network Name>; Name of vpc network in which the console exists"
  #optional for private ip console
  ip_cidr_range_svpca = "<11.0.0.0/28> IP CIDR range for the connector to above vpc"
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

For a multi project cloud scanner, the org domain needs to be specified.
Copy and paste the following into a new file cloud-scanner.tf. Edit the fields: org_domain, region, mgmt-console-url and deepfence-key.

```terraform
module "cloud-scanner_example_single-project" {
  source              = "deepfence/cloud-scanner/gcp//examples/multi-project"
  org_domain          = "<Your Org Domain> e.g. deepfence.io"
  version             = "0.3.0"
  name                = "deepfence-cloud-scanner"
  mgmt-console-url    = "<Console URL> eg. XXX.XXX.XX.XXX"
  mgmt-console-port   = "443"
  deepfence-key       = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  image_name          = "us-east1-docker.pkg.dev/deepfenceio/deepfence/cloud-scanner:2.0.1"
  project_id          = "<PROJECT_ID>; ex. dev1-123456"
  region              = "<REGION_ID>; ex. asia-east1"
  #optional for private ip console
  vpc                 = "<VPC Network Name>; Name of vpc network in which the console exists"
  #optional for private ip console
  ip_cidr_range_svpca = "<11.0.0.0/28> IP CIDR range for the connector to above vpc"
}
```
Ensure that the `name` parameter is set to some unique string to avoid collision with existing resource names in the project of deployment

## What Compliance Scans are Performed?

ThreatMapper builds on a large library of **controls** - these are specific requirements and matching tests.  For example, you will find controls that correspond to best-practice configurations of access to assets, such as enabling TLS access and blocking plain-text HTTP.

Controls are grouped into **benchmarks**. Where multiple benchmarks are available, controls may be used by several benchmarks.

When you run a compliance scan, you can select which benchmarks you wish to measure against, and ThreatMapper will then evaluate the appropriate controls and present the results, by benchmark, once the scan has completed.

For full information, refer to [Operations: Compliance Scanning](/docs/v2.0/operations/compliance).

:::tip Maximizing Coverage
For maximum coverage, you can use both Cloud Scanner and local Sensor Agent compliance scans together. You could scan your GCP infrastructure using Cloud Scanner, and [scan selected VMs deployed within GCP](other) using the Sensor Agent.
:::
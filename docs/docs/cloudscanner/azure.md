---
title: Microsoft Azure
---

# Configuring Cloud Scanner for Microsoft Azure

Cloud Scanner is deployed as a task within your Azure infrastructure.

You need to configure Terraform with the appropriate resources and inputs for your particular scenario, and you will need to provide the IP address or DNS name for the ThreatMapper management console and an API key.

Copy and paste the following into a new file cloud-scanner.tf. Edit the fields: region, mgmt-console-url and deepfence-key.
```shell
provider "azurerm" {
  features {}
  subscription_id = "<SUBSCRIPTION_ID eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX>"
}

module "cloud-scanner_example_single-subscription" {
  source              = "deepfence/cloud-scanner/azure//examples/single-subscription"
  version             = "0.3.0"
  mgmt-console-url    = "<Console URL> eg. XXX.XXX.XX.XXX"
  mgmt-console-port   = "443"
  deepfence-key       = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  name                = "deepfence-cloud-scanner"
  image               = "quay.io/deepfenceio/cloud_scanner_ce:THREATMAPPER_VERSION"
}

```
Ensure that the `name` parameter is set to some unique string to avoid collision with existing resource names in the subscription

Then run
```shell
terraform init
terraform plan
terraform apply
```

For full details, refer to the `examples` provided in the GitHub repository: https://github.com/deepfence/terraform-azure-cloud-scanner

## What Compliance Scans are Performed?

ThreatMapper builds on a large library of **controls** - these are specific requirements and matching tests.  For example, you will find controls that correspond to best-practice configurations of access to assets, such as enabling TLS access and blocking plain-text HTTP.

Controls are grouped into **benchmarks**. Where multiple benchmarks are available, controls may be used by several benchmarks.

When you run a compliance scan, you can select which benchmarks you wish to measure against, and ThreatMapper will then evaluate the appropriate controls and present the results, by benchmark, once the scan has completed.

For full information, refer to [Operations: Compliance Scanning](/docs/operations/compliance).

:::tip Maximizing Coverage
For maximum coverage, you can use both Cloud Scanner and local Sensor Agent compliance scans together. You could scan your Azure infrastructure using Cloud Scanner, and [scan selected VMs deployed within Azure](other) using the Sensor Agent.
:::
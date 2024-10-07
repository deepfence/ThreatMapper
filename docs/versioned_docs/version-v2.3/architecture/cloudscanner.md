---
title: Cloud Scanner task
---

# Cloud Scanner Overview

ThreatMapper performs Compliance Posture Scanning to:

* Build an inventory of cloud assets, such as network security groups, storage objects, key management services. The types of assets discovered are specific to each cloud platform.
* Perform 'posture scanning', where ThreatMapper matches infrastructure configuration against a set of best-practice benchmarks, such as CIS, PCI-DSS and HIPAA. The benchmarks that are supported are specific to each cloud platform.

ThreatMapper then summarises the results in a 'Threat Graph' visualization, to help you to prioritize compliance issues that pose the greatest risk of exploit.

## Implementation

 * Compliance Posture Scanning for **Clouds** requires access (typically read-only) to the cloud platform APIs, and uses the Cloud Scanner task
 * Compliance Posture Scanning for **Hosts** requires direct access to the host, and uses the Sensor Agent.

### Compliance Posture Scanning for Clouds

The ThreatMapper Console does not access the cloud platform APIs directly; there is no need to open the APIs up for remote access.  Instead, you deploy a 'Cloud Scanner' task which acts as a local relay, taking instructions from the remote ThreatMapper console and performing local API calls from within your cloud infrastructure.

Each Cloud Scanner task runs in your cloud environment, gathering inventory and compliance information for the assets deployed in that environment. It submits that information to your ThreatMapper console. You can deploy as many Cloud Scanner tasks as are required by your security policy and any restrictions in place that affect API access.

Cloud Scanner tasks are deployed using the appropriate Terraform module for each cloud, and are configured with the address and API key of your management console.  They 'phone home' to your management console and take instructions on demand; they do not listen for remote connections or control.

:::info
Refer to the Installation Documentation to [Learn how to install Cloud Scanner tasks](/docs/cloudscanner)
:::


### Compliance Posture Scanning for Hosts

ThreatMapper can perform compliance posture scanning on linux hosts and Kubernetes master and worker nodes.

Scanning is done directly, using a local [Sensor Agent](sensors) rather than by using the Cloud Scanner task employed by the cloud platform integrations.





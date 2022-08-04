---
title: Supporting Services
---

# Supporting Services

## Cloud Scanner tasks

The ThreatMapper Console does not access remote cloud platform APIs directly; there is no need to open the APIs up for remote access. Instead, it uses an intermediary 'Cloud Scanner' task which acts as a local relay, taking instructions from the ThreatMapper console and performing local API calls within your cloud infrastructure.

Each Cloud Scanner task runs in your cloud environment, gathering inventory and compliance information for the assets deployed in that environment. It submits that information to your ThreatMapper console. You can deploy as many Cloud Scanner tasks as are required by your security policy and any restrictions in place that affect API access.

Cloud Scanner tasks are deployed using the appropriate Terraform module for each cloud, and are configured with the address and API key of your management console. They 'phone home' to your management console and take instructions on demand; they do not listen for remote connections or control.

## Sensor Agents

ThreatMapper Sensors are deployed on your production platforms, directly on each production host.  They communicate securely with your ThreatMapper Management Console, taking instructions to retrieve SBOMs and run scans, and forwarding telemetry data.

The sensors support the following production platforms:

* **Kubernetes:** The sensors are deployed as a daemonset, similar to other kubernetes services.
* **Docker:** The sensor is deployed as a docker container on each docker host.
* **Bare metal and VM-based platforms:** Sensors are deployed as a Docker container on each Linux operating system instance, using a Docker runtime. Linux instances are supported; Windows Server is not supported, although an experimental implementation is available.
* **AWS Fargate** The sensor is deployed as a daemon service alongside each serverless instance.


---
title: Sensor Agent
---

# Sensor Agent

ThreatMapper Sensors are deployed on your production platforms, directly on each production host.  They are deployed in the form of a privileged container (the 'Sensor Agent'). They communicate securely with your ThreatMapper Management Console, taking instructions to retrieve SBOMs and run scans, and forwarding telemetry data.

The sensors support the following production platforms:

* **Kubernetes:** The sensors are deployed as a daemonset, similar to other kubernetes services.
* **Docker:** The sensor is deployed as a docker container on each docker host.
* **Bare metal and VM-based platforms:** Sensors are deployed as a Docker container on each Linux operating system instance, using a Docker runtime. Linux instances are supported; Windows Server is not supported, although an experimental implementation is available.
* **AWS Fargate** The sensor is deployed as a daemon service alongside each serverless instance.

:::info
Refer to the Installation Documentation to [Learn how to install Sensor Agents](/docs/sensors)
:::
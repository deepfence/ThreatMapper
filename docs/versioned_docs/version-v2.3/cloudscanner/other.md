---
title: Other Platforms
---

# Posture Scanning on Other Platforms

ThreatMapper can perform compliance posture scanning on linux hosts and Kubernetes master and worker nodes.

Scanning is done directly, using a local [Sensor Agent](/docs/sensors) rather than by using the Cloud Scanner task employed by the cloud platform integrations.

## What Compliance Scans are Performed?


The sensor agent has direct visibility into the configuration of the base operating system, and can detect a wide range of compliance deviations that are not visible through an API.  ThreatMapper can apply general and specific compliance **benchmarks**, including PCI, HIPAA, and NIST (Kube-master and Kube-slave).  These benchmarks each select from a library of **controls** that cover best practices for Linux, Docker, Kubernetes (master and slave nodes) and well-known services.

When you run a compliance scan, you can select which benchmarks you wish to measure against, and ThreatMapper will then evaluate the appropriate controls and present the results, by benchmark, once the scan has completed.

For full information, refer to [Operations: Compliance Scanning](/docs/operations/compliance).


:::tip Maximizing Coverage
For maximum coverage, you can use both Cloud Scanner and Sensor Agent compliance scans together. You could scan your cloud infrastructure using Cloud Scanner, and scan selected VMs deployed within that infrastructure using the Sensor Agent.
:::
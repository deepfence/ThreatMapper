---
title: Management Console
---

# The ThreatMapper Management Console

The ThreatMapper Management Console ("Console") is a standalone application, implemented as a fleet of containers.  It should be deployed on either a single docker host, or (for larger deployments) a dedicated Kubernetes cluster.  The console is self-contained, and exposes an HTTPS interface for administration and API automation.

The console allows you to:

* Manage the users who can access the console.
* Configure Infrastructure API access and interrogate platform configurations.
* Visualize and drill down into Kubernetes clusters, virtual machines, containers and images, running processes, and network connections in near real time.
* Invoke vulnerability scans on running containers and applications and review the results, ranked by risk-of-exploit.
* Invoke compliance scans on infrastructure configuration ('agentless') and on infrastructure hosts ('agent-based'), manually or automatically when they are added to a cluster.
* Scan container registries for vulnerabilities, to review workloads before they are deployed.
* Scan image builds during the CI/CD pipeline, supporting CircleCI, Jenkins, and GitLab.
* Scan containers and host filesystems for unprotected secrets, including access tokens, keys and passwords.
* Configure integrations with external notification, SIEM and ticketing systems, including Slack, PagerDuty, Jira, Splunk, ELK, Sumo Logic, and AWS S3.
ThreatMapper supports multiple production deployments simultaneously, so that you can visualize and scan workloads across a large production estate.

### ThreatMapper Compliance Posture Scanning

ThreatMapper performs compliance posture scanning for cloud platforms by querying the infrastructure APIs for these platforms.

This is achieved using a **cloud scanner** task that is deployed within each cloud instance using a terraform module.  The cloud scanner is granted appropriate access to the local APIs, and operates under instruction from the remote ThreatMapper console.

### ThreatMapper Registry Scanning

The ThreatMapper console can scan container images at rest in a wide range of supported registries.

This is achieved by providing appropriate credentials to the ThreatMapper console so that it can discover and download assets directly from these registries.

### ThreatMapper Vulnerability, Secret and Local Compliance Scanning

ThreatMapper performs vulnerability and secret scanning directly on production and non-production hosts using a **sensor agent** container.

The sensor agent is also used for local compliance scanning (Kubernetes and Linux posture) where it has access to configuration and assets that are not exposed through an API.
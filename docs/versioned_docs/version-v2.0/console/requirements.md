---
title: System Requirements
---

# System Requirements

The Management Console may be installed on a single Docker host or in a dedicated Kubernetes cluster:

  * A Docker Host is suitable for small-scale deployments, managing up to several hundred production nodes
  * A Kubernetes Cluster is suitable for small and large-scale deployments 

| Feature                                   | Requirements (Docker)                       | Requirements (Kubernetes)           | 
|-------------------------------------------|---------------------------------------------|-------------------------------------|
| CPU: No of cores                          | 8 cores                                     | 3 nodes, 4 cores each               |
| RAM                                       | 16 GB                                       | 3 nodes, 8 GB each                  |
| Telemetry and data from Deepfence Sensors | Port 443 (configurable), firewalled         | Port 443 (configurable), firewalled |
| Administrative and API access             | Port 443 (configurable), firewalled         | Port 443 (configurable), firewalled |
| Docker                                    | *Version 20.10.18 (minimum version 18.06.0) |                                     |

Larger deployments, managing 250 or more production nodes, will require additional CPU and RAM resources.  For enterprise-scale deployments, managing 1000+ production nodes, the ThreatMapper Console should be deployed on a Kubernetes cluster of 3 or more nodes.

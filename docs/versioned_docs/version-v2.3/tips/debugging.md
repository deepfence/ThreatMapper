---
title: Debugging
---

# Diagnostics logs
Deepfence Management console provides a way to download the logs for the console or from the specific agent on host or kubernetes cluster or cloud scanner. For steps to download agent logs from console UI refer [Support and Diagnostics](../operations/support.md) 

# Agent Log Locations

- **General Log Locations**
    - `/var/log/supervisor` - bootstrapper logs, this is the daemon which manages all the plugins used in the agent 
    - `/var/log/deepfenced` - logs of plugins managed by bootstrapper like `package-scanner`, `secret-scanner`, etc.,
    - `/var/log/fenced` - all the data collected by the plugins are written here before its pushed to deepfence console

- Linux Binary Agent
    - In case of linux binary agent prefix `/opt/deepfence` to **General Log Locations**

- AWS Fargate Agent
    - In case of AWS Fargate agent prefix `DF_INSTALL_DIR` to **General Log Locations**

- Cloud Scanner
    - prefix `/home/deepfence` if deployed as ECS task or AWS Fargate or GCP Cloud Run container to **General Log Locations**
    - prefix `/data/home/deepfence` if deployed as docker container or kubernetes pod to **General Log Locations**

# Vulnerability scan failures
- Check agent `package_scanner.log` file for errors this file can be located in the directory `/var/log/deepfenced`
- If there are no errors on agent and sbom generation was successful, then check the deepfence-worker logs for issue in sbom scan on console 
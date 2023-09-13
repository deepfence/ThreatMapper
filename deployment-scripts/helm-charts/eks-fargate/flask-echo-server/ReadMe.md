# EKS Fargate: Sample helm chart with Deepfence agent

### Install

Application source: https://github.com/deepfence/ThreatMapper/tree/main/deployment-scripts/sample-applications/flask-echo-server/

**Quick start**

```bash
helm install flask-echo-server flask-echo-server \
    --set managementConsoleIp=40.40.40.40
```

**Detailed setup**

- Create values file
```bash
helm show values flask-echo-server > flask_echo_server_values.yaml
```
- Set Deepfence management console ip address or domain name
```yaml
managementConsoleUrl: ""
managementConsolePort: "443"
```
- (Optional) Change image
```yaml
deepfenceAgentImage:
  name: deepfenceio/deepfence_agent_ce
  tag: latest-fargate
```
- Set deepfence auth key
Set authentication key when it is enabled in management console
```yaml
# Auth: Get deepfence api key from UI -> Settings -> User Management
deepfenceKey: ""
```
- (Optional) Instance id suffix
Custom Amazon Machine Images might have same hostnames for multiple instances. This can be used to distinguish vm's. 
```yaml
# Suffix cloud instance id to hostnames
instanceIdSuffix: "N"
```
- Install deepfence-agent helm chart with values file
```bash
helm install -f flask_echo_server_values.yaml flask-echo-server flask-echo-server
```

### Delete

```bash
helm delete flask-echo-server
```
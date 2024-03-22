# Helm chart for Deepfence Agent

### Install

**Quick start**

```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
```

```bash
helm install deepfence-agent deepfence/deepfence-agent \
    --set managementConsoleUrl=40.40.40.40 \
    --set deepfenceKey="" \
    --set clusterName="prod-cluster" \
    --set global.imageTag="2.0.1" \
    --namespace deepfence \
    --create-namespace
```

**Detailed setup**

```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
```

- Create values file
```bash
helm show values deepfence/deepfence-agent > deepfence_agent_values.yaml
```
- (Optional) Edit values file and set docker hub username and password (if using your own registry)
```yaml
imagePullSecret:
  # Specifies whether a image pull secret should be created
  create: true
  registry: "quay.io"
  # registry: "https://index.docker.io/v1/"
  username: ""
  password: ""
  # The name of the imagePullSecret to use.
  # If not set and create is true, a name is generated using the fullname template
  name: ""
```
- Set Deepfence management console ip address
```yaml
managementConsoleUrl: ""
```
- Set image tag
```yaml
global:
  # this image tag is used every where for agents
  # to override set tag at agents level
  imageTag: 2.0.1
```
- Set deepfence auth key
Set authentication key when it is enabled in management console
```yaml
# Auth (Optional): Get deepfence api key from UI -> Settings -> User Management
deepfenceKey: ""
```
- (Optional) Instance id suffix
Custom Amazon Machine Images might have same hostnames for multiple instances. This can be used to distinguish vm's. 
```yaml
# Suffix cloud instance id to hostnames
instanceIdSuffix: "N"
```
- Set kubernetes cluster name
```yaml
# Set custom name for the cluster and hostname prefix for agent vm's to easily identify in Deepfence UI.
# Example: prod-cluster or dev1-cluster
# It will be suffixed with hostname - prod-cluster-aks-agentpool-123456-vmss000001
clusterName: ""
```
- Set container runtime socket path
  By default, docker is disabled and containerd is enabled
```yaml
# Mount container runtime socket path to agent pod. Agent will detect which runtime it is using these files.
mountContainerRuntimeSocket:
  dockerSock: false
  # Change if socket path is not the following
  dockerSockPath: "/var/run/docker.sock"
  containerdSock: true
  # Change if socket path is not the following
  containerdSockPath: "/run/containerd/containerd.sock"
  crioSock: false
  # Change if socket path is not the following
  crioSockPath: "/var/run/crio/crio.sock"
```
- Install deepfence-agent helm chart with values file
```bash
helm install -f deepfence_agent_values.yaml deepfence-agent deepfence/deepfence-agent \
    --namespace deepfence \
    --create-namespace
```
- Wait for pods to start up
```bash
kubectl get daemonset -n deepfence
kubectl get pods -n deepfence
```

### Delete

```bash
helm uninstall deepfence-agent -n deepfence
```
---
title: Kubernetes
---

# Kubernetes

In Kubernetes, the ThreatMapper sensors are deployed as a daemonset in the Kubernetes cluster, using a helm chart.

:::info
The `deepfence-console` helm chart by default runs agent and cluster-agent pods. The `deepfence-agent` helm chart need not be installed in the cluster where console helm chart is deployed.
:::

## Quick Installation of ThreatMapper Sensors

Install and start the latest release of the deepfence sensor.  Replace `x.x.x.x` with the IP address of the Management Console and `73f6f3d0-9931-4b31-8967-fd6adf475f80` with the API key.

### Identify container runtime
If container runtime is unknown, please follow [these](#identify-container-runtime-1) instructions.

:::info
`clusterName` is the name / identifier of the cluster. It should be different for different kubernetes clusters. Example: prod-cluster-1, test-cluster.
:::

:::info
Image tag `quay.io/deepfenceio/deepfence_agent_ce:THREATMAPPER_VERSION-multiarch` is supported in amd64 and arm64/v8 architectures.
:::

### Deploy deepfence-agent helm chart
```bash
helm repo add deepfence https://artifacts.threatmapper.org/helm-charts/threatmapper
helm repo update

# helm show readme deepfence/deepfence-agent --version TM_AGENT_HELM_CHART_VERSION | less
# helm show values deepfence/deepfence-agent --version TM_AGENT_HELM_CHART_VERSION | less

helm install deepfence-agent deepfence/deepfence-agent \
    --set managementConsoleUrl=x.x.x.x \
    --set deepfenceKey=73f6f3d0-9931-4b31-8967-fd6adf475f80 \
    --set global.imageTag=THREATMAPPER_VERSION \
    --set clusterName="prod-cluster" \
    --set mountContainerRuntimeSocket.containerdSock=true \
    --set mountContainerRuntimeSocket.dockerSock=false \
    --set mountContainerRuntimeSocket.crioSock=false \
    --set mountContainerRuntimeSocket.podmanSock=false \
    --set mountContainerRuntimeSocket.containerdSockPath="/run/containerd/containerd.sock" \
    --set logLevel="info" \
    --namespace deepfence \
    --create-namespace \
    --version TM_AGENT_HELM_CHART_VERSION
```

## Fine-tune the Helm deployment

```bash
helm repo add deepfence https://artifacts.threatmapper.org/helm-charts/threatmapper
helm repo update

helm show values deepfence/deepfence-agent --version TM_AGENT_HELM_CHART_VERSION > deepfence_agent_values.yaml

# You will need to update the following values:
#   managementConsoleUrl and deepfenceKey - specify your URL/IP and API key value
# You may wish to update other values, including:
#   image:name and image:clusterAgentImageName - change to point to custom images
#   containerdSock - set to false if agent fails to start on some Kubernetes platforms e.g. Minikube 
vim deepfence_agent_values.yaml

helm install -f deepfence_agent_values.yaml deepfence-agent deepfence/deepfence-agent \
    --namespace deepfence \
    --create-namespace \
    --version TM_AGENT_HELM_CHART_VERSION
```

## Delete the ThreatMapper Sensor

```bash
helm delete deepfence-agent -n deepfence
```

## Identify container runtime
- To get container runtime in the k8s cluster, run the following command
```shell
kubectl get nodes -o=custom-columns=NAME:.metadata.name,Runtime:.status.nodeInfo.containerRuntimeVersion
```
- To get container runtime socket path in the k8s cluster, run the following commands and search for `--container-runtime-endpoint` or `containerd`
```shell
kubectl apply -f https://artifacts.threatmapper.org/kubernetes/deepfence-cluster-config-job.yaml
kubectl wait --for=condition=complete --timeout=30s job/deepfence-cluster-config
kubectl logs $(kubectl get pod -l job-name=deepfence-cluster-config -o jsonpath="{.items[0].metadata.name}")
kubectl delete -f https://artifacts.threatmapper.org/kubernetes/deepfence-cluster-config-job.yaml
```
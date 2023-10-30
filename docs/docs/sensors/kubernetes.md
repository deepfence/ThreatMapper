---
title: Kubernetes
---

# Kubernetes

In Kubernetes, the ThreatMapper sensors are deployed as a daemonset in the Kubernetes cluster, using a helm chart.

## Quick Installation of ThreatMapper Sensors

Install and start the latest release of the deepfence sensor.  Replace `x.x.x.x` with the IP address of the Management Console and `73f6f3d0-9931-4b31-8967-fd6adf475f80` with the API key.

:::info
`clusterName` is the name / identifier of the cluster. It should be different for different kubernetes clusters. Example: prod-cluster-1, test-cluster.
:::

### Identify container runtime
- To get container runtime in the k8s cluster, run the following command 
```shell
kubectl get nodes -o=custom-columns=NAME:.metadata.name,Runtime:.status.nodeInfo.containerRuntimeVersion
```
- To get container runtime socket path in the k8s cluster, run the following commands and search for `--container-runtime-endpoint` or `containerd`
```shell
kubectl apply -f https://deepfence-public.s3.amazonaws.com/kubernetes/deepfence-cluster-config-job.yaml
kubectl wait --for=condition=complete --timeout=30s job/deepfence-cluster-config
kubectl logs $(kubectl get pod -l job-name=deepfence-cluster-config -o jsonpath="{.items[0].metadata.name}")
kubectl delete -f https://deepfence-public.s3.amazonaws.com/kubernetes/deepfence-cluster-config-job.yaml
```

### Deploy deepfence-agent helm chart
```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper

# helm show readme deepfence/deepfence-agent --version 2.0.3 | less
# helm show values deepfence/deepfence-agent --version 2.0.3 | less

helm install deepfence-agent deepfence/deepfence-agent \
    --set managementConsoleUrl=x.x.x.x \
    --set deepfenceKey=73f6f3d0-9931-4b31-8967-fd6adf475f80 \
    --set global.imageTag=2.0.1 \
    --set clusterName="prod-cluster" \
    --set mountContainerRuntimeSocket.containerdSock=true \
    --set mountContainerRuntimeSocket.dockerSock=false \
    --set mountContainerRuntimeSocket.crioSock=false \
    --set mountContainerRuntimeSocket.podmanSock=false \
    --set mountContainerRuntimeSocket.containerdSockPath="/run/containerd/containerd.sock" \
    --namespace deepfence \
    --create-namespace \
    --version 2.0.3
```

## Fine-tune the Helm deployment

```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper

helm show values deepfence/deepfence-agent --version 2.0.3 > deepfence_agent_values.yaml

# You will need to update the following values:
#   managementConsoleUrl and deepfenceKey - specify your URL/IP and API key value
# You may wish to update other values, including:
#   image:name and image:clusterAgentImageName - change to point to custom images
#   containerdSock - set to false if agent fails to start on some Kubernetes platforms e.g. Minikube 
vim deepfence_agent_values.yaml

helm install -f deepfence_agent_values.yaml deepfence-agent deepfence/deepfence-agent \
    --namespace deepfence \
    --create-namespace \
    --version 2.0.3
```

## Delete the ThreatMapper Sensor

```bash
helm delete deepfence-agent -n deepfence
```
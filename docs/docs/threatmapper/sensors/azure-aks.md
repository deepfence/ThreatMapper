---
title: Azure AKS
---

# Azure AKS

In AKS, the ThreatMapper agents are deployed as a daemonset in the cluster.


## ThreatMapper Agents

Connect to your AKS cluster.

```bash
az aks get-credentials --name MyCluster --resource-group MyResourceGroup
```

Start deepfence agent (replace `x.x.x.x` with the IP address of the Management Console and `C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0` with api key)

```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
helm show readme deepfence/deepfence-agent
helm show values deepfence/deepfence-agent

helm install deepfence-agent deepfence/deepfence-agent \
    --set managementConsoleUrl=x.x.x.x \
    --set deepfenceKey=C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0 \
    --namespace deepfence \
    --create-namespace
```

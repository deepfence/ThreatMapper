---
title: Azure AKS
---

# Azure AKS

In AKS, the ThreatMapper agents are deployed as a daemonset in the cluster.

## ThreatMapper Console

The ThreatMapper management console is installed separately, outside of the AKS cluster, following the [installation instructions](Installing-the-Management-Console).

## ThreatMapper Agents

1. Connect to your AKS cluster.

   ```
   az aks get-credentials --name MyCluster --resource-group MyResourceGroup
   ```

2. Start deepfence agent (replace `x.x.x.x` with the IP address of the Management Console and `C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0` with api key)

   ```shell script
   helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
   helm show readme deepfence/deepfence-agent
   helm show values deepfence/deepfence-agent

   # helm v2
   helm install deepfence/deepfence-agent \
       --name=deepfence-agent \
       --set managementConsoleUrl=x.x.x.x \
       --set deepfenceKey=C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0

   # helm v3
   helm install deepfence-agent deepfence/deepfence-agent \
       --set managementConsoleUrl=x.x.x.x \
       --set deepfenceKey=C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0
   ```

---
title: Kubernetes
---

# Kubernetes

In Kubernetes, the ThreatMapper sensors are deployed as a daemonset in the Kubernetes cluster, using a helm chart.

## Quick Installation of ThreatMapper Sensors

Install and start the latest release of the deepfence sensor.  Replace `x.x.x.x` with the IP address of the Management Console and `C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0` with the API key.

```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
helm show readme deepfence/deepfence-agent
helm show values deepfence/deepfence-agent

helm install deepfence-agent deepfence/deepfence-agent \
    --set managementConsoleUrl=x.x.x.x \
    --set deepfenceKey=C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0 \
    --set clusterName="prod-cluster" \
    --namespace deepfence \
    --create-namespace
```

## Install a named version of the ThreatMapper Sensor

You should seek to ensure that the version number of the sensors matches the version of your Management Console as closely as possible, for best compatibility.

```bash
helm install deepfence-agent deepfence/deepfence-agent \
    --set managementConsoleUrl=x.x.x.x \
    --set deepfenceKey=C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0
    --set image.tag=1.4.0 \
    --set image.clusterAgentImageTag=1.4.0 \
    --set clusterName="prod-cluster" \
    --namespace deepfence \
    --create-namespace
```

## Perform a rolling upgrade of the ThreatMapper Sensors

When you upgrade the Management Console, you should also upgrade the ThreatMapper sensors to the same version:

```bash
helm repo update deepfence
helm upgrade deepfence-agent deepfence/deepfence-agent \
    --set managementConsoleUrl=x.x.x.x \
    --set deepfenceKey=C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0
    --set image.tag=1.4.0 \
    --set image.clusterAgentImageTag=1.4.0 \
    --set clusterName="prod-cluster"
```

## Delete the ThreatMapper Sensor

```bash
helm delete deepfence-agent -n deepfence
```

## Fine-tune the Helm deployment

```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper

helm show values deepfence/deepfence-agent > deepfence_agent_values.yaml

# You will need to update the following values:
#   managementConsoleUrl and deepfenceKey - specify your URL/IP and API key value
# You may wish to update other values, including:
#   image:name and image:clusterAgentImageName - change to point to custom images
#   containerdSock - set to false if agent fails to start on some Kubernetes platforms e.g. Minikube 
vim deepfence_agent_values.yaml

helm install -f deepfence_agent_values.yaml deepfence-agent deepfence/deepfence-agent \
    --namespace deepfence \
    --create-namespace
```


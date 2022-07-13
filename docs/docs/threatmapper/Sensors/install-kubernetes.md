---
title: Kubernetes
---

In Kubernetes, the ThreatMapper sensors are deployed as a daemonset in the Kubernetes cluster, using a helm chart.

## ThreatMapper Console

The ThreatMapper management console is installed separately, outside of the Kubernetes cluster, following the [installation instructions](Installing-the-Management-Console).

## ThreatMapper Sensors

Install and start the deepfence sensor.  Replace `x.x.x.x` with the IP address of the Management Console and `C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0` with the API key.

```shell script
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
helm show readme deepfence/deepfence-agent
helm show values deepfence/deepfence-agent

helm install deepfence-agent deepfence/deepfence-agent \
    --set managementConsoleUrl=x.x.x.x \
    --set deepfenceKey=C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0
```

## Install a named version of the ThreatMapper Sensor

```shell script
helm install deepfence-agent deepfence/deepfence-agent \
    --set managementConsoleUrl=x.x.x.x \
    --set deepfenceKey=C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0
    --set image.tag=1.3.1 --set image.clusterAgentImageTag=1.3.1
```

## Perform a rolling upgrade of the ThreatMapper Sensors

When you upgrade the Management Console, you should also upgrade the ThreatMapper sensors to the same version, as compatibility is not guaranteed:

```shell script
helm repo update deepfence
helm upgrade deepfence-agent deepfence/deepfence-agent \
    --set managementConsoleUrl=x.x.x.x \
    --set deepfenceKey=C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0
    --set image.tag=1.3.1 --set image.clusterAgentImageTag=1.3.1
```

## Delete the ThreatMapper Agent

```shell script
helm delete deepfence-agent
```

## Fine-tune the Helm deployment

```shell script
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper

helm show values deepfence/deepfence-agent > deepfence_agent_values.yaml

# You will need to update the following values:
#   managementConsoleUrl and deepfenceKey - specify your URL/IP and API key value
# You may wish to update other values, including:
#   image:name and image:clusterAgentImageName - change to point to custom images
#   containerdSock - set to false if agent fails to start on some Kubernetes platforms e.g. Minikube 
vim deepfence_agent_values.yaml

helm install -f deepfence_agent_values.yaml deepfence-agent deepfence/deepfence-agent
```


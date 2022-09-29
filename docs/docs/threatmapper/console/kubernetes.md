---
title: Kubernetes Installation
---

# Kubernetes Installation

You can install the Management Console on a [single Docker host](docker) or in a dedicated Kubernetes cluster.

## Install the ThreatMapper Management Console

The following instructions explain how to install the ThreatMapper console on a Kubernetes Cluster, and configure external access to the Console.  For detailed instructions for custom installs, see [Console](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-console) and [Router](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-router) notes.

1. **Install OpenEBS storage** ([other storage methods](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-console#install-deepfence-console-helm-chart) are supported):

    ```bash
    kubectl create ns openebs
    helm install openebs --namespace openebs --repo "https://openebs.github.io/charts" openebs --set analytics.enabled=false
    ```
    
    ... and wait (```-w```) for the openebs pods to start up:
    
    ```bash
    kubectl get pods -o wide --namespace openebs -w
    ```

2. **Install the metrics server** (if necessary)

    If the metrics server is not already installed (```kubectl get deployment metrics-server -n kube-system```), install as follows:

    ```bash
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    ```

3. **Install the ThreatMapper Console**

    ```bash
    helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper

    helm install deepfence-console deepfence/deepfence-console
    ```

    ... and wait for the pods to start up:

    ```bash
    kubectl get pods -o wide -w
    ```

    :::tip

    Alternatively, to install a named [tagged release](https://github.com/deepfence/ThreatMapper/releases) (recommended), specify the release tag as follows:

    ```bash
    helm install deepfence-console deepfence/deepfence-console --set image.tag=1.4.1
    ```
    :::

    :::tip
    For advanced installation, you can edit the helm chart values as described in the [Helm Chart - detailed setup](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-console#install-deepfence-console-helm-chart).
    :::

4. **Enable external access** with the ```deepfence-router``` helm chart:

    Deploy deepfence-router:

    ```bash
    helm install deepfence-router deepfence/deepfence-router
    ```

    ... and wait for the cloud platform to deploy an external load-balancer:

    ```bash
    kubectl get --namespace default svc -w deepfence-router
    ```

    :::tip
    For advanced installation, you can edit the helm chart values as described in the [Helm Chart - detailed setup](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-router#install-deepfence-router-helm-chart).
    :::

Now proceed to the [Initial Configuration](initial-configuration).

### Upgrade the ThreatMapper Management Console

You can perform a rolling upgrade of the Management Console to a new, tagged release:

   ```bash
   helm repo update deepfence
   helm upgrade deepfence-console deepfence/deepfence-console --set image.tag=1.4.1
   helm upgrade deepfence-router deepfence/deepfence-router
   ```

### Remove the ThreatMapper Management Console

To remove the ThreatMapper Management Console

   ```bash
   helm delete deepfence-router
   helm delete deepfence-console
   ```
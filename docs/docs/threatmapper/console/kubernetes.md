---
title: Kubernetes Installation
---

# Kubernetes Installation

The quickest and easiest way to install the ThreatMapper Management Console is to use the pre-built images.  These instructions use pre-built ThreatMapper containers from [DockerHub](https://hub.docker.com/u/deepfenceio).

You can install the Management Console on a single Docker host or in a dedicated Kubernetes cluster.

## Install the ThreatMapper Management Console - Kubernetes Cluster

The following instructions explain how to install the ThreatMapper console on a Kubernetes Cluster, and configure external access to the Console.  For detailed instructions, see [Console](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-console) and [Router](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-router) notes.

1. Install OpenEBS storage ([other storage methods](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-console#install-deepfence-console-helm-chart) are supported):

    ```shell script
    kubectl create ns openebs
    helm install openebs --namespace openebs --repo "https://openebs.github.io/charts" openebs --set analytics.enabled=false
    ```
    
    Wait (```-w```) for the openebs pods to start up:
    
    ```shell script
    kubectl get pods -o wide --namespace openebs -w
    ```

2. Install the metrics server (if necessary)

    If the metrics server is not already installed (```kubectl get deployment metrics-server -n kube-system```), install as follows:

    ```shell script
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.6.1/components.yaml
    ```

3. Install the ThreatMapper Console

    ```shell script
    helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper

    helm install deepfence-console deepfence/deepfence-console
    ```

    Wait for the pods to start up:

    ```shell script
    kubectl get pods -o wide -w
    ```

    Alternatively, to install a named [tagged release](https://github.com/deepfence/ThreatMapper/releases) (recommended), specify the release tag as follows:

    ```shell script
    helm install deepfence-console deepfence/deepfence-console --set image.tag=1.3.1
    ```

    For advanced installation, you can edit the helm chart values as described in the [Helm Chart - detailed setup](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-console#install-deepfence-console-helm-chart).

4. Optional: enable external access with the ```deepfence-router``` package:

    Deploy deepfence-router:

    ```shell script
    helm install deepfence-router deepfence/deepfence-router
    # Optionally, use a tagged release:
    # helm install deepfence-router deepfence/deepfence-router --set image.tag=1.3.1
    ```

    Wait for the cloud platform to deploy an external load-balancer:

    ```shell script
    kubectl get --namespace default svc -w deepfence-router
    ```

    For advanced installation, you can edit the helm chart values as described in the [Helm Chart - detailed setup](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-router#install-deepfence-router-helm-chart).

Now proceed to the [Initial Configuration](Console-Initial-Configuration).

### Upgrade the Management Console - Kubernetes Cluster

You can perform a rolling upgrade of the Management Console to a new, tagged release:

   ```shell script
   helm repo update deepfence
   helm upgrade deepfence-console deepfence/deepfence-console --set image.tag=1.3.1
   helm upgrade deepfence-router deepfence/deepfence-router --set image.tag=1.3.1
   ```

### Remove the ThreatMapper Management Console - Kubernetes Cluster

To remove the ThreatMapper Management Console, refer to the notes in the [Router](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-router) and [Console](https://github.com/deepfence/ThreatMapper/tree/master/deployment-scripts/helm-charts/deepfence-console) documentation.

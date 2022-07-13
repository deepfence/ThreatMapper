---
title: Installation
---


The quickest and easiest way to install the ThreatMapper Management Console is to use the pre-built images.  These instructions use pre-built ThreatMapper containers from [DockerHub](https://hub.docker.com/u/deepfenceio).

You can install the Management Console on a single Docker host or in a dedicated Kubernetes cluster.

## Install the ThreatMapper Management Console - Single Docker Host

The following instructions explain how to get started with a docker-based install on a single host system:

1. Prepare the host by installing the necessary docker and docker-compose packages. [Increase Virtual Memory settings](https://www.elastic.co/guide/en/elasticsearch/reference/current/vm-max-map-count.html) as required by the ElasticSearch component:

    ```shell script
    sudo sysctl -w vm.max_map_count=262144
    ```
  
2. Download the file [docker-compose.yml](https://github.com/deepfence/ThreatMapper/blob/master/deployment-scripts/docker-compose.yml) to the system that will host the Console

    ```shell script
    wget https://github.com/deepfence/ThreatMapper/raw/master/deployment-scripts/docker-compose.yml
    ```

3. Execute the following command to install and start the latest build of the Console

    ```shell script
    docker-compose -f docker-compose.yml up -d
    ```

    Alternatively, to install a named [tagged release](https://github.com/deepfence/ThreatMapper/releases), specify the release tag as follows:

    ```shell script
    wget https://github.com/deepfence/ThreatMapper/raw/release-1.3/deployment-scripts/docker-compose.yml
    env DF_IMG_TAG=1.3.1 docker-compose -f docker-compose.yml up -d
    ```

Now proceed to the [Initial Configuration](Console-Initial-Configuration).

### Upgrade the Management Console - Single Docker Host

The simplest way to upgrade is to shut the console down and restart it with the upgraded containers.  The disk volumes with user configuration and scan results will persist across the upgrade process:

   ```shell script
   docker-compose -f docker-compose.yml down
   
   # refresh the docker-compose file
   rm docker-compose.yml
   wget https://github.com/deepfence/ThreatMapper/raw/release-1.3/deployment-scripts/docker-compose.yml
   env DF_IMG_TAG=1.3.1 docker-compose -f docker-compose.yml up -d
   ```

### Remove the ThreatMapper Management Console - Single Docker Host

Remove the ThreatMapper Management Console as follows:

   ```shell script
   docker-compose -f docker-compose.yml down
   ```

You can then prune the images and volumes if they are no longer required.

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

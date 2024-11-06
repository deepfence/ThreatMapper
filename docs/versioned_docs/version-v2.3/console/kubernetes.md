---
title: Kubernetes Installation
---

# Kubernetes Installation

:::info[Neo4j Upgrade]
Neo4j version was upgraded to v5.x (from v4.4).

Please follow [these](upgrade-from-v2.1.md) steps before upgrading the management console version.
:::

You can install the Management Console on a [single Docker host](docker) or in a dedicated Kubernetes cluster.


## Prerequisites

1. Install and configure **kubectl** and **helm** cli to access the kubernetes cluster where ThreatMapper console is installed

2. **Configure Persistent Volume**:

   ### Cloud Managed

   If the Kubernetes cluster is hosted in a cloud provider, it is recommended to use cloud managed storage
    ```
    kubectl get storageclass
    ```
   | Cloud Provider | Storage Class                                                       |
   |----------------|---------------------------------------------------------------------|
   | AWS            | gp3 (https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html) |
   | GCP            | standard                                                            |

   ### Self-Managed

   If using on-prem kubernetes cluster install and configure a self hostage storage provider like [openebs](https://openebs.io/docs/quickstart-guide/installation), [longhorn](https://longhorn.io/docs/1.6.2/deploy/install/), etc.

3. **Install the metrics server** (optional)

   If the metrics server is not already installed (```kubectl get deployment metrics-server -n kube-system```), install as follows:

    ```bash
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    ```

## Install the ThreatMapper Management Console

The following instructions explain how to install the ThreatMapper console on a Kubernetes Cluster, and configure external access to the Console.


1. **Add Deepfence helm charts repo**

    ```bash 
    helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
    helm repo update
    ```

2. **Install the ThreatMapper Console**

    ```bash
    # helm show values deepfence/deepfence-console --version 2.3.1 | less

    helm install deepfence-console deepfence/deepfence-console \
    --set global.imageTag=2.3.1 \
    --set global.storageClass=gp3 \
    --namespace deepfence-console \
    --create-namespace \
    --version 2.3.1
    ```

   ... and wait for the pods to start up:

    ```bash
    kubectl get pods --namespace deepfence-console -o wide -w
    ```

3. To access ThreatMapper connsole install ```deepfence-router``` helm chart, this creates a `Loadbalancer` type service, the consle can be accessed over the loadbalancer created.

    To create a ingress service refer section [Deploy Router Helm Chart With Ingress Enabled](#deploy-router-helm-chart-with-ingress-enabled)

    ```bash
    # helm show values deepfence/deepfence-router --version 2.3.1
   
    helm install deepfence-router deepfence/deepfence-router \
    --namespace deepfence-console \
    --create-namespace \
    --version 2.3.1
    ```

   ... and wait for the cloud platform to deploy an external load-balancer:

    ```bash
    kubectl get svc -w deepfence-console-router --namespace deepfence-console
    ```

Now proceed to the [Initial Configuration](initial-configuration).

## Customise the Helm deployment

### Console Helm Chart

1. Save the helm chart values to file 

    ```bash
    helm show values deepfence/deepfence-console --version 2.3.1 > deepfence_console_values.yaml
    ```

    :::info
    All the supported helm chart values are documentd in the `deepfence_console_values.yaml` file generated when above command is run 
    :::

2. Update the `deepfence_console_values.yaml` file as required to change the database password, resource requests, pod/service annotations etc,.
    
    Check instructions on [Managed Database](managed-database) section for using external database with console

3. Use the updated values file to deploy the ThreatMapper Console

    ```bash
    helm install -f deepfence_console_values.yaml deepfence-console deepfence/deepfence-console \
        --namespace deepfence-console \
        --create-namespace \
        --version 2.3.1
    ```

### Router Helm Chart


1. Save the helm chart values to file

    ```bash
    helm show values deepfence/deepfence-router --version 2.3.1 > deepfence_router_values.yaml
    ```

    :::info
    All the supported helm chart values are documentd in the `deepfence_router_values.yaml` file generated when above command is run 
    :::

2. Update the `deepfence_router_values.yaml` file as required to enable seperate serivce for agents access or to enable ingress

3. Use the updated values file to deploy the ThreatMapper Console Router

    ```bash
    helm install -f deepfence_router_values.yaml deepfence-router deepfence/deepfence-router \
        --namespace deepfence-console \
        --create-namespace \
        --version 2.3.1
    ```

### Deploy Router Helm Chart With Ingress Enabled

1. Install the supported ingress controller service on the cluster 

2. Save the helm chart values to file

    ```bash
    helm show values deepfence/deepfence-router --version 2.3.1 > deepfence_router_values.yaml
    ```

    :::info
    All the supported helm chart values are documentd in the `deepfence_router_values.yaml` file generated when above command is run 
    :::

3. Update the `deepfence_router_values.yaml` file to enable ingress set `service.type=Ingress` and updated the ingress section according to the ingress cotroller installed on the cluster, below example assumes nginx ingress controller

    ```yaml
    service:
        name: deepfence-console-router
        type: Ingress # LoadBalancer/NodePort/Ingress/ClusterIP

    # ingress configuration for console
    ingress:
        ## name of the ingress class for ingress provider installed on the cluster, cannot be empty
        ## Example: nginx
        class: nginx
        ## host example: threat.example.com
        host: "threatmapper.example.com"
        ## annotations to customize ingress
        annotations:
            ## nginx ingress annotations
            nginx.ingress.kubernetes.io/backend-protocol: HTTPS
            nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
            nginx.ingress.kubernetes.io/proxy-body-size: 200m
    ```

3. Use the updated values file to deploy the ThreatMapper Console Router

    ```bash
    helm install -f deepfence_router_values.yaml deepfence-router deepfence/deepfence-router \
        --namespace deepfence-console \
        --create-namespace \
        --version 2.3.1
    ```

## Delete the ThreatMapper Management Console

To delete the ThreatMapper Management Console

   ```bash
   helm delete deepfence-router -n deepfence-console
   helm delete deepfence-console -n deepfence-console
   ```

---
title: Kubernetes Installation
---

# Kubernetes Installation

You can install the Management Console on a [single Docker host](docker) or in a dedicated Kubernetes cluster.

## Install the ThreatMapper Management Console

The following instructions explain how to install the ThreatMapper console on a Kubernetes Cluster, and configure external access to the Console.

1. **Configure Persistent Volume**:

   ## Cloud Managed

   If the Kubernetes cluster is hosted in a cloud provider, it is recommended to use cloud managed storage
    ```
    kubectl get storageclass
    ```
   | Cloud Provider | Storage Class                                                       |
   |----------------|---------------------------------------------------------------------|
   | AWS            | gp3 (https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html) |
   | GCP            | standard                                                            |

   ## Self-Managed: OpenEBS

    ```bash
    helm repo add openebs https://openebs.github.io/charts
    helm install openebs --namespace openebs openebs/openebs --create-namespace
    ```

   ... and wait (```-w```) for the openebs pods to start up:

    ```bash
    kubectl get pods -o wide --namespace openebs -w
    ```

    The Storage Class will now be `openebs-hostpath`

2. **Install the metrics server** (optional)

   If the metrics server is not already installed (```kubectl get deployment metrics-server -n kube-system```), install as follows:

    ```bash
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    ```

3. **Install the ThreatMapper Console**

    ```bash
    helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
    helm repo update

    # helm show values deepfence/deepfence-console --version 2.1.3 | less

    helm install deepfence-console deepfence/deepfence-console \
    --set global.imageTag=2.1.1 \
    --set global.storageClass=gp3 \
    --namespace deepfence-console \
    --create-namespace \
    --version 2.1.3
    ```

   ... and wait for the pods to start up:

    ```bash
    kubectl get pods --namespace deepfence-console -o wide -w
    ```

4. **Enable external access** with the ```deepfence-router``` helm chart:

   Deploy deepfence-router:

    ```bash
    # helm show values deepfence/deepfence-router --version 2.1.1
   
    helm install deepfence-router deepfence/deepfence-router \
    --namespace deepfence-console \
    --create-namespace \
    --version 2.1.1
    ```

   ... and wait for the cloud platform to deploy an external load-balancer:

    ```bash
    kubectl get svc -w deepfence-console-router --namespace deepfence-console
    ```

Now proceed to the [Initial Configuration](initial-configuration).

## Fine-tune the Helm deployment

### Console Helm Chart

```bash
helm show values deepfence/deepfence-console --version 2.1.3 > deepfence_console_values.yaml

# Make the changes in this file and save
vim deepfence_console_values.yaml

helm install -f deepfence_console_values.yaml deepfence-console deepfence/deepfence-console \
    --namespace deepfence-console \
    --create-namespace \
    --version 2.1.3
```

### Router Helm Chart

```bash
helm show values deepfence/deepfence-router --version 2.1.1 > deepfence_router_values.yaml

# Make the changes in this file and save
vim deepfence_router_values.yaml

helm install -f deepfence_router_values.yaml deepfence-router deepfence/deepfence-router \
    --namespace deepfence-console \
    --create-namespace \
    --version 2.1.1
```

## Delete the ThreatMapper Management Console

To delete the ThreatMapper Management Console

   ```bash
   helm delete deepfence-router -n deepfence-console
   helm delete deepfence-console -n deepfence-console
   ```

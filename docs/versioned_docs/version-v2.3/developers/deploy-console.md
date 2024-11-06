---
title: Deploy Console
---

# Deploy a custom ThreatMapper Console

You should first [build the management console](build) and push the images to a suitable repository.  You can then adapt the standard installation instructions ([Docker](/docs/console/docker), [Kubernetes](/docs/console/kubernetes)) to refer to your custom images rather than the Deepfence-provided ones.



## Installing and Running the Management Console on a Docker Host

:::tip
Refer to the [Docker Installation Instructions](/docs/console/docker) along with the modifications below.
:::

1. Download the file [docker-compose.yml](https://github.com/deepfence/ThreatMapper/blob/release-2.3/deployment-scripts/docker-compose.yml) to the system that will host the Console

    ```bash
    wget https://github.com/deepfence/ThreatMapper/raw/release-2.3/deployment-scripts/docker-compose.yml
    ```

2. Execute the following command to install and start the Console.  Note the override to specify your repository `myorg`, rather than the `deepfenceio` default:

    ```bash
    ACC=myorg             # the name of the dockerhub account 
    docker login -u $ACC  # log in to the account
    IMAGE_REPOSITORY=$ACC docker-compose -f docker-compose.yml up --detach
    ```

## Installing and Running the Management Console in a Kubernetes Cluster

:::tip
Refer to the [Kubernetes Installation Instructions](/docs/console/kubernetes) along with the modifications below.
:::

1. Prepare the cluster, installing the storage driver and metrics service

    Follow the instructions to install the OpenEBS storage and metrics server: [Installation Instructions](/docs/console/kubernetes)


2. Install your Management Console

    We will install the Management Console using the helm chart, but overriding the repository source for the images:

    ```bash
    helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper
    helm repo update

    # Create the values file
    helm show values deepfence/deepfence-console --version 2.3.1 > deepfence_console_values.yaml
    ```

    Edit the `deepfence_console_values.yaml` file, replacing the `image: repository:` value to point to your repository, and making any other changes as needed.

    Install the management console:

    ```bash
    helm install -f deepfence_console_values.yaml deepfence-console deepfence/deepfence-console --version 2.3.1
    ```

    Full instructions can be found in the [Console helm chart documentation](https://github.com/deepfence/ThreatMapper/tree/main/deployment-scripts/helm-charts/deepfence-console).

4. Optional: enable external access with the `deepfence-router` package:

    Refer to the instructions to install the [Router](https://github.com/deepfence/ThreatMapper/tree/main/deployment-scripts/helm-charts/deepfence-router), typically as follows:
   
    ```bash
    # Create the values file
    helm show values deepfence/deepfence-router --version 2.3.1 > deepfence_router_values.yaml
    ```

    Edit the `deepfence_router_values.yaml` file, replacing the `image: repository:` value to point to your repository, and making any other changes as needed.

    ```bash
    helm install -f deepfence_router_values.yaml deepfence-router deepfence/deepfence-router --version 2.3.1
    ```

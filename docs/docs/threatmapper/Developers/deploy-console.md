---
title: Deploy ThreatMapper Console
---

You should first [build the management console](Building-Console-and-Sensors-from-Source) and push the images to a suitable repository.  You can then adapt the [standard installation instructions](Installing-the-Management-Console) to refer to your custom images rather than the Deepfence-provided ones.

**Important:** Review the [standard installation instructions](Installing-the-Management-Console) for your selected platform first!


## Installing and Running the Management Console on a Docker Host

1. Download the file [docker-compose.yml](https://github.com/deepfence/ThreatMapper/blob/master/deployment-scripts/docker-compose.yml) to the system that will host the Console

    ```shell script
    wget https://github.com/deepfence/ThreatMapper/raw/master/deployment-scripts/docker-compose.yml
    ```

2. Execute the following command to install and start the Console.  Note the override to specify your repository `myorg`, rather than the `deepfenceio` default:

    ```shell script
    ACC=myorg             # the name of the dockerhub account 
    docker login -u $ACC  # log in to the account
    IMAGE_REPOSITORY=$ACC docker-compose -f docker-compose.yml up --detach
    ```

## Installing and Running the Management Console in a Kubernetes Cluster

1. Prepare the cluster, installing the storage driver and metrics service

    Follow the instructions to install the OpenEBS storage and metrics server: [Installation Instructions](Installing-the-Management-Console)


2. Install your Management Console

    We will install the Management Console using the helm chart, but overriding the repository source for the images:

    ```shell script
    helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper

    # Create the values file
    helm show values deepfence/deepfence-console > deepfence_console_values.yaml
    ```

    Edit the `deepfence_console_values.yaml` file, replacing the `image: repository:` value to point to your repository, and making any other changes as needed.

    Install the management console:

    ```shell script
    # helm v2
    helm install -f deepfence_console_values.yaml deepfence/deepfence-console --name=deepfence-console

    # helm v3
    helm install -f deepfence_console_values.yaml deepfence-console deepfence/deepfence-console
    ```

    Full instructions can be found in the [Console helm chart documentation](../tree/master/deployment-scripts/helm-charts/deepfence-console).

4. Optional: enable external access with the `deepfence-router` package:

    Refer to the the instructions to install the [Router](../tree/master/deployment-scripts/helm-charts/deepfence-router), typically as follows:
   
    ```shell script
    # Create the values file
    helm show values deepfence/deepfence-router > deepfence_router_values.yaml
    ```

    Edit the `deepfence_router_values.yaml` file, replacing the `image: repository:` value to point to your repository, and making any other changes as needed.

    ```
    # helm v2
    helm install -f deepfence_router_values.yaml deepfence/deepfence-router --name=deepfence-router
    
    # helm v3
    helm install -f deepfence_router_values.yaml deepfence-router deepfence/deepfence-router
    ```

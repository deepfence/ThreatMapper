---
title: Docker Installation
---

# Docker Installation

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


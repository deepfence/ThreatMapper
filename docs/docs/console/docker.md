---
title: Docker Installation
---

# Docker Installation

The quickest and easiest way to install the ThreatMapper Management Console is to use the pre-built images.  These instructions use pre-built ThreatMapper containers from [DockerHub](https://hub.docker.com/u/deepfenceio).

You can install the Management Console on a single Docker host or [in a dedicated Kubernetes cluster](kubernetes).

## Install the ThreatMapper Management Console - Single Docker Host

The following instructions explain how to get started with a docker-based installation on a single host system:

1. Prepare the host by installing the necessary docker and docker-compose packages. [Increase Virtual Memory settings](https://www.elastic.co/guide/en/elasticsearch/reference/current/vm-max-map-count.html) as required by the ElasticSearch component:

    ```bash
    sudo sysctl -w vm.max_map_count=262144
    ```
   To set this value permanently, update the `vm.max_map_count` setting in `/etc/sysctl.conf`
2. Download the file [docker-compose.yml](https://github.com/deepfence/ThreatMapper/blob/release-1.5/deployment-scripts/docker-compose.yml) to the system that will host the Console

    ```bash
    wget https://github.com/deepfence/ThreatMapper/raw/release-1.5/deployment-scripts/docker-compose.yml
    ```

3. Execute the following command to install and start the latest build of the Console

    ```bash
    docker compose up -d
    ```

Now proceed to the [Initial Configuration](initial-configuration).

### Upgrade the Management Console

The simplest way to upgrade is to shut the console down and restart it with the upgraded containers.  The disk volumes with user configuration and scan results will persist across the upgrade process:

```bash
docker compose down

# refresh the docker-compose file
rm docker-compose.yml
wget https://github.com/deepfence/ThreatMapper/raw/release-1.5/deployment-scripts/docker-compose.yml
env DF_IMG_TAG=1.5.0 docker compose up -d
```

### Remove the ThreatMapper Management Console

Remove the ThreatMapper Management Console as follows:

```bash
docker compose down
```

You can then prune the images and volumes if they are no longer required:

```bash
docker image prune
docker volume prune
```

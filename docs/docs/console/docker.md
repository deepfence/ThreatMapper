---
title: Docker Installation
---

# Docker Installation

The quickest and easiest way to install the ThreatMapper Management Console is to use the pre-built images.  These instructions use pre-built ThreatMapper containers from [DockerHub](https://hub.docker.com/u/deepfenceio).

You can install the Management Console on a single Docker host or [in a dedicated Kubernetes cluster](kubernetes).

## Install the ThreatMapper Management Console - Single Docker Host

The following instructions explain how to get started with a docker-based installation on a single host system:

1. Download the file [docker-compose.yml](https://github.com/deepfence/ThreatMapper/blob/main/deployment-scripts/docker-compose.yml) to the system that will host the Console

    ```bash
    wget https://github.com/deepfence/ThreatMapper/raw/main/deployment-scripts/docker-compose.yml
    ```

2. Execute the following command to install and start the latest build of the Console

    ```bash
    docker compose up -d
    ```

    :::tip
    Alternatively, to install a named [tagged release](https://github.com/deepfence/ThreatMapper/releases), specify the release tag as follows:

    ```bash
    wget https://github.com/deepfence/ThreatMapper/raw/release-1.5/deployment-scripts/docker-compose.yml
    env DF_IMG_TAG=2.0.0 docker compose up -d
    ```
    :::

Now proceed to the [Initial Configuration](initial-configuration).

### Upgrade the Management Console

The simplest way to upgrade is to shut the console down and restart it with the upgraded containers.  The disk volumes with user configuration and scan results will persist across the upgrade process:

```bash
docker compose down

# refresh the docker-compose file
rm docker-compose.yml
wget https://github.com/deepfence/ThreatMapper/raw/release-1.5/deployment-scripts/docker-compose.yml
env DF_IMG_TAG=2.0.0 docker compose up -d
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

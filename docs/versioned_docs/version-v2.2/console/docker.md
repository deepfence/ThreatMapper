---
title: Docker Installation
---

# Docker Installation

:::info[Neo4j Upgrade]
Neo4j version was upgraded to v5.x (from v4.4).

Please follow [these](upgrade-from-v2.1.md) steps before upgrading the management console version.
:::

The quickest and easiest way to install the ThreatMapper Management Console is to use the pre-built images.  These instructions use pre-built ThreatMapper containers from [DockerHub](https://hub.docker.com/u/deepfenceio).

You can install the Management Console on a single Docker host or [in a dedicated Kubernetes cluster](kubernetes).

## Install the ThreatMapper Management Console - Single Docker Host

The following instructions explain how to get started with a docker-based installation on a single host system:

1. Download the file [docker-compose.yml](https://github.com/deepfence/ThreatMapper/blob/release-2.2/deployment-scripts/docker-compose.yml) to the system that will host the Console

    ```bash
    wget https://github.com/deepfence/ThreatMapper/raw/release-2.2/deployment-scripts/docker-compose.yml
    ```

2. Execute the following command to install and start the latest build of the Console

    ```bash
    docker compose up -d
    ```

Now proceed to the [Initial Configuration](initial-configuration).

## Uninstall the ThreatMapper Management Console

Remove the ThreatMapper Management Console as follows:

```bash
docker compose down
```

You can then prune the images and volumes if they are no longer required:

```bash
docker image prune
docker volume prune
```

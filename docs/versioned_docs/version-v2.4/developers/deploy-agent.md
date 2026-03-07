---
title: Deploy Sensors
---

# Deploy custom ThreatMapper Sensor Agents

You should first [build the management console and agents](build) and push the images to a suitable repository.  You can then adapt the standard installation instructions ([Docker](/docs/sensors/docker), [Kubernetes](/docs/sensors/kubernetes)) to refer to your custom images rather than the Deepfence-provided ones.


## Installing and Running the Sensor Agents on a Docker Host

:::tip
Refer to the [Docker Installation Instructions](/docs/sensors/docker) along with the modifications below.
:::

Execute the following command to install and start the sensors:

```bash
ACC=myorg             # the name of the dockerhub account 
docker login -u $ACC  # log in to the account

docker run -dit \
    --cpus=".2" \
    --name=deepfence-agent \
    --restart on-failure \
    --pid=host \
    --net=host \
    --log-driver json-file \
    --log-opt max-size=50m \
    --privileged=true \
    -v /sys/kernel/debug:/sys/kernel/debug:rw \
    -v /var/log/fenced \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /:/fenced/mnt/host/:ro \
    -e DF_LOG_LEVEL="info" \
    -e USER_DEFINED_TAGS="" \
    -e MGMT_CONSOLE_URL="---CONSOLE-IP---" \
    -e MGMT_CONSOLE_PORT="443" \
    -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
    -e http_proxy="" \
    -e https_proxy="" \
    -e no_proxy="" \
    $ACC/deepfence_agent_ce:2.4.0
```

## Installing and Running the Sensor Agents in a Kubernetes Cluster

:::tip
Refer to the [Kubernetes Installation Instructions](/docs/sensors/kubernetes) along with the modifications below.
:::

You can use these instructions for helm-based installations in standalone and hosted Kubernetes clusters

```bash
helm repo add deepfence https://artifacts.threatmapper.org/helm-charts/threatmapper
helm repo update

helm show values deepfence/deepfence-agent --version 2.4.0 > deepfence_agent_values.yaml

# You will need to update the following values:
#   image:name and image:clusterAgentImageName - change the account to point to your images
#   managementConsoleUrl and deepfenceKey - specify your IP and API key value
vim deepfence_agent_values.yaml

helm install -f deepfence_agent_values.yaml deepfence-agent deepfence/deepfence-agent \
    --namespace deepfence \
    --create-namespace \
    --version 2.4.0
```

Allow a few seconds for the containers to pull and deploy in your Kubernetes environment.

Full instructions can be found in the [Agent helm chart documentation](https://github.com/deepfence/ThreatMapper/tree/main/deployment-scripts/helm-charts/deepfence-agent).

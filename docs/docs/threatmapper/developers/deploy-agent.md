---
title: Deploy ThreatMapper Sensors
---

# Deploy custom ThreatMapper Sensor Agents

You should first [build the management console](Building-Console-and-Sensors-from-Source) and push the images to a suitable repository.  You can then adapt the [standard installation instructions](Installing-the-Sensor-Agents) to refer to your custom sensor images rather than the Deepfence-provided ones.

**Important:** Review the [standard installation instructions](Installing-the-Sensor-Agents) for your selected platform first!


## Installing and Running the Sensor Agents on a Docker Host

Execute the following command to install and start the sensors:

```bash
ACC=myorg             # the name of the dockerhub account 
docker login -u $ACC  # log in to the account

docker run -dit --cpus=".2" --name=deepfence-agent --restart on-failure --pid=host --net=host \
  --privileged=true -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced \
  -v /var/run/docker.sock:/var/run/docker.sock -v /:/fenced/mnt/host/:ro \
  -e USER_DEFINED_TAGS="" -e MGMT_CONSOLE_URL="---CONSOLE-IP---" -e MGMT_CONSOLE_PORT="443" \
  -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
  $ACC/deepfence_agent_ce:latest
```

## Installing and Running the Sensor Agents in a Kubernetes Cluster

You can use these instructions for helm-based installs in standalone and hosted Kubernetes clusters

```bash
helm repo add deepfence https://deepfence-helm-charts.s3.amazonaws.com/threatmapper

helm show values deepfence/deepfence-agent > deepfence_agent_values.yaml

# You will need to update the following values:
#   image:name and image:clusterAgentImageName - change the account to point to your images
#   managementConsoleUrl and deepfenceKey - specify your IP and API key value
vim deepfence_agent_values.yaml

helm install -f deepfence_agent_values.yaml deepfence-agent deepfence/deepfence-agent
```

Allow a few seconds for the containers to pull and deploy in your Kubernetes environment.

Full instructions can be found in the [Agent helm chart documentation](../tree/master/deployment-scripts/helm-charts/deepfence-agent).

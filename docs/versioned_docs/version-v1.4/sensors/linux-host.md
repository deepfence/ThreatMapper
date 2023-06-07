---
title: Linux Host
---

# Linux Host

On a Linux-based bare-metal or virtual machine workload, the ThreatMapper sensor agents are deployed within a lightweight docker runtime which should be installed on the host Linux operating system.

## ThreatMapper Sensor Agents

Install a docker runtime on the Linux host. Refer to the [Prerequisites for the Sensor Agents](/docs/architecture#threatmapper-sensor-containers) for minimum supported platforms.

Run the following command to start the Sensor Agent on the host. You can find the Deepfence API key under
 `Setting>User Management>API Key`.

```bash
docker run -dit --cpus=".2" --name=deepfence-agent \
  --restart on-failure --pid=host --net=host --privileged=true \
  -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced \
  -v /var/run/docker.sock:/var/run/docker.sock -v /:/fenced/mnt/host/:ro \
  -e MGMT_CONSOLE_URL="---CONSOLE-IP---" -e MGMT_CONSOLE_PORT="443" \
  -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
  -e USER_DEFINED_TAGS="" \
  deepfenceio/deepfence_agent_ce:latest
```

Optionally the sensor container can be tagged using ```USER_DEFINED_TAGS=""``` in the above command. Tags should be comma separated, for example, ```"dev,front-end"```.

## Install a named version of the ThreatMapper Sensor

You should seek to ensure that the version number of the sensors matches the version of your Management Console as closely as possible, for best compatibility.

To start a named [tagged release](https://github.com/deepfence/ThreatMapper/releases) of the ThreatMapper sensor, tag the container appropriately:

```bash
# Install tagged release 1.4.3
docker run -dit --cpus=".2" --name=deepfence-agent \
  --restart on-failure --pid=host --net=host --privileged=true \
  -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced \
  -v /var/run/docker.sock:/var/run/docker.sock -v /:/fenced/mnt/host/:ro \
  -e MGMT_CONSOLE_URL="---CONSOLE-IP---" -e MGMT_CONSOLE_PORT="443" \
  -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
  -e USER_DEFINED_TAGS="" \
  deepfenceio/deepfence_agent_ce:1.4.3
```




---
title: Docker
---

# Docker

On a Linux-based Docker host, the ThreatMapper agents are deployed as a lightweight container.

Install a docker runtime on the Linux host. Refer to the [Prerequisites for the Sensor Agents](/docs/architecture#threatmapper-sensor-containers) for minimum supported platforms.

For Windows Server hosts, experimental support exists, but it is not suitable for production use.

## Quick Installation of ThreatMapper Sensors

Install and start the latest release of the deepfence sensor.  Run the following command to start the sensor on the host, replacing the `CONSOLE_URL` and `DEEPFENCE_KEY` values:

```bash
docker run -dit --cpus=".2" --name=deepfence-agent --restart on-failure --pid=host --net=host \
  --privileged=true -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced \
  -v /var/run/docker.sock:/var/run/docker.sock -v /:/fenced/mnt/host/:ro \
  -e MGMT_CONSOLE_URL="---CONSOLE-IP---" -e MGMT_CONSOLE_PORT="443" \
  -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
  deepfenceio/deepfence_agent_ce:latest
```

## Install a named version of the ThreatMapper Sensor

You should seek to ensure that the version number of the sensors matches the version of your Management Console as closely as possible, for best compatibility.

To start a named [tagged release](https://github.com/deepfence/ThreatMapper/releases) of the ThreatMapper sensor, tag the container appropriately:

```bash
# Install tagged release 1.4.3
docker run -dit --cpus=".2" --name=deepfence-agent --restart on-failure --pid=host --net=host \
  --privileged=true -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced \
  -v /var/run/docker.sock:/var/run/docker.sock -v /:/fenced/mnt/host/:ro \
  -e USER_DEFINED_TAGS="" -e MGMT_CONSOLE_URL="---CONSOLE-IP---" -e MGMT_CONSOLE_PORT="443" \
  -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
  deepfenceio/deepfence_agent_ce:1.4.3
```

:::tip
Optionally the sensor container can be further tagged using ```USER_DEFINED_TAGS=""``` in the above command. Tags should be comma separated, for example, ```"dev,front-end"```.
:::


## Upgrade the ThreatMapper Sensors

To upgrade a sensor install, stop the existing sensor and start the new version.




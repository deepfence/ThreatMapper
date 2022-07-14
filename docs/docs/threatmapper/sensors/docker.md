---
title: Docker
---

# Docker

On a Linux-based Docker host, the ThreatMapper agents are deployed as a lightweight container.

## ThreatMapper Console

The ThreatMapper management console is installed separately, following the [installation instructions](Installing-the-Management-Console).

## ThreatMapper Sensors

Run the following command to start the sensor on the host

```
docker run -dit --cpus=".2" --name=deepfence-agent --restart on-failure --pid=host --net=host \
  --privileged=true -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced \
  -v /var/run/docker.sock:/var/run/docker.sock -v /:/fenced/mnt/host/:ro \
  -e USER_DEFINED_TAGS="" -e MGMT_CONSOLE_URL="---CONSOLE-IP---" -e MGMT_CONSOLE_PORT="443" \
  -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
  deepfenceio/deepfence_agent_ce:latest
```

To start a named [tagged release](https://github.com/deepfence/ThreatMapper/releases) of the ThreatMapper sensor, tag the container appropriately:

```
# Install tagged release 1.3.1
docker run -dit --cpus=".2" --name=deepfence-agent --restart on-failure --pid=host --net=host \
  --privileged=true -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced \
  -v /var/run/docker.sock:/var/run/docker.sock -v /:/fenced/mnt/host/:ro \
  -e USER_DEFINED_TAGS="" -e MGMT_CONSOLE_URL="---CONSOLE-IP---" -e MGMT_CONSOLE_PORT="443" \
  -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
  deepfenceio/deepfence_agent_ce:1.3.1
```

To upgrade a sensor install, stop the existing sensor and start the new version.

Optionally the sensor container can be further tagged using ```USER_DEFINED_TAGS=""``` in the above command. Tags should be comma separated, for example, ```"dev,front-end"```.

For Windows Server hosts, experimental support exists but it is not suitable for production use.

---
title: Linux Host
---

# Linux Host

On a Linux-based bare-metal or virtual machine workload, the ThreatMapper sensor agents are deployed within a lightweight docker runtime which should be installed on the host Linux operating system.

## ThreatMapper Sensor Agents

Install a docker runtime on the Linux host. Refer to the [Prerequisites for the Sensor Agents](/docs/v2.0/architecture#threatmapper-sensor-containers) for minimum supported platforms.

Run the following command to start the Sensor Agent on the host. You can find the Deepfence API key under
 `Setting>User Management>API Key`.

```bash
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
    -e USER_DEFINED_TAGS="" \
    -e MGMT_CONSOLE_URL="---CONSOLE-IP---" \
    -e MGMT_CONSOLE_PORT="443" \
    -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
    deepfenceio/deepfence_agent_ce:2.0.1
```

Optionally the sensor container can be tagged using ```USER_DEFINED_TAGS=""``` in the above command. Tags should be comma separated, for example, ```"dev,front-end"```.

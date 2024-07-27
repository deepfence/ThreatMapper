---
title: Docker
---

# Docker

On a Linux-based Docker host, the ThreatMapper agents are deployed as a lightweight container.

Install a docker runtime on the Linux host. Refer to the [Prerequisites for the Sensor Agents](/docs/architecture#threatmapper-sensor-containers) for minimum supported platforms.

For Windows Server hosts, experimental support exists, but it is not suitable for production use.

## Installation of ThreatMapper Sensors

Install and start the latest release of the deepfence sensor.  Run the following command to start the sensor on the host, replacing the `CONSOLE_URL` and `DEEPFENCE_KEY` values:

:::info
Image tag `quay.io/deepfenceio/deepfence_agent_ce:2.2.2-multiarch` is supported in amd64 and arm64/v8 architectures.
:::

### Docker

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
    -e DF_LOG_LEVEL="info" \
    -e USER_DEFINED_TAGS="" \
    -e MGMT_CONSOLE_URL="---CONSOLE-IP---" \
    -e MGMT_CONSOLE_PORT="443" \
    -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
    quay.io/deepfenceio/deepfence_agent_ce:2.2.2
```

### Podman

Podman system service (API service) should be running before deploying the sensor (https://docs.podman.io/en/latest/markdown/podman-system-service.1.html)

```bash
sudo podman run -dit \
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
    -v /run/podman/podman.sock:/run/podman/podman.sock \
    -v /run/systemd/:/run/systemd/ \
    -v /:/fenced/mnt/host/:ro \
    -e DF_LOG_LEVEL="info" \
    -e USER_DEFINED_TAGS="" \
    -e MGMT_CONSOLE_URL="---CONSOLE-IP---" \
    -e MGMT_CONSOLE_PORT="443" \
    -e DEEPFENCE_KEY="---DEEPFENCE-API-KEY---" \
    quay.io/deepfenceio/deepfence_agent_ce:2.2.2
```

:::tip
Optionally the sensor container can be further tagged using ```USER_DEFINED_TAGS=""``` in the above command. Tags should be comma separated, for example, ```"dev,front-end"```.
:::


## Upgrade the ThreatMapper Sensors

To upgrade a sensor install, stop the existing sensor and start the new version.

## Using a Proxy Server with Docker

If ThreatMapper management console is accessed through a proxy server, add the proxy server details to the docker configuration.

Edit the file: `~/.docker/config.json`, and add the following content.  Remember to change the proxy server ip address from 111.111.111.111 to your proxy server ip:

```json
{
    "auths": {
        "https://index.docker.io/v1/": {
            "auth": ""
            }
    },
    "HttpHeaders": {
        "User-Agent": "Docker-Client/19.03.1 (linux)"
    },
    "proxies": {
        "default": {
            "httpProxy": "http://111.111.111.111:8006",
            "httpsProxy": "http://111.111.111.111:8006",
            "noProxy": "localhost,127.0.0.1"
            }
    }
}
```

Restart the docker daemon:

```bash
sudo systemctl restart docker
```

ThreatMapper agent VMs do not require any changes for proxy server.

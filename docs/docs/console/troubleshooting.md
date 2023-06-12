---
title: Troubleshooting
---

## Docker configuration in Amazon Linux / RHEL
In Amazon Linux / RHEL, number of open files per container has to be configured.

```shell
$ cat /etc/sysconfig/docker
# The max number of open files for the daemon itself, and all
# running containers. The default value of 1048576 mirrors the value
# used by the systemd service unit.
DAEMON_MAXFILES=1048576
# Additional startup options for the Docker daemon, for example:
# OPTIONS=” — ip-forward=true — iptables=true”
# By default we limit the number of open files per container
OPTIONS=" — default-ulimit nofile=1024:4096"
```
You can change the desired value as below.
```shell
OPTIONS=" — default-ulimit nofile=1024000:1024000"
```
Restart Docker daemon

## Reset Password

If you have not configured [SES / SMTP](manage-users.md#configuring-google-smtp) and need to reset the password, please follow these steps
- In docker
```shell
docker exec -it deepfence-server bash -c "/usr/local/bin/deepfence_server --reset-password"
```
- In kubernetes
```shell
kubectl exec -it deploy/deepfence-server -c deepfence-server -- bash -c "/usr/local/bin/deepfence_server --reset-password"
```

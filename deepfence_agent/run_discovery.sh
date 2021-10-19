#!/bin/bash

HOSTNAME=${SCOPE_HOSTNAME:-$(hostname)}
PROBE_PROCESSES=${DF_ENABLE_PROCESS_REPORT:-"true"}
PROBE_CONNECTIONS=${DF_ENABLE_CONNECTIONS_REPORT:-"true"}
probe_log_level=${LOG_LEVEL:-info}

# TL;DR: auto-detects container-runtime
# Vessel will autodetect the underlying runtime (docker/containerd)
# and will set the .env with $CONTAINER_RUNTIME and $CRI_ENDPOINT
# TODO: Also autodetect the UDP Socket path for runtime
# ref: https://github.com/deepfence/vessel/blob/main/cmd/vessel/main.go
/usr/local/bin/vessel

# Load .env
if [ -f .env ]
then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

if [[ "$DF_KUBERNETES_ON" == "Y" ]]; then
  if [[ "$CONTAINER_RUNTIME" == "containerd" ]]; then
    env FILEBEAT_CERT_PATH="/etc/filebeat/filebeat.crt" CONSOLE_SERVER="https://$MGMT_CONSOLE_URL:$MGMT_CONSOLE_PORT" SCOPE_HOSTNAME="$HOSTNAME" nice -n -20 /usr/local/discovery/deepfence-discovery --mode=probe --probe.log.level="$probe_log_level" --probe-only --no-app --probe.spy.interval=5s --probe.publish.interval=10s --probe.docker.interval=10s --weave=false --probe.insecure=true --probe.docker=false --probe.cri=true --probe.cri.endpoint="$CRI_ENDPOINT" --probe.kubernetes="true" --probe.kubernetes.role=host --probe.token="$DEEPFENCE_KEY" --probe.processes="$PROBE_PROCESSES" --probe.endpoint.report="$PROBE_CONNECTIONS" "https://$MGMT_CONSOLE_URL:$MGMT_CONSOLE_PORT" >>/var/log/fenced/discovery.logfile 2>&1
  else
    env FILEBEAT_CERT_PATH="/etc/filebeat/filebeat.crt" CONSOLE_SERVER="https://$MGMT_CONSOLE_URL:$MGMT_CONSOLE_PORT" SCOPE_HOSTNAME="$HOSTNAME" nice -n -20 /usr/local/discovery/deepfence-discovery --mode=probe --probe.log.level="$probe_log_level" --probe-only --no-app --probe.spy.interval=5s --probe.publish.interval=10s --probe.docker.interval=10s --weave=false --probe.insecure=true --probe.docker=true --probe.cri=false --probe.kubernetes="true" --probe.kubernetes.role=host --probe.token="$DEEPFENCE_KEY" --probe.processes="$PROBE_PROCESSES" --probe.endpoint.report="$PROBE_CONNECTIONS" "https://$MGMT_CONSOLE_URL:$MGMT_CONSOLE_PORT" >>/var/log/fenced/discovery.logfile 2>&1
  fi
else
  env FILEBEAT_CERT_PATH="/etc/filebeat/filebeat.crt" CONSOLE_SERVER="https://$MGMT_CONSOLE_URL:$MGMT_CONSOLE_PORT" SCOPE_HOSTNAME="$HOSTNAME" nice -n -20 /usr/local/discovery/deepfence-discovery --mode=probe --probe.log.level="$probe_log_level" --probe-only --no-app --weave=false --probe.spy.interval=5s --probe.publish.interval=10s --probe.docker.interval=10s --probe.insecure=true --probe.docker=true --probe.cri=false --probe.token="$DEEPFENCE_KEY" --probe.processes="$PROBE_PROCESSES" --probe.endpoint.report="$PROBE_CONNECTIONS" "https://$MGMT_CONSOLE_URL:$MGMT_CONSOLE_PORT" >>/var/log/fenced/discovery.logfile 2>&1
fi

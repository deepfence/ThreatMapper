#!/bin/bash

HOSTNAME=${SCOPE_HOSTNAME:-$(hostname)}
PROBE_PROCESSES=${DF_ENABLE_PROCESS_REPORT:-"true"}
PROBE_CONNECTIONS=${DF_ENABLE_CONNECTIONS_REPORT:-"true"}
PROBE_TRACKDEPLOADS=${DF_ENABLE_TRACKDEPLOADS:-"false"}
PROBE_LOG_LEVEL=${DF_LOG_LEVEL:-info}

if [[ "$DF_CLUSTER_AGENT" == "true" ]]; then
    exec /home/deepfence/discovery \
        --mode=probe \
        --probe.kubernetes.role=cluster \
        --probe.log.level="$PROBE_LOG_LEVEL" \
        --probe.docker=false \
        --probe.spy.interval=5s \
        --probe.publish.interval=10s \
        --probe.insecure=true \
        --probe.token="$DEEPFENCE_KEY" \
        "https://$MGMT_CONSOLE_URL:$MGMT_CONSOLE_PORT"
    exit 0
fi

export CONTAINER_RUNTIME="unknown"
# TL;DR: auto-detects container-runtime
# Vessel will autodetect the underlying runtime (docker/containerd)
# and will set the .env with $CONTAINER_RUNTIME and $CRI_ENDPOINT
# TODO: Also autodetect the UDP Socket path for runtime
# ref: https://github.com/deepfence/vessel/blob/main/cmd/vessel/main.go
/usr/local/bin/vessel 2> /dev/null

# Load .env
if [ -f .env ]
then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

mgmtConsoleUrl="$MGMT_CONSOLE_URL"
if [ "$MGMT_CONSOLE_PORT" != "" ] && [ "$MGMT_CONSOLE_PORT" != "443" ]; then
  mgmtConsoleUrl="$MGMT_CONSOLE_URL:$MGMT_CONSOLE_PORT"
fi

if [[ "$DF_KUBERNETES_ON" == "Y" ]]; then
  if [[ "$CONTAINER_RUNTIME" == "containerd" ]] || [[ "$CONTAINER_RUNTIME"  = "crio" ]]; then
    exec env FILEBEAT_CERT_PATH="$DF_INSTALL_DIR/etc/filebeat/filebeat.crt" CONSOLE_SERVER="https://$mgmtConsoleUrl" SCOPE_HOSTNAME="$HOSTNAME" nice -n -20 $DF_INSTALL_DIR/usr/local/discovery/deepfence-discovery --mode=probe --probe.log.level="$PROBE_LOG_LEVEL" --probe.spy.interval=5s --probe.publish.interval=10s --probe.docker.interval=10s --probe.insecure=true --probe.docker=false --probe.podman=false --probe.cri=true --probe.cri.endpoint="$CRI_ENDPOINT" --probe.kubernetes="true" --probe.kubernetes.role=host --probe.token="$DEEPFENCE_KEY" --probe.processes="$PROBE_PROCESSES" --probe.endpoint.report="$PROBE_CONNECTIONS" --probe.track.deploads="$PROBE_TRACKDEPLOADS" "https://$mgmtConsoleUrl"
  elif [[ "$CONTAINER_RUNTIME" == "podman" ]]; then
    exec env FILEBEAT_CERT_PATH="$DF_INSTALL_DIR/etc/filebeat/filebeat.crt" CONSOLE_SERVER="https://$mgmtConsoleUrl" SCOPE_HOSTNAME="$HOSTNAME" nice -n -20 $DF_INSTALL_DIR/usr/local/discovery/deepfence-discovery --mode=probe --probe.log.level="$PROBE_LOG_LEVEL" --probe.spy.interval=5s --probe.publish.interval=10s --probe.docker.interval=10s --probe.insecure=true --probe.docker=false --probe.podman=true --probe.podman.endpoint="$CRI_ENDPOINT" --probe.cri=false --probe.kubernetes="true" --probe.kubernetes.role=host --probe.token="$DEEPFENCE_KEY" --probe.processes="$PROBE_PROCESSES" --probe.endpoint.report="$PROBE_CONNECTIONS" --probe.track.deploads="$PROBE_TRACKDEPLOADS" "https://$mgmtConsoleUrl"
  else
    exec env FILEBEAT_CERT_PATH="$DF_INSTALL_DIR/etc/filebeat/filebeat.crt" CONSOLE_SERVER="https://$mgmtConsoleUrl" SCOPE_HOSTNAME="$HOSTNAME" nice -n -20 $DF_INSTALL_DIR/usr/local/discovery/deepfence-discovery --mode=probe --probe.log.level="$PROBE_LOG_LEVEL" --probe.spy.interval=5s --probe.publish.interval=10s --probe.docker.interval=10s --probe.insecure=true --probe.docker=true --probe.podman=false --probe.cri=false --probe.kubernetes="true" --probe.kubernetes.role=host --probe.token="$DEEPFENCE_KEY" --probe.processes="$PROBE_PROCESSES" --probe.endpoint.report="$PROBE_CONNECTIONS" --probe.track.deploads="$PROBE_TRACKDEPLOADS" "https://$mgmtConsoleUrl"
  fi
else
  if [[ "$DF_SERVERLESS" == "true" ]]; then
    exec env FILEBEAT_CERT_PATH="$DF_INSTALL_DIR/etc/filebeat/filebeat.crt" CONSOLE_SERVER="https://$mgmtConsoleUrl" SCOPE_HOSTNAME="$HOSTNAME" nice -n -20 $DF_INSTALL_DIR/usr/local/discovery/deepfence-discovery --mode=probe --probe.log.level="$PROBE_LOG_LEVEL" --probe.spy.interval=5s --probe.publish.interval=10s --probe.docker.interval=10s --probe.insecure=true --probe.docker=false --probe.podman=false --probe.cri=false --probe.token="$DEEPFENCE_KEY" --probe.processes="$PROBE_PROCESSES" --probe.endpoint.report="$PROBE_CONNECTIONS" --probe.conntrack=false --probe.track.deploads="$PROBE_TRACKDEPLOADS" "https://$mgmtConsoleUrl"
  elif [[ "$CONTAINER_RUNTIME" == "podman" ]]; then
    exec env FILEBEAT_CERT_PATH="$DF_INSTALL_DIR/etc/filebeat/filebeat.crt" CONSOLE_SERVER="https://$mgmtConsoleUrl" SCOPE_HOSTNAME="$HOSTNAME" nice -n -20 $DF_INSTALL_DIR/usr/local/discovery/deepfence-discovery --mode=probe --probe.log.level="$PROBE_LOG_LEVEL" --probe.spy.interval=5s --probe.publish.interval=10s --probe.docker.interval=10s --probe.insecure=true --probe.docker=false --probe.podman=true --probe.podman.endpoint="$CRI_ENDPOINT" --probe.cri=false --probe.token="$DEEPFENCE_KEY" --probe.processes="$PROBE_PROCESSES" --probe.endpoint.report="$PROBE_CONNECTIONS" --probe.conntrack=false --probe.track.deploads="$PROBE_TRACKDEPLOADS" "https://$mgmtConsoleUrl"
  elif [[ "$CONTAINER_RUNTIME" == "unknown" ]]; then
    exec env FILEBEAT_CERT_PATH="$DF_INSTALL_DIR/etc/filebeat/filebeat.crt" CONSOLE_SERVER="https://$mgmtConsoleUrl" SCOPE_HOSTNAME="$HOSTNAME" nice -n -20 $DF_INSTALL_DIR/usr/local/discovery/deepfence-discovery --mode=probe --probe.log.level="$PROBE_LOG_LEVEL" --probe.spy.interval=5s --probe.publish.interval=10s --probe.docker.interval=10s --probe.insecure=true --probe.docker=false --probe.podman=false --probe.cri=false --probe.token="$DEEPFENCE_KEY" --probe.processes="$PROBE_PROCESSES" --probe.endpoint.report="$PROBE_CONNECTIONS" --probe.conntrack=false --probe.track.deploads="$PROBE_TRACKDEPLOADS" "https://$mgmtConsoleUrl"
  else
    exec env FILEBEAT_CERT_PATH="$DF_INSTALL_DIR/etc/filebeat/filebeat.crt" CONSOLE_SERVER="https://$mgmtConsoleUrl" SCOPE_HOSTNAME="$HOSTNAME" nice -n -20 $DF_INSTALL_DIR/usr/local/discovery/deepfence-discovery --mode=probe --probe.log.level="$PROBE_LOG_LEVEL" --probe.spy.interval=5s --probe.publish.interval=10s --probe.docker.interval=10s --probe.insecure=true --probe.docker=true --probe.podman=false --probe.cri=false --probe.token="$DEEPFENCE_KEY" --probe.processes="$PROBE_PROCESSES" --probe.endpoint.report="$PROBE_CONNECTIONS" --probe.track.deploads="$PROBE_TRACKDEPLOADS" "https://$mgmtConsoleUrl"
  fi
fi

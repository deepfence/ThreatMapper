#!/bin/bash

/home/deepfence/deepfence_exe \
  --mode=probe \
  --probe.kubernetes.role=cluster \
  --probe.log.level="$PROBE_LOG_LEVEL" \
  --probe.docker=false \
  --probe.spy.interval=5s \
  --probe.publish.interval=10s \
  --probe.insecure=true \
  --probe.token="$DEEPFENCE_KEY" \
  "https://$TOPOLOGY_IP:$TOPOLOGY_PORT"
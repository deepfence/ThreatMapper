#!/bin/sh

if [ "$DEEPFENCE_TELEMETRY_ENABLED" = "true" ]; then
  /go/bin/all-in-one-linux
else
  echo "DEEPFENCE_TELEMETRY_ENABLED is not set to true"
  sleep infinity
fi
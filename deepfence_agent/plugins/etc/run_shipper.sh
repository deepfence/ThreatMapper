#!/bin/bash

export BATCH_SIZE=${1:-100}
export TRUNCATE_SIZE=${2:-10}

if [[ $DF_INSTALL_DIR == "/home/deepfence" ]]; then
  exec /home/deepfence/bin/shipper --base-path="${DF_INSTALL_DIR:-/}" --truncate-size=$TRUNCATE_SIZE --routes=/home/deepfence/routes.yaml --batch-size=$BATCH_SIZE
else
  exec $DF_INSTALL_DIR/home/deepfence/bin/shipper --base-path="${DF_INSTALL_DIR:-/}" --truncate-size=$TRUNCATE_SIZE --routes=$DF_INSTALL_DIR/home/deepfence/routes.yaml --batch-size=$BATCH_SIZE
fi

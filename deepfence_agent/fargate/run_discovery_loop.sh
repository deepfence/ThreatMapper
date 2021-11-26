#!/bin/bash

if  [ "$DF_LOG_LEVEL" == "debug" ]; then
    set -x
fi

echo "Starting discovery...."

# DF_BASE_DIR="/deepfence"
# export PATH=$PATH:$DF_BASE_DIR/bin/
chmod +x $DF_INSTALL_DIR/usr/local/discovery/deepfence-discovery
chmod +x $DF_INSTALL_DIR/home/deepfence/run_discovery*

until bash -x $DF_INSTALL_DIR/home/deepfence/run_discovery.sh 
do
    echo "Discovery crashed with exit code $?.  Restarting discovery...."
    sleep 5
done

echo "Discovery exited with exit code $?."



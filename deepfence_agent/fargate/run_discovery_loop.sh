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
    
    # $DF_BASE_DIR/usr/local/discovery/discovery --mode=probe --probe-only --no-app --weave=false --probe.spy.interval=5s --probe.publish.interval=10s --probe.docker.interval=10s --probe.insecure=true --probe.docker=true --probe.cri=false --probe.token="$DEEPFENCE_KEY" https://$DF_BACKEND_IP:8008 > /dev/null 2>&1

done

echo "Discovery exited with exit code $?."



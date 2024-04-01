#!/deepfence/bin/bash

case $DF_LOG_LEVEL in
debug | info | error)
  echo DF_LOG_LEVEL is valid
  ;;
*)
  echo DF_LOG_LEVEL is not valid, setting to info level
  export DF_LOG_LEVEL="info"
  ;;
esac

if [ "$DF_LOG_LEVEL" == "debug" ]; then
  set -x
fi

export DF_BASE_DIR="/deepfence"

setup_env_paths() {
  export DF_BIN_DIR="$DF_BASE_DIR/bin"
  export PATH=$DF_BIN_DIR::$PATH

  if [[ -z "${SCOPE_HOSTNAME}" ]]; then
    SCOPE_HOSTNAME="$(hostname)"
    export SCOPE_HOSTNAME="$SCOPE_HOSTNAME"
  fi
  if [ "$INSTANCE_ID_SUFFIX" == "Y" ]; then
    cloud_instance_id=$(getCloudInstanceId)
    cloud_instance_id="${cloud_instance_id//[$'\t\r\n ']/}"
    export SCOPE_HOSTNAME="$SCOPE_HOSTNAME-$cloud_instance_id"
  fi
  container_info=$(sed -n '/name=systemd/p' /proc/self/cgroup)
  container_id=$(echo $container_info | cut -d/ -f4 | cut -c1-12,31-)
  if [[ -z "${container_id}" ]]; then
    container_id=$(echo $container_info | cut -d/ -f3 | cut -c1-12)
  fi
  export SCOPE_HOSTNAME="$SCOPE_HOSTNAME-$container_id"

  if [[ -z "${DF_INSTALL_DIR}" ]]; then
    export DF_INSTALL_DIR="$DF_BASE_DIR/df-agents/$SCOPE_HOSTNAME"
  else
    export DF_INSTALL_DIR="$DF_INSTALL_DIR/df-agents/$SCOPE_HOSTNAME"
  fi

  echo "Deepfence agent install dir: $DF_INSTALL_DIR"

  export PATH=$DF_INSTALL_DIR/bin:$DF_INSTALL_DIR/usr/local/bin:$DF_INSTALL_DIR/home/deepfence:$PATH
  echo $PATH

  export FILEBEAT_CERT_PATH="$DF_INSTALL_DIR/etc/filebeat/filebeat.crt"

  export MGMT_CONSOLE_PORT=443
  export DF_TLS_ON="1"
  export SECRET_SCANNER_LD_LIBRARY_PATH=$DF_INSTALL_DIR/home/deepfence/lib:$LD_LIBRARY_PATH
}

deep_copy() {
  #eval source=${1}
  mkdir -p "$(dirname "$2")" && cp -r $1 "$2"
}

launch_discovery() {
  echo "Starting deepfence-agent discovery... with hostname $SCOPE_HOSTNAME"
  bash -x $DF_INSTALL_DIR/home/deepfence/run_discovery_loop.sh &
}

launch_package_scanner() {
  echo "Launching package-scanner grpc server"
  bash -x -c "rm -rf /tmp/package-scanner.sock && $DF_INSTALL_DIR/home/deepfence/package-scanner -socket-path /tmp/package-scanner.sock -mode grpc-server" &
}
# Init hostname, environmental vars and paths
setup_env_paths

# Setup and install DF agent
if [[ "$DF_BASE_DIR" != "$DF_INSTALL_DIR" ]]; then
  mkdir -p $DF_INSTALL_DIR
  echo "Copying agent to DF installation dir"
  deep_copy "$DF_BASE_DIR/bin/*" "$DF_INSTALL_DIR/bin/."
  deep_copy "$DF_BASE_DIR/etc/*" "$DF_INSTALL_DIR/etc/."
  deep_copy "$DF_BASE_DIR/home/*" "$DF_INSTALL_DIR/home/."
  deep_copy "$DF_BASE_DIR/usr/*" "$DF_INSTALL_DIR/usr/."
  deep_copy "$DF_BASE_DIR/var/*" "$DF_INSTALL_DIR/var/."
fi

# To create fenced log and tmp directory
mkdir -p $DF_INSTALL_DIR/var/log/fenced/
chmod +x $DF_INSTALL_DIR/home/deepfence/*.sh

echo "Start Deepfence services... Console is $MGMT_CONSOLE_URL"
launch_package_scanner

echo "Starting discovery logs..." >>$DF_INSTALL_DIR/var/log/fenced/discovery.logfile
launch_discovery

# Wait few seconds for the processes to start, this also excludes unnecessary discovery logs
sleep 2
# Send discovery logs to standard output
tail --follow=name $DF_INSTALL_DIR/var/log/fenced/discovery.logfile | sed 's/^/DF_DISCOVERY: /g' &

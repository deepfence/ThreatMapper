#!/bin/bash

set -x

# Some defaults
export DF_SERVERLESS=${DF_SERVERLESS:-"true"}
export DF_INSTALL_DIR=${DF_INSTALL_DIR:-"/opt/deepfence"}
export DF_BASE_DIR="/deepfence"

deep_copy() {
  #eval source=${1}
  mkdir -p "$(dirname "$2")" && cp -r $1 "$2"
}

setup_env_paths() {
  export DF_BIN_DIR="$DF_BASE_DIR/bin"
  export PATH=$PATH:$DF_BIN_DIR
  echo "PATH is $PATH"

  if [[ -z "${SCOPE_HOSTNAME}" ]]; then
    SCOPE_HOSTNAME="$(hostname)"
    echo "Got hostname: "
    echo "$SCOPE_HOSTNAME"
    export SCOPE_HOSTNAME="$SCOPE_HOSTNAME"
  fi
  if [ "$INSTANCE_ID_SUFFIX" == "Y" ]; then
    cloud_instance_id=$(getCloudInstanceId)
    cloud_instance_id="${cloud_instance_id//[$'\t\r\n ']/}"
    export SCOPE_HOSTNAME="$SCOPE_HOSTNAME-$cloud_instance_id"
  fi
  container_info=$(sed -n '/name=systemd/p' /proc/self/cgroup)
  # echo "Container info: $container_info"
  # container_id=$(echo $container_info | cut -d/ -f4 | cut -c1-12,31-)
  # echo "Container id: $container_id"
  # if [[ -z "${container_id}" ]]; then
  #  container_id=$(echo $container_info | cut -d/ -f3 | cut -c1-12)
  #  echo "updated container id: $container_id"
  # fi
  # export SCOPE_HOSTNAME="$SCOPE_HOSTNAME-$container_id"

  if [[ -z "${DF_INSTALL_DIR}" ]]; then
    export DF_INSTALL_DIR="$DF_BASE_DIR/df-agents/$SCOPE_HOSTNAME"
  else
    export DF_INSTALL_DIR="$DF_INSTALL_DIR/df-agents/$SCOPE_HOSTNAME"
  fi

  echo "Deepfence agent install dir: $DF_INSTALL_DIR"

  export PATH=$PATH:$DF_INSTALL_DIR/bin:$DF_INSTALL_DIR/usr/local/bin:$DF_INSTALL_DIR/home/deepfence:$DF_INSTALL_DIR/usr/bin
  echo "UPDATED PATH is $PATH"

  export FILEBEAT_CERT_PATH="$DF_INSTALL_DIR/etc/filebeat/filebeat.crt"

  export MGMT_CONSOLE_PORT=443
  export DF_TLS_ON="1"
  export SECRET_SCANNER_LD_LIBRARY_PATH=$DF_INSTALL_DIR/home/deepfence/lib:$LD_LIBRARY_PATH
}

trim() {
    local var="$*"
    # remove leading whitespace characters
    var="${var#"${var%%[![:space:]]*}"}"
    # remove trailing whitespace characters
    var="${var%"${var##*[![:space:]]}"}"
    echo -n "$var"
}

echoerr() { echo "$@" 1>&2; }

configure_cron() {
    #Setup cron jobs for misc tasks, it needs to be killed and restarted
    #doesnt work smoothly inside docker!
    service cron start
    chmod 600 $DF_INSTALL_DIR/etc/logrotate.d/fenced_logrotate.conf
    envsubst '${DF_INSTALL_DIR}' <$DF_INSTALL_DIR/etc/logrotate.d/fenced_logrotate.conf >$DF_INSTALL_DIR/etc/logrotate.d/fenced_logrotate_new.conf
    mv $DF_INSTALL_DIR/etc/logrotate.d/fenced_logrotate_new.conf $DF_INSTALL_DIR/etc/logrotate.d/fenced_logrotate.conf

    logrotate_path=$(which logrotate)
    (echo "*/5 * * * * $logrotate_path $DF_INSTALL_DIR/etc/logrotate.d/fenced_logrotate.conf") | crontab -
}

launch_deepfenced() {
    # In k8s, if agent pod restarts these files are not cleared
    rm -rf $DF_INSTALL_DIR/var/log/fenced/* 2>/dev/null
    mkdir -p $DF_INSTALL_DIR/tmp $DF_INSTALL_DIR/var/log/fenced/malware-scan $DF_INSTALL_DIR/var/log/fenced/malware-scan-log $DF_INSTALL_DIR/var/log/fenced/secret-scan $DF_INSTALL_DIR/var/log/fenced/secret-scan-log $DF_INSTALL_DIR/var/log/fenced/compliance $DF_INSTALL_DIR/var/log/fenced/compliance-scan-logs 2>/dev/null
    configure_cron
    if [[ -z "${SCOPE_HOSTNAME}" ]]; then
        SCOPE_HOSTNAME="$(hostname)"
        export SCOPE_HOSTNAME="$SCOPE_HOSTNAME"
    fi
    if [ "$INSTANCE_ID_SUFFIX" == "Y" ]; then
        cloud_instance_id=$($DF_INSTALL_DIR/usr/local/bin/getCloudInstanceId)
        cloud_instance_id="${cloud_instance_id//[$'\t\r\n ']/}"
        export SCOPE_HOSTNAME="$SCOPE_HOSTNAME-$cloud_instance_id"
    fi
    if [ "$DF_PROXY_MODE" == "1" ]; then
        # echo "App security : Active Mode, Listening on port $DF_LISTEN_PORT "
        DOCKER_API_VERSION=$DOCKER_API_VERSION run_dind.sh -a $MGMT_CONSOLE_PORT -s 0
    fi

    export PROBE_LOG_LEVEL=${DF_LOG_LEVEL:-info}

    envsubst '${DEEPFENCE_KEY}:${MGMT_CONSOLE_URL}:${MGMT_CONSOLE_PORT}:${MGMT_CONSOLE_URL_SCHEMA}:${SCOPE_HOSTNAME}:${DF_INSTALL_DIR}' <$DF_INSTALL_DIR/etc/td-agent-bit/fluentbit-agent.conf >$DF_INSTALL_DIR/etc/td-agent-bit/fluentbit-agent-new.conf
    mv $DF_INSTALL_DIR/etc/td-agent-bit/fluentbit-agent-new.conf $DF_INSTALL_DIR/etc/td-agent-bit/fluentbit-agent.conf

    envsubst '${DEEPFENCE_KEY}:${MGMT_CONSOLE_URL}:${MGMT_CONSOLE_PORT}:${MGMT_CONSOLE_URL_SCHEMA}:${SCOPE_HOSTNAME}:${DF_INSTALL_DIR}' <$DF_INSTALL_DIR/etc/td-agent-bit/fluentbit-cluster-agent.conf >$DF_INSTALL_DIR/etc/td-agent-bit/fluentbit-cluster-agent-new.conf
    mv $DF_INSTALL_DIR/etc/td-agent-bit/fluentbit-cluster-agent-new.conf $DF_INSTALL_DIR/etc/td-agent-bit/fluentbit-cluster-agent.conf

    chmod 600 $DF_INSTALL_DIR/etc/td-agent-bit/*

    echo "Starting agent..."
    echo "Deepfence agent install dir: $DF_INSTALL_DIR"
    echo "Deepfence agent base dir: $DF_BASE_DIR"
    echo "Deepfence agent hostname: $SCOPE_HOSTNAME"
    echo "Deepfence management console url: $MGMT_CONSOLE_URL"
    echo "Deepfence management console port: $MGMT_CONSOLE_PORT"
    # $DF_INSTALL_DIR/bin/deepfenced&
    # start in background using nohup
    mkdir -p "$DF_INSTALL_DIR/var/log/supervisor"
    touch "$DF_INSTALL_DIR/var/log/supervisor/deepfenced.log"

    echo "Starting agent ..."
    /bin/sh -c "ulimit -l unlimited; $DF_INSTALL_DIR/bin/deepfenced >> $DF_INSTALL_DIR/var/log/supervisor/deepfenced.log 2>&1"

}

create_cgroups() {
    #    echo "creating cgroups to perform resource-control"
    /bin/sh $DF_INSTALL_DIR/home/deepfence/create-cgroups.sh >/dev/null 2>&1
}

setup_env_paths

# Setup and install DF agent
if [[ "$DF_BASE_DIR" != "$DF_INSTALL_DIR" ]]; then
  mkdir -p $DF_INSTALL_DIR
  echo "Copying agent to DF installation dir"
  deep_copy "$DF_BASE_DIR/bin/*" "$DF_INSTALL_DIR/bin/."
  deep_copy "$DF_BASE_DIR/etc/*" "$DF_INSTALL_DIR/etc/."
  deep_copy "$DF_BASE_DIR/home/*" "$DF_INSTALL_DIR/home/."
  deep_copy "$DF_BASE_DIR/usr/*" "$DF_INSTALL_DIR/usr/."
  deep_copy "$DF_BASE_DIR/opt/*" "$DF_INSTALL_DIR/opt/."
fi

# Make rules.tar.gz
cd $DF_INSTALL_DIR/home/deepfence && $DF_INSTALL_DIR/bin/tar czvf rules.tar.gz rules
cd -

# To create fenced log and tmp directory
mkdir -p $DF_INSTALL_DIR/var/log/fenced/ $DF_INSTALL_DIR/var/log/supervisor/ $DF_INSTALL_DIR/var/log/fenced/coredump
chmod +x $DF_INSTALL_DIR/home/deepfence/*.sh

# for compliance change config
cat $DF_INSTALL_DIR/usr/local/bin/compliance_check/config.json | jq --arg dfinstalldir "$DF_INSTALL_DIR" '.[] |= . + { "files": [ $dfinstalldir + .files[] ] }' > modified_config.json
rm $DF_INSTALL_DIR/usr/local/bin/compliance_check/config.json
mv modified_config.json $DF_INSTALL_DIR/usr/local/bin/compliance_check/config.json

if [ "$DF_USE_DUMMY_SCOPE" == "" ]; then
    pidVal=$(/bin/pidof $DF_INSTALL_DIR/bin/deepfenced)
    if [ -n "$pidVal" ]; then
        echo "Warning: Another bootstrap is running."
    fi
    # create_cgroups
fi

echo "Start Deepfence services... Console is $MGMT_CONSOLE_URL"
launch_deepfenced

sleep 2

tail --follow=name $DF_INSTALL_DIR/var/log/supervisor/deepfenced.log &
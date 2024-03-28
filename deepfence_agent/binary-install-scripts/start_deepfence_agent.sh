#!/bin/bash

export DF_SERVERLESS="true"
export DF_BASE_DIR="/opt/deepfence"
export DF_INSTALL_DIR="/opt/deepfence"
export MGMT_CONSOLE_URL=$MGMT_CONSOLE_URL
export DEEPFENCE_KEY=$DEEPFENCE_KEY

if [[ -z "${DF_BASE_DIR}" ]]; then
    DF_BASE_DIR="/deepfence"
else
    DF_BASE_DIR="${DF_BASE_DIR}"
fi

setup_env_paths() {
    export DF_BIN_DIR="$DF_BASE_DIR/bin"
    export PATH=$DF_BIN_DIR::$PATH

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

    if [[ -z "${DF_INSTALL_DIR}" ]]; then
        export DF_INSTALL_DIR="$DF_BASE_DIR/df-agents/$SCOPE_HOSTNAME"
    else
        export DF_INSTALL_DIR="$DF_INSTALL_DIR/df-agents/$SCOPE_HOSTNAME"
    fi

    echo "Deepfence agent install dir: $DF_INSTALL_DIR"

    export PATH=$DF_INSTALL_DIR/bin:$DF_INSTALL_DIR/usr/local/bin:$DF_INSTALL_DIR/home/deepfence:$PATH
    echo $PATH

    export FILEBEAT_CERT_PATH="/etc/filebeat/filebeat.crt" # no need to put DF_INSTALL_DIR here, deepfenced already prepends it

    export MGMT_CONSOLE_PORT=443
    export DF_TLS_ON="1"
    export SECRET_SCANNER_LD_LIBRARY_PATH=$DF_INSTALL_DIR/home/deepfence/lib:$LD_LIBRARY_PATH
}

setup_env_paths

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
    echo "Deepfence key: $DEEPFENCE_KEY"
    # $DF_INSTALL_DIR/bin/deepfenced&
    # start in background using nohup
    mkdir -p "$DF_INSTALL_DIR/var/log/supervisor"
    touch "$DF_INSTALL_DIR/var/log/supervisor/deepfenced.log"

    $DF_INSTALL_DIR/home/deepfence/start_deepfenced.sh &
}

create_cgroups() {
    #    echo "creating cgroups to perform resource-control"
    /bin/sh $DF_INSTALL_DIR/home/deepfence/create-cgroups.sh >/dev/null 2>&1
}

deep_copy() {
    #eval source=${1}
    mkdir -p "$(dirname "$2")" && cp -r $1 "$2"
}

main() {
    sudo ln -sf bash /bin/sh

    # mounting host file system at /fenced/mnt/host
    sudo ln -s / /fenced/mnt/host

    # Setup and install DF agent
    if [[ "$DF_BASE_DIR" != "$DF_INSTALL_DIR" ]]; then
        mkdir -p $DF_INSTALL_DIR
        echo "Copying agent to DF installation dir"
        deep_copy "$DF_BASE_DIR/bin/*" "$DF_INSTALL_DIR/bin/."
        deep_copy "$DF_BASE_DIR/etc/*" "$DF_INSTALL_DIR/etc/."
        deep_copy "$DF_BASE_DIR/home/*" "$DF_INSTALL_DIR/home/."
        deep_copy "$DF_BASE_DIR/usr/*" "$DF_INSTALL_DIR/usr/."
        deep_copy "$DF_BASE_DIR/var/*" "$DF_INSTALL_DIR/var/."
        deep_copy "$DF_BASE_DIR/opt/*" "$DF_INSTALL_DIR/opt/."
        deep_copy "$DF_BASE_DIR/deepfence/*" "$DF_INSTALL_DIR/deepfence/."
        # deep_copy "$DF_BASE_DIR/tmp/*" "$DF_INSTALL_DIR/tmp/."
    fi

    launch_deepfenced
}

if [ "$DF_USE_DUMMY_SCOPE" == "" ]; then
    pidVal=$(/bin/pidof $DF_INSTALL_DIR/bin/deepfenced)
    if [ -n "$pidVal" ]; then
        echo "Warning: Another bootstrap is running."
    fi
    create_cgroups
fi

main "$@"

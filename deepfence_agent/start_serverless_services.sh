#!/bin/bash

# Some defaults
#PUB_IP=`/usr/bin/dig TXT +short o-o.myaddr.l.google.com @ns1.google.com`
#LOCAL_IP="127.0.0.1"
FEATURE="appsec"
#MODE="passive"
#SERVICE_DISCOVERY="1"
FORENSICS="0"

usage() {
    cat <<EOF
    usage: $0 options

    OPTIONS:
    -c 	    Debug/control mode {none|commit|pause, 0|1|2}, default commit
    -h      Show this message

    Please refer deepfence command line reference guide for more details.

EOF
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

check_options() {

    #if [ "$#" -lt 1 ]; then
    #    usage
    #fi

    # keep these for backwards compatibility
    while getopts "a:c:f:s:h" opt; do
        case $opt in
        h)
            usage
            exit 0
            ;;
        c)
            FORENSICS=$(trim $OPTARG)
            ;;
        *) ;;

        esac
    done
}

launch_system_services() {
    #Setup cron jobs for misc tasks, it needs to be killed and restarted
    #doesnt work smoothly inside docker!
    service cron start >/dev/null &

    chmod 600 /etc/logrotate.d/fenced_logrotate.conf
    #line="0 */2 * * * /usr/sbin/logrotate /etc/logrotate.d/fenced_logrotate.conf"
    #line="0 */1 * * * /usr/sbin/logrotate /etc/logrotate.d/fenced_logrotate.conf"
    line="*/5 * * * * /usr/sbin/logrotate /etc/logrotate.d/fenced_logrotate.conf"
    (echo "$line") | crontab -
    #line="*/5 * * * * sudo rm -rf /tmp/tmpdir-*"
    #(crontab -l; echo "$line" ) | crontab -
    (echo "") | crontab -
}

launch_deepfenced() {

    echo "Start agent authentication..."
    /usr/local/bin/agentAuth
    auth_result=$?
    if [ $auth_result -ne 0 ]; then
        echo "Error: Agent exited. If agent authentication is enabled, check if correct deepfence key is passed."
        sleep 30
        exit 1
    fi
    if [ "$FEATURE" == "appsec" ]; then
        # In k8s, if agent pod restarts these files are not cleared
        rm -rf /var/log/fenced/* 2>/dev/null
        mkdir -p /var/log/fenced/secret-scan-log /var/log/fenced/secret-scan /var/log/fenced/malware-scan /var/log/fenced/malware-scan-log /var/log/fenced/compliance /var/log/fenced/compliance-scan-logs 2>/dev/null
        launch_system_services
        if [[ -z "${SCOPE_HOSTNAME}" ]]; then
            SCOPE_HOSTNAME="$(hostname)"
            export SCOPE_HOSTNAME="$SCOPE_HOSTNAME"
        fi
        if [ "$INSTANCE_ID_SUFFIX" == "Y" ]; then
            cloud_instance_id=$(/usr/local/bin/getCloudInstanceId)
            cloud_instance_id="${cloud_instance_id//[$'\t\r\n ']/}"
            export SCOPE_HOSTNAME="$SCOPE_HOSTNAME-$cloud_instance_id"
        fi
        if [ "$DF_PROXY_MODE" == "1" ]; then
            # echo "App security : Active Mode, Listening on port $DF_LISTEN_PORT "
            DOCKER_API_VERSION=$DOCKER_API_VERSION run_dind.sh -a $MGMT_CONSOLE_PORT -s 0
        fi
        envsubst '${DEEPFENCE_KEY}:${MGMT_CONSOLE_URL}:${MGMT_CONSOLE_PORT}:${SCOPE_HOSTNAME}' </etc/td-agent-bit/td-agent-bit.conf >/etc/td-agent-bit/td-agent-bit-new.conf
        mv /etc/td-agent-bit/td-agent-bit-new.conf /etc/td-agent-bit/td-agent-bit.conf && chmod 600 /etc/td-agent-bit/*
        envsubst '${SCOPE_HOSTNAME}:${MGMT_CONSOLE_URL}:${MGMT_CONSOLE_PORT}' </home/deepfence/supervisord-temp.conf >/home/deepfence/supervisord.conf
        unlink /var/run/supervisor.sock 2>/dev/null
        /usr/bin/supervisord -c /home/deepfence/supervisord.conf
        tail -f /dev/null
    fi
}

create_cgroups() {

    #    echo "creating cgroups to perform resource-control"
    /bin/sh /home/deepfence/create-cgroups.sh >/dev/null 2>&1
}

main() {
    sudo ln -sf bash /bin/sh
    check_options "$@"
    launch_deepfenced
}
pidVal=$(/bin/pidof /usr/local/discovery/deepfence-discovery)
if [ -n "$pidVal" ]; then
    echo "Agent already running. Not going to start"
    exit 0
fi
create_cgroups
main "$@"

#!/bin/bash

usage() {
  cat <<EOF
    usage: $0 options

    OPTIONS:
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
  while getopts "h" opt; do
    case $opt in
    h)
      usage
      exit 0
      ;;
    *) ;;

    esac
  done
}

configure_cron() {
  #Setup cron jobs for misc tasks, it needs to be killed and restarted
  #doesnt work smoothly inside docker!
  service cron start
  chmod 600 /etc/logrotate.d/fenced_logrotate.conf
  (echo "*/5 * * * * /usr/sbin/logrotate /etc/logrotate.d/fenced_logrotate.conf") | crontab -
}

launch_deepfenced() {
  # In k8s, if agent pod restarts these files are not cleared
  rm -rf /var/log/fenced/* 2>/dev/null
  mkdir -p /var/log/fenced/malware-scan /var/log/fenced/malware-scan-log /var/log/fenced/secret-scan /var/log/fenced/secret-scan-log /var/log/fenced/compliance /var/log/fenced/compliance-scan-logs 2>/dev/null
  configure_cron
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

  export PROBE_LOG_LEVEL=${LOG_LEVEL:-info}

  envsubst '${DEEPFENCE_KEY}:${MGMT_CONSOLE_URL}:${MGMT_CONSOLE_PORT}:${MGMT_CONSOLE_URL_SCHEMA}:${SCOPE_HOSTNAME}' </etc/td-agent-bit/fluentbit-agent.conf >/etc/td-agent-bit/fluentbit-agent-new.conf
  mv /etc/td-agent-bit/fluentbit-agent-new.conf /etc/td-agent-bit/fluentbit-agent.conf

  envsubst '${DEEPFENCE_KEY}:${MGMT_CONSOLE_URL}:${MGMT_CONSOLE_PORT}:${MGMT_CONSOLE_URL_SCHEMA}:${SCOPE_HOSTNAME}' </etc/td-agent-bit/fluentbit-cluster-agent.conf >/etc/td-agent-bit/fluentbit-cluster-agent-new.conf
  mv /etc/td-agent-bit/fluentbit-cluster-agent-new.conf /etc/td-agent-bit/fluentbit-cluster-agent.conf

  chmod 600 /etc/td-agent-bit/*

  unlink /var/run/supervisor.sock 2>/dev/null
  /usr/bin/supervisord -c /home/deepfence/supervisord.conf

  echo "Starting agent"
  until [[ "$(ls /var/log/supervisor/deepfenced* 2>/dev/null | wc -w)" != "0" ]]; do
    sleep 5
  done
  tail -f /var/log/supervisor/deepfenced*
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

if [ "$DF_USE_DUMMY_SCOPE" == "" ]; then
  pidVal=$(/bin/pidof /bin/deepfenced)
  if [ -n "$pidVal" ]; then
    echo "Warning: Another bootstrap is running."
  fi
  create_cgroups
fi

main "$@"

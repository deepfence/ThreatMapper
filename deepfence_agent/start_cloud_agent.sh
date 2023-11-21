#!/bin/bash

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
  chmod 600 /etc/logrotate.d/fenced_logrotate.conf
  (echo "*/5 * * * * /usr/sbin/logrotate /etc/logrotate.d/fenced_logrotate.conf") | crontab -
}

launch_deepfenced() {
  # In k8s, if agent pod restarts these files are not cleared
  configure_cron

  unlink /var/run/supervisor.sock 2>/dev/null
  /usr/bin/supervisord -c /home/deepfence/supervisord.conf

  echo "Starting cloud agent"
  until [[ "$(ls /var/log/supervisor/deepfenced* 2>/dev/null | wc -w)" != "0" ]]; do
    sleep 5
  done
  tail -f /var/log/supervisor/deepfenced*
}

main() {
  sudo ln -sf bash /bin/sh
  launch_deepfenced
}

main "$@"

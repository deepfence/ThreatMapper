#!/bin/bash

readonly RSYSLOG_PID="/var/run/rsyslogd.pid"

start_rsyslog() {
  rm -f $RSYSLOG_PID
  rsyslogd -n 2>&1
}

start_crond() {
  chmod 644 /etc/logrotate.d/haproxy
  (crontab -l; echo "*/10 * * * * /usr/sbin/logrotate -vf /etc/logrotate.conf" ) | crontab -
  crond
}

cat /usr/local/etc/haproxy/deepfence.crt /usr/local/etc/haproxy/deepfence.key > /usr/local/etc/haproxy/deepfence.pem

# Override default cert files by copying user provided certificates for nginx (if present)
# the provided filenames should have .key and .crt extensions
CERTIFICATE_DIR="/etc/deepfence/certs"
if [[ -d ${CERTIFICATE_DIR} && -n "$(ls -i ${CERTIFICATE_DIR})" ]]; then
  key=$(ls ${CERTIFICATE_DIR}/*.key 2>/dev/null)
  crt=$(ls ${CERTIFICATE_DIR}/*.crt 2>/dev/null)
  if [[ -n ${key} && -n ${crt} ]]; then
    cat "${crt}" > /usr/local/etc/haproxy/deepfence.pem
    echo \ >> /usr/local/etc/haproxy/deepfence.pem
    cat "${key}" >> /usr/local/etc/haproxy/deepfence.pem
  fi
fi

# first arg is `-f` or `--some-option`
if [[ "${1#-}" != "$1" ]]; then
	set -- haproxy "$@"
fi

if [[ "$1" = 'haproxy' ]]; then
	shift # "haproxy"
	# if the user wants "haproxy", let's add a couple useful flags
	#   -W  -- "master-worker mode" (similar to the old "haproxy-systemd-wrapper"; allows for reload via "SIGUSR2")
	#   -db -- disables background mode
	#   -q  -- disables logging
	set -- haproxy -W -q -db "$@"
fi

until curl -s "http://deepfence-api:9998/deepfence/v1.5/ping" > /dev/null; do
  echo "Waiting for containers to start up"
  sleep 15
done

echo "Starting router"

start_rsyslog &
start_crond &
exec "$@"

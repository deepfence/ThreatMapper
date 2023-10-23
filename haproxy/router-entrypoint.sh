#!/bin/bash

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
	set -- haproxy -W -db "$@"
fi

until curl -s "http://${API_SERVICE_HOST}:${API_SERVICE_PORT}/deepfence/ping" > /dev/null; do
  echo "Waiting for containers to start up"
  sleep 15
done

echo "Starting router"
exec "$@"

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
	set -- haproxy -W -q -db "$@"
fi

# create string for multiple sp backends
sp_backend_str=""
SP_REPLICAS=0

if [ -z "$STREAMPROCESSOR_REPLICATION_FACTOR" ]; then
	SP_REPLICAS=1
else
	SP_REPLICAS=$STREAMPROCESSOR_REPLICATION_FACTOR
fi

if [ "$SP_REPLICAS" = 0 ]; then
	echo "Non-zero number of streamprocessor replicas required. Exiting..."
	exit 1
elif [ "$SP_REPLICAS" = 1 ]; then
	if [ "$OPERATING_MODE" = "docker" ]; then
		sp_backend_str="server s0 deepfence-streamprocessor-0:8010\n"
	elif [ "$OPERATING_MODE" = "k8s" ]; then
		sp_backend_str="server s0 deepfence-streamprocessor-0.deepfence-streamprocessor:8010\n"
	else
		echo "Set operating_mode to either 'docker' or 'k8s'. Exiting..."
		exit 1
	fi
else
	sp_backend_str="balance roundrobin\n"
	if [ "$OPERATING_MODE" = "docker" ]; then
		for ((i=0; i < $SP_REPLICAS; i++)); do
			sp_backend_str+="    server s$i deepfence-streamprocessor-$i:8010 check\n"
		done
	elif [ "$OPERATING_MODE" = "k8s" ]; then
		for ((i=0; i < $SP_REPLICAS; i++)); do
			sp_backend_str+="    server s$i deepfence-streamprocessor-$i.deepfence-streamprocessor:8010 check\n"
		done
	else
		echo "Set operating_mode to either 'docker' or 'k8s'. Exiting..."
		exit 1
	fi
fi

sed -i "s/SP_BACKEND_INFO/${sp_backend_str}/g" /usr/local/etc/haproxy/haproxy.cfg

until curl -s "http://deepfence-api:9997/ping" > /dev/null; do
  echo "Waiting for containers to start up"
  sleep 15
done

echo "Starting router"

exec "$@"

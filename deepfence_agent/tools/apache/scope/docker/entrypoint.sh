#!/bin/bash

export PROBE_LOG_LEVEL=${LOG_LEVEL:-info}
envsubst '${SCOPE_HOSTNAME}:${PROBE_LOG_LEVEL}:${MGMT_CONSOLE_URL}:${MGMT_CONSOLE_PORT}' </home/deepfence/supervisord-temp.conf >/home/deepfence/supervisord.conf
unlink /var/run/supervisor.sock 2>/dev/null
/usr/bin/supervisord -c /home/deepfence/supervisord.conf

touch /var/log/supervisor/cluster-agent.log
tail -f /var/log/supervisor/cluster-agent*

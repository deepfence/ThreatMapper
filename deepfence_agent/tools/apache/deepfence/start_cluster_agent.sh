envsubst '${SCOPE_HOSTNAME}:${MGMT_CONSOLE_URL}:${MGMT_CONSOLE_PORT}' </home/deepfence/supervisord-temp.conf >/home/deepfence/supervisord.conf
unlink /var/run/supervisor.sock 2>/dev/null
/usr/bin/supervisord -c /home/deepfence/supervisord.conf
/home/deepfence/deepfence_exe

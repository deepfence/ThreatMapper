#! /bin/bash

# This sleep is to accommodate slow startup of deepfence-postgres container
sleep 60
until psql "host=${POSTGRES_USER_DB_HOST} port=${POSTGRES_USER_DB_PORT} sslmode=${POSTGRES_USER_DB_SSLMODE} user=${POSTGRES_USER_DB_USER} password=${POSTGRES_USER_DB_PASSWORD} dbname=${POSTGRES_USER_DB_NAME}" -c '\l'; do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done
sysctl -w fs.file-max=1048576
sysctl -w fs.nr_open=1048576
sysctl -w net.core.somaxconn=10240
sysctl -w net.ipv4.tcp_mem="1048576 1048576 1048576"
sysctl -w net.ipv4.tcp_max_syn_backlog=1024
sysctl -w net.ipv4.ip_local_port_range="1024 65534"
chmod 644 /app/code/logrotate.conf
touch /var/spool/cron/crontabs/root
line="*/5 * * * * /usr/sbin/logrotate /app/code/logrotate.conf"
(crontab -l; echo "$line" ) | crontab -
service cron restart
# Start supervisor
/usr/local/bin/supervisord -c /etc/supervisor/supervisord.conf -n

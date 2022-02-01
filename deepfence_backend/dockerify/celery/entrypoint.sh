#! /bin/bash

# This sleep is to accommodate slow startup of deepfence-postgres container
sleep 60

until psql "host=${POSTGRES_USER_DB_HOST} port=${POSTGRES_USER_DB_PORT} sslmode=${POSTGRES_USER_DB_SSLMODE} user=${POSTGRES_USER_DB_USER} password=${POSTGRES_USER_DB_PASSWORD} dbname=${POSTGRES_USER_DB_NAME}" -c '\l'; do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done

sleep 10

chmod 644 /app/code/logrotate.conf
touch /var/spool/cron/crontabs/root
line="*/5 * * * * /usr/sbin/logrotate /app/code/logrotate.conf"
(crontab -l; echo "$line" ) | crontab -
service cron restart
export VULNERABILITY_SCAN_CONCURRENCY=${VULNERABILITY_SCAN_CONCURRENCY:-10}
if [ -f /app/code/supervisor_conf_celery/celery-vulnerability-scan-worker.conf ]; then
    envsubst '${VULNERABILITY_SCAN_CONCURRENCY}' < /app/code/supervisor_conf_celery/celery-vulnerability-scan-worker.conf > /app/code/supervisor_conf_celery/celery-vulnerability-worker.conf
    rm -f /app/code/supervisor_conf_celery/celery-vulnerability-scan-worker.conf
fi
# Start supervisor
/usr/local/bin/supervisord -c /etc/supervisor/supervisord_celery.conf -n

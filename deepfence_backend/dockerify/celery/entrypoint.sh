#! /bin/bash

# This sleep is to accommodate slow startup of deepfence-postgres container
sleep 60

until pg_isready -h "${POSTGRES_USER_DB_HOST}" -p "${POSTGRES_USER_DB_PORT}" -U "${POSTGRES_USER_DB_USER}" -d "${POSTGRES_USER_DB_NAME}"; do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done

sleep 10

chmod 644 /app/code/logrotate.conf
touch /var/spool/cron/crontabs/root
line="*/5 * * * * /usr/sbin/logrotate /app/code/logrotate.conf"
(crontab -l; echo "$line" ) | crontab -
service cron restart
export VULNERABILITY_SCAN_CONCURRENCY=${VULNERABILITY_SCAN_CONCURRENCY:-25}
if [ -f /app/code/supervisor_conf_celery/celery-vulnerability-scan-worker.conf ]; then
    envsubst '${VULNERABILITY_SCAN_CONCURRENCY}' < /app/code/supervisor_conf_celery/celery-vulnerability-scan-worker.conf > /app/code/supervisor_conf_celery/celery-vulnerability-worker.conf
    rm -f /app/code/supervisor_conf_celery/celery-vulnerability-scan-worker.conf
fi

if [ -f /app/code/supervisor_conf_celery/celery-vulnerability-scan-worker-priority.conf ]; then
    envsubst '${VULNERABILITY_SCAN_CONCURRENCY}' < /app/code/supervisor_conf_celery/celery-vulnerability-scan-worker-priority.conf > /app/code/supervisor_conf_celery/celery-vulnerability-worker-priority.conf
    rm -f /app/code/supervisor_conf_celery/celery-vulnerability-scan-worker-priority.conf
fi
# Start supervisor
/usr/local/bin/supervisord -c /etc/supervisor/supervisord_celery.conf -n
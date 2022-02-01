#! /bin/bash

set -e

cd /app/code

until curl "http://$ELASTICSEARCH_HOST:$ELASTICSEARCH_PORT"; do
  echo >&2 "Elastic search is unavailable - sleeping"
  sleep 5
done

dockerify/api/init_es_config.sh

sleep 10

until psql "host=${POSTGRES_USER_DB_HOST} port=${POSTGRES_USER_DB_PORT} sslmode=${POSTGRES_USER_DB_SSLMODE} user=${POSTGRES_USER_DB_USER} password=${POSTGRES_USER_DB_PASSWORD} dbname=${POSTGRES_USER_DB_NAME}" -c '\l'; do
  echo >&2 "Postgres is unavailable - sleeping"
  sleep 5
done

#Even after postgres is available we see that sometimes DB is not ready.
#Sleep for a bit here
sleep 30

# Enable below to generate alembic scripts
# flask db stamp head
# flask db migrate

# Apply migrations
flask db upgrade

# Intialize
mkdir -p /data
flask initialize

mkdir -p /tmp/flask-external /tmp/flask-internal

/usr/local/bin/supervisord -c /etc/supervisor/supervisord_api.conf

gunicorn -k gevent --worker-tmp-dir /tmp/flask-external --bind 0.0.0.0:9998 --reload config.app:app

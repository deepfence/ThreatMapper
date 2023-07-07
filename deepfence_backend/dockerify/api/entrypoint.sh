#! /bin/bash

set -e

set_es_user_creds() {
  basicAuth=""
    if [ -n "$ELASTICSEARCH_USER" ] && [ -n "$ELASTICSEARCH_PASSWORD" ]; then
      basicAuth="$ELASTICSEARCH_USER:$ELASTICSEARCH_PASSWORD@"
    fi
}

cd /app/code

set_es_user_creds
until curl --fail "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}"; do
  echo >&2 "Elastic search is unavailable - sleeping"
  sleep 5
done

dockerify/api/init_es_config.sh

sleep 10

until pg_isready -h "${POSTGRES_USER_DB_HOST}" -p "${POSTGRES_USER_DB_PORT}" -U "${POSTGRES_USER_DB_USER}" -d "${POSTGRES_USER_DB_NAME}"; do
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
flask migrate-sbom-es-index

mkdir -p /tmp/flask-external /tmp/flask-internal

/usr/local/bin/supervisord -c /etc/supervisor/supervisord_api.conf

gunicorn -k gevent --worker-tmp-dir /tmp/flask-external --bind 0.0.0.0:9998 --reload config.app:app

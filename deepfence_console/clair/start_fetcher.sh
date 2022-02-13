#!/bin/bash

if [ ! -v DF_PROG_NAME ]; then
  echo "Environment variable DF_PROG_NAME not set. It has to be a string"
  exit 0
fi

if [ -d "/data" ]; then
  mkdir -p /data/$DF_PROG_NAME/data
  rm -rf /tmp
  ln -s /data/$DF_PROG_NAME/data /tmp
  #Remove any data leftover from previous runs. Somehow this does not work from inside golang
  #Also, this ia a very very ugly hack....
  rm -rf /tmp/nvd-data*
  rm -rf /tmp/ubuntu-cve-tracker*
  rm -rf /tmp/alpine-secdb*
fi

# v6.0.0: Updated database schema; this is a breaking change and anyone using an external database or those whom
#specify the data directory will need recreate the database
rm -rf /data/owasp-data/

/usr/local/bin/update-owasp.sh &

sleep 30
pg_running=1

while [ $pg_running != 0 ]; do
  echo "Running the postgres check"
  /usr/local/bin/check-postgres
  pg_running=$(echo $?)
  echo "Return value is " $pg_running
  if [ $pg_running != 0 ]; then
    sleep 5
  fi
done

/usr/bin/supervisord

line="0 */4 * * * /usr/local/bin/update-owasp.sh"
(
  crontab -l
  echo "$line"
) | crontab -
/usr/sbin/crond

echo "Clearing out stale caches"
/bin/bash /usr/local/bin/clear-cache.sh

echo "Starting Deepfence Vulnerability fetchers"
sleep 10
envsubst '${POSTGRES_FETCHER_DB_HOST}:${POSTGRES_FETCHER_DB_PORT}:${POSTGRES_FETCHER_DB_SSLMODE}:${POSTGRES_FETCHER_DB_USER}:${POSTGRES_FETCHER_DB_PASSWORD}:${POSTGRES_FETCHER_DB_NAME}' </etc/fetcher/config-temp.yml >/etc/fetcher/config.yml
/usr/bin/cvecheck -config /etc/fetcher/config.yml

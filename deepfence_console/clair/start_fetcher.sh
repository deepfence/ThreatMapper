#!/bin/bash

if [ ! -v DF_PROG_NAME ]; then
  echo "Environment variable DF_PROG_NAME not set. It has to be a string"
  exit 0
fi

if [ -d "/data" ]; then
  mkdir -p /data/$DF_PROG_NAME/data
  rm -rf /tmp
  ln -s /data/$DF_PROG_NAME/data /tmp
fi

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

/usr/local/bin/fetcher-server
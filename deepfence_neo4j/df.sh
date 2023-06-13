#!/bin/sh

# Waker
{
  set -e
  while true
  do
    # default: every 3h
    sleep ${BACKUP_TIME:-10800}
    echo "Send signal"
    kill -USR1 $$
  done
}&

trap backup_db USR1

backup_db() {
    echo "Start backup"
    trap '' USR1
    neo4j stop
    NOW=$(date +"%Y-%m-%d_%H-%M-%S")
    neo4j-admin dump --database=neo4j --to="/backups/neo4j_$NOW.dump"
    ls -tr /backups/* | head -n -${MAX_NUM_BACKUPS:-5} | xargs --no-run-if-empty rm
    start_db
    trap backup_db USR1
}

start_db() {
    /startup/docker-entrypoint.sh neo4j&
}

if [ -z "$USE_BACKUP" ]
then
    echo "Start without backup"
else
    if [ -e $USE_BACKUP.used ]
    then
        echo "Backup already loaded, skipping"
    else
        echo "Start using backup: $USE_BACKUP"
        neo4j-admin load --database=neo4j --from=$USE_BACKUP --force
        mv $USE_BACKUP $USE_BACKUP.used
    fi
fi

start_db

while true
do
    sleep 60
done

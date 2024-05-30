#!/bin/sh

export RCLONE_S3_ACCESS_KEY_ID=$AWS_ACCESS_KEY
export RCLONE_S3_SECRET_ACCESS_KEY=$AWS_SECRET_KEY
export PROVIDER="s3"

if [ -z "$DEEPFENCE_NEO4J_USER" ]; then
    export DEEPFENCE_NEO4J_USER="neo4j"
fi
if [ -z "$DEEPFENCE_NEO4J_PASSWORD" ]; then
    export DEEPFENCE_NEO4J_PASSWORD="e16908ffa5b9f8e9d4ed"
fi
if [ -z "$NEO4J_AUTH" ]; then
    export NEO4J_AUTH=$DEEPFENCE_NEO4J_USER/$DEEPFENCE_NEO4J_PASSWORD
fi

if [ "$OFFLINE_MAINTENANCE_MODE_ENABLED" = true ]; then
    while true;
    do
        echo 'Neo4j is not running. Remove OFFLINE_MAINTENANCE_MODE_ENABLED env var or set offlineMaintenanceModeEnabled to false to resume normal operation.';
        sleep 60;
    done
fi

# Waker
{
  set -e
  while true
  do
    # default: every 10h
    sleep ${BACKUP_TIME:-36000}
    echo "Send signal"
    kill -USR1 $$
  done
}&

trap backup_db USR1

# Cleans up stall state if any.
# This helps in case neo4j was stopped via container kill or restart
neo4j status

backup_db() {
    echo "Start backup"
    trap '' USR1
    touch /backups/.inprogress
    neo4j stop
    NOW=$(date +"%Y-%m-%d_%H-%M-%S")
    neo4j-admin database dump neo4j --to-stdout > /backups/neo4j_$NOW.dump
    ls -tr /backups/*.dump | head -n -${MAX_NUM_BACKUPS:-5} | xargs --no-run-if-empty rm
    start_db
    rm /backups/.inprogress
    if [ -n "$DF_REMOTE_BACKUP_ROOT" ]
    then
        rclone sync /backups :$PROVIDER:$DF_REMOTE_BACKUP_ROOT --include "*.dump"
    fi
    trap backup_db USR1
}

start_db() {
    /startup/docker-entrypoint.sh neo4j&
}

if [ -n "$DF_REMOTE_BACKUP_ROOT" ]
then
    rclone sync :$PROVIDER:$DF_REMOTE_BACKUP_ROOT /backups
fi

if [ -z "$USE_BACKUP" ]
then
    echo "Start without backup"
else
    if [ -e $USE_BACKUP.used ]
    then
        echo "Backup already loaded, skipping"
    else
        echo "Start using backup: $USE_BACKUP"
        cat $USE_BACKUP | neo4j-admin database load --from-stdin neo4j --overwrite-destination=true
        mv $USE_BACKUP $USE_BACKUP.used
    fi
fi

start_db

while true
do
    sleep 60
done

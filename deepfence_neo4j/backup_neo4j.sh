#!/bin/bash

dt=$(date '+%Y-%m-%d_%H-%M-%S');
BACKUP_FILE="/backups/neo4j_backup_"$dt

echo "Backup file is:$BACKUP_FILE"

mkdir -p /backups/

neo4j stop
retVal=$?
if [ $retVal -ne 0 ]; then
    echo "Failed to stop the neo4j db"
    exit
fi

neo4j-admin dump --database='neo4j' --to=$BACKUP_FILE
retVal=$?
if [ $retVal -ne 0 ]; then
    echo "Failed to create the backup file"
fi                             

sleep 2s
/startup/docker-entrypoint.sh neo4j >& /dev/null&

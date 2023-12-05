#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Missing input parameters"
    echo "Correct usage:"$0" <BACKUP_FILE_FULL_PATH>"
    exit
fi

BACKUP_FILE=$1
echo "Using file for db restore: $BACKUP_FILE"

neo4j stop
retVal=$?
if [ $retVal -ne 0 ]; then
    echo "Failed to stop the neo4j db"
    exit
fi

neo4j-admin load --from=$BACKUP_FILE --database='neo4j' --force
retVal=$?
if [ $retVal -ne 0 ]; then
    echo "Failed to load the db file"
fi

/startup/docker-entrypoint.sh neo4j >& /dev/null&
sleep 2s

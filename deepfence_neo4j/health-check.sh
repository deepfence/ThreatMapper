#!/bin/sh

nc -z -v -w5 localhost 7687
if [ $? -eq 0 ]; then
    echo 'Neo4j is running'
    exit 0
else
    if ! [ -f /backups/.inprogress ]; then
        echo "Neo4j not running, Database backup is not running"
        exit 1
    else
        echo "Neo4j not running, Database backup is in-progress"
        exit 0
    fi
fi
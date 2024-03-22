#!/bin/bash

set -e

NEO4J_MAJOR_VERSION=`neo4j version | cut -d" " -f2 | cut -d. -f1`

echo "neo4j version: $NEO4J_MAJOR_VERSION"

if [ "$NEO4J_MAJOR_VERSION" == "5" ]
then

    # check if migration is required
    if [ -e /backups/migrations/.migrate ]
    then
        echo "database migration required for new version"

        neo4j stop

        neo4j-admin database load --expand-commands neo4j --from-path=/backups/migrations/ --overwrite-destination=true

        neo4j-admin database migrate neo4j --force-btree-indexes-to-range

        neo4j start

        rm /backups/migrations/.migrate

        echo "migration complete"
    else
        echo "skip migration already completed"
    fi

else
    echo "no migration required"
fi
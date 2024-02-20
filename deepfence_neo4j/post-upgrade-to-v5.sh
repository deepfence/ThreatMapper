#!/bin/bash

set -e

neo4j stop

mkdir -p /backups/migrations

neo4j-admin database load --expand-commands neo4j --from-path=/backups/migrations/ --overwrite-destination=true

neo4j-admin database migrate neo4j --force-btree-indexes-to-range

neo4j start
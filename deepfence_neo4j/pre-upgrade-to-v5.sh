#!/bin/bash

set -e

neo4j stop

mkdir -p /backups/migrations

neo4j-admin dump --expand-commands --database=system --to /backups/migrations/system.dump 

neo4j-admin dump --expand-commands --database=neo4j --to /backups/migrations/neo4j.dump

rm -rf /data/databases/* /data/transactions/*
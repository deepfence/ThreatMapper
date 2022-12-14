#!/bin/bash

set -e
set -u


function create_user_and_database() {
	local database=$1
	echo "  Creating user and database '$database'"
	psql --username "$DEEPFENCE_POSTGRES_USER" <<-EOSQL
	    CREATE USER $database;
	    CREATE DATABASE $database;
	    GRANT ALL PRIVILEGES ON DATABASE $database TO $database;
EOSQL
}

if [ -n "$DEEPFENCE_POSTGRES_MULTIPLE_DATABASES" ]; then
	echo "Multiple database creation requested: $DEEPFENCE_POSTGRES_MULTIPLE_DATABASES"
	for db in $(echo $DEEPFENCE_POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
		create_user_and_database $db
	done
	echo "Multiple databases created"
fi

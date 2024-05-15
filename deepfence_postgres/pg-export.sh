#!/bin/bash

env PGPASSWORD="$DEEPFENCE_POSTGRES_USER_DB_PASSWORD" \
    pg_dump "host=$DEEPFENCE_POSTGRES_USER_DB_HOST port=$DEEPFENCE_POSTGRES_USER_DB_PORT user=$DEEPFENCE_POSTGRES_USER_DB_USER dbname=$DEEPFENCE_POSTGRES_USER_DB_NAME sslmode=$DEEPFENCE_POSTGRES_USER_DB_SSLMODE" \
    -f /data/pg_data.dump

echo "Postgres backup saved to the file /data/pg_data.dump"
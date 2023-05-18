---
title: Database Export and Import
---

Export Elasticsearch and PostgreSQL data from one management console and import in another console

## Export

Connect to old management console / database, run following commands to export

```shell
mkdir deepfence_export
cd deepfence_export

docker run --net=host --rm=true --name=elasticsearch-backup \
  -v "$(pwd)":/data:rw \
  --entrypoint=/usr/local/bin/es-export.sh \
  -e EXPORT_ELASTICSEARCH_MAPPING="false" \
  -e ELASTICSEARCH_SCHEME="http" \
  -e ELASTICSEARCH_HOST="127.0.0.1" \
  -e ELASTICSEARCH_PORT="9200" \
  -e ELASTICSEARCH_USER="" \
  -e ELASTICSEARCH_PASSWORD="" \
  deepfenceio/deepfence_backup:latest

docker run --net=host --rm=true --name=postgresql-backup \
  -v "$(pwd)":/data:rw \
  --entrypoint=/usr/local/bin/pg-export.sh \
  -e POSTGRES_DB_HOST="127.0.0.1" \
  -e POSTGRES_DB_PORT="5432" \
  -e POSTGRES_DB_NAME=users \
  -e POSTGRES_DB_USERNAME="" \
  -e POSTGRES_DB_PASSWORD="" \
  deepfenceio/deepfence_backup:latest
```

## Migrate (Major version upgrade, for elasticsearch)

This step is required when the user is upgrading Deepfence Management Console to a major release. It can be skipped in other cases.

- Take a copy of backup files
```shell
cd ../
cp -r deepfence_backup deepfence_backup_copy
cd deepfence_backup
```
- Migrate elasticsearch data
```shell
docker run --net=host --rm=true --name=es-migrate \
  -v ${PWD}:/data:rw \
  --entrypoint=python3 \
  deepfenceio/deepfence_backup:latest \
  /usr/local/migrate_es.py
```
- `es_data.json.gz` is overwritten with new migrated data

## Import

Connect to new management console / database, run following commands to import

```shell
docker run --net=host --rm=true --name=elasticsearch-restore \
  -v "$(pwd)":/data:rw \
  --entrypoint=/usr/local/bin/es-import.sh \
  -e IMPORT_ELASTICSEARCH_MAPPING="false" \
  -e ELASTICSEARCH_SCHEME="http" \
  -e ELASTICSEARCH_HOST="127.0.0.1" \
  -e ELASTICSEARCH_PORT="9200" \
  -e ELASTICSEARCH_USER="" \
  -e ELASTICSEARCH_PASSWORD="" \
  deepfenceio/deepfence_backup:latest

docker run --net=host --rm=true --name=postgresql-restore \
  -v "$(pwd)":/data:rw \
  --entrypoint=/usr/local/bin/pg-import.sh \
  -e POSTGRES_DB_HOST="127.0.0.1" \
  -e POSTGRES_DB_PORT="5432" \
  -e POSTGRES_DB_NAME=users \
  -e POSTGRES_DB_USERNAME="" \
  -e POSTGRES_DB_PASSWORD="" \
  deepfenceio/deepfence_backup:latest
```
- Restart management console once

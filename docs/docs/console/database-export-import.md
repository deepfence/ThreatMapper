---
title: Database Export and Import
---

Export PostgreSQL data from one management console and import in another console

## Export

Connect to old management console / database, run following commands to export

```shell
mkdir deepfence_export
cd deepfence_export

docker run --net=host --rm=true --name=postgresql-backup \
  -v "$(pwd)":/data:rw \
  --entrypoint=/usr/local/bin/pg-export.sh \
  -e POSTGRES_DB_HOST="127.0.0.1" \
  -e POSTGRES_DB_PORT="5432" \
  -e POSTGRES_DB_NAME=users \
  -e POSTGRES_DB_USERNAME="" \
  -e POSTGRES_DB_PASSWORD="" \
  deepfenceio/deepfence_backup:2.0.1
```

## Import

Connect to new management console / database, run following commands to import

```shell
docker run --net=host --rm=true --name=postgresql-restore \
  -v "$(pwd)":/data:rw \
  --entrypoint=/usr/local/bin/pg-import.sh \
  -e POSTGRES_DB_HOST="127.0.0.1" \
  -e POSTGRES_DB_PORT="5432" \
  -e POSTGRES_DB_NAME=users \
  -e POSTGRES_DB_USERNAME="" \
  -e POSTGRES_DB_PASSWORD="" \
  deepfenceio/deepfence_backup:2.0.1
```
- Restart management console once

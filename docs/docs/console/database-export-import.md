---
title: Database Export and Import
---

## Postgres DB Export and Import

Export PostgreSQL data from one management console and import in another console

### Export

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
  deepfenceio/deepfence_backup:2.1.0
```

### Import

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
  deepfenceio/deepfence_backup:2.1.0
```
- Restart management console once


## Neo4J Graph Database Export and Import

Export Neo4J data from one management console and Import data in another console

### Export

* Step 1: Login to the host running the neo4j docker instance.
* Step 2: Docker exec into the neo4j instance using the below command:

    ```shell
    docker exec -it deepfence-neo4j /bin/bash
    ```
* Step 3: Run the backup script from inside the neo4j docker instance as follows:

    ```shell
    /usr/local/bin/backup_neo4j.sh 
    ```
    This will create a backup file inside the container.
    The name of the file will be of the format: `neo4j_backup_<YYYY-MM-DD_HOUR-MIN-SEC>`
    Also, the script will print the name of the file on the stdout.
* Step 4: Copy the neo4j backup file created above to host or any intermediate location

### Import

* Step 1: Copy the backup file from intermediate location to the target machine using scp (or similar commands)
* Step 2: Login to the target machine and copy the backup file in to the running neo4j container using below command:

    ```shell
    docker cp <BACKUP_FILE> deepfence-neo4j:/
    ```
* Step 3: Take a bash session of the running neo4j container using the below command:

    ```shell
    docker exec -it deepfence-neo4j /bin/bash
    ```
* Step 4: Run the restore script from inside the neo4j docker instance as follows:

    ```shell
    /usr/local/bin/load_backup_neo4j.sh /<BACKUP_FILE>
    ```
    e.g.:
    ```shell
    /usr/local/bin/load_backup_neo4j.sh /neo4j_backup_2023-11-17_10-25-28
    ```

### Steps for Kubernetes:

The steps for kubernetes remains similar to the above.
For Kubernetes, we will have to use `kubectl` utility to:
* Copy the file from and to the pod.
* Take a bash session of the pod

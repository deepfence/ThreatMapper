---
title: Database Export and Import
---

## Postgres DB Export and Import

Export PostgreSQL data from one management console and import in another console

### Export

Connect to old management console / database, run following commands to export

* Step 1: Login to the host running the postgres docker instance.
* Step 2: Docker exec into the postgres instance using the below command:

    ```shell
    docker exec -it deepfence-postgres /bin/bash
    ```
* Step 3: Run the backup script from inside the postgres container as follows:

    ```shell
    /usr/local/bin/pg-export.sh
    ```
    This will create a backup file `/data/pg_data.dump` inside the container.
* Step 4: Copy the postgres backup file created above to host or any intermediate location

### Import

* Step 1: Copy the backup file from intermediate location to the target machine using scp (or similar commands)
* Step 2: Login to the target machine and copy the backup file in to the running postgres container using below command:

    ```shell
    docker cp pg_data.dump deepfence-postgres:/
    ```
* Step 3: Take a bash session of the running postgres container using the below command:

    ```shell
    docker exec -it deepfence-postgres /bin/bash
    ```
* Step 4: Run the restore script from inside the postgres docker instance as follows:

    ```shell
    /usr/local/bin/pg-import.sh /pg_data.dump
    ```

### Steps for Kubernetes:

The steps for kubernetes remains similar to the above.
For Kubernetes, we will have to use `kubectl` utility to:
* Copy the file from and to the pod.
* Take a bash session of the pod


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

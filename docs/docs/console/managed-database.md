---
title: Managed Database
---

# Managed PostgreSQL, Neo4j and File Server

For production deployment of Deepfence Management Console, we recommend using cloud/vendor managed PostgreSQL and Neo4j services.

## Neo4j

Please use the following settings to configure the Neo4j AuraDB Professional / Enterprise service

| Option  | Recommended Value |
|---------|-------------------|
| Memory  | 8GB               |
| CPU     | 2 CPU             |
| Storage | 16GB              |

In `docker-compose.yml`, set the values for postgresql accordingly.
```yaml
x-service-variables: &common-creds
    DEEPFENCE_NEO4J_USER: neo4j
    DEEPFENCE_NEO4J_PASSWORD: <password>
    NEO4J_AUTH: neo4j/<password>
    DEEPFENCE_NEO4J_BOLT_PORT: 7687
    DEEPFENCE_NEO4J_HOST: abcdefgh.databases.neo4j.io
```

## PostgreSQL

### AWS RDS

Please use the following settings to configure the PostgreSQL service

| Option                  | Recommended Value                                    |
|-------------------------|------------------------------------------------------|
| Engine                  | PostgreSQL                                           |
| Version                 | 13.7-R1 or above                                     |
| Availability            | Single DB instance / Multi-AZ DB instance            |
| Credentials             | Set username and password                            |
| DB instance class       | db.m6i.large / db.t3.medium or better                |
| Storage type            | Provisioned IOPS SSD                                 |
| Allocated storage       | >= 100                                               |
| Provisioned IOPS        | >= 3000                                              |
| Public access           | No (provide access only to management console nodes) |
| Database authentication | Password authentication                              |
| Initial database name   | deepfence                                            |

### Docker

In `docker-compose.yml`, set the values for postgresql accordingly.
```yaml
x-service-variables: &common-creds
    DEEPFENCE_POSTGRES_USER_DB_USER: postgres
    DEEPFENCE_POSTGRES_USER_DB_PASSWORD: <password>
    DEEPFENCE_POSTGRES_USER_DB_HOST: pg-db-1.aaaaaa.us-east-1.rds.amazonaws.com
    DEEPFENCE_POSTGRES_USER_DB_NAME: deepfence
    DEEPFENCE_POSTGRES_USER_DB_PORT: 5432
    DEEPFENCE_POSTGRES_USER_DB_SSLMODE: disable
```

### Kubernetes

1. Create postgres secret and save as `deepfence_postgres_secret.yaml`. Refer `templates/deepfence-console-secrets/postgres.yaml` in the console helm chart for secret format
    ```shell
    kubectl create namespace deepfence-console
    kubectl apply -f deepfence_postgres_secret.yaml -n deepfence-console
    ```
2. Change the values.yaml to not create postgres StatefulSet
    ```yaml
    postgres:
      # Specifies whether a postgres database instance should be created
      create: false
      # if create false provide name of the existing secret
      # secret format refer templates/deepfence-console-secrets/postgres.yaml
      secretName: "deepfence-console-secrets-postgres"
    ```
3. Follow [these](kubernetes.md#console-helm-chart) instructions to complete the installation

## File Server

ThreatMapper Management Console uses a S3 compatible file server. If you wish to use S3 or other externally managed S3 compatible file server (MinIO, SeaweedFS, etc.), please follow these instructions according to the deployment method

### Docker

1. Change the file server URL, port and other parameters as applicable in `docker-compose.yml`
    ```yaml
        # public bucket with read permissions on objects for hosting vulnerability database
        # S3 bucket permissions {"Version":"2012-10-17","Statement":[{"Sid":"database","Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":["arn:aws:s3:::<bucket-name>/database/*","arn:aws:s3:::<bucket-name>/database"]}]}
        DEEPFENCE_FILE_SERVER_DB_BUCKET: database
        # private bucket to host reports, sbom, etc.
        DEEPFENCE_FILE_SERVER_BUCKET: default
        # If using S3 or other external file server (MinIO/SeaweedFS), set this to true
        DEEPFENCE_FILE_SERVER_EXTERNAL: "true"
        # set s3.amazonaws.com if using s3 buckets
        DEEPFENCE_FILE_SERVER_HOST: 123.123.123.123
        DEEPFENCE_FILE_SERVER_PORT: 8080
        # uncomment to set access key if using s3 buckets
        # DEEPFENCE_FILE_SERVER_USER: fileserveruser
        # uncomment to set secret key if using s3 buckets
        # DEEPFENCE_FILE_SERVER_PASSWORD: changeme
        # set true if https
        DEEPFENCE_FILE_SERVER_SECURE: "false"
        # set aws s3 bucket region if using s3 buckets
        DEEPFENCE_FILE_SERVER_REGION: ""
    ```
2. Remove the following service
    ```yaml
      deepfence-file-server:
        container_name: deepfence-file-server
    ```

### Kubernetes

1. Create file server secret and save as `deepfence_fileserver_secret.yaml`. Refer `templates/deepfence-console-secrets/s3.yaml` or `templates/deepfence-console-secrets/fileserver.yaml` in the console helm chart for secret format
    ```shell
    kubectl create namespace deepfence-console
    kubectl apply -f deepfence_fileserver_secret.yaml -n deepfence-console
    ```
2. Change the values.yaml to not create fileserver StatefulSet
    ```yaml
    fileserver:
      # Specifies whether a file server instance should be created
      # set this to false if using S3
      create: false
      # if create false provide name of the existing secret.
      # Secret format refer templates/deepfence-console-secrets/s3.yaml
      secretName: "deepfence-console-secrets-fileserver"
      
      # Set this if external file server is used and create=false
      fileServerHost: "123.123.123.123"
      fileServerPort: "8080"
    ```
3. Follow [these](kubernetes.md#console-helm-chart) instructions to complete the installation
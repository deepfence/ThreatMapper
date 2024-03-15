---
title: Managed Database
---

# Managed PostgreSQL and Neo4j

For production deployment of Deepfence Management Console, we recommend using cloud/vendor managed PostgreSQL and Neo4j services.

# Neo4j

Please use the following settings to configure the Neo4j AuraDB Professional / Enterprise service

| Option  | Recommended Value |
|---------|-------------------|
| Memory  | 8GB               |
| CPU     | 2 CPU             |
| Storage | 16GB              |

In docker-compose.yml, set the values for postgresql accordingly.
```yaml
x-service-variables: &common-creds
    DEEPFENCE_NEO4J_USER: neo4j
    DEEPFENCE_NEO4J_PASSWORD: <password>
    NEO4J_AUTH: neo4j/<password>
    DEEPFENCE_NEO4J_BOLT_PORT: 7687
    DEEPFENCE_NEO4J_HOST: abcdefgh.databases.neo4j.io
```

# PostgreSQL

## AWS RDS

Please use the following settings to configure the Elasticsearch service

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

In docker-compose.yml, set the values for postgresql accordingly.
```yaml
x-service-variables: &common-creds
    DEEPFENCE_POSTGRES_USER_DB_USER: postgres
    DEEPFENCE_POSTGRES_USER_DB_PASSWORD: <password>
    DEEPFENCE_POSTGRES_USER_DB_HOST: pg-db-1.aaaaaa.us-east-1.rds.amazonaws.com
    DEEPFENCE_POSTGRES_USER_DB_NAME: deepfence
    DEEPFENCE_POSTGRES_USER_DB_PORT: 5432
    DEEPFENCE_POSTGRES_USER_DB_SSLMODE: disable
```
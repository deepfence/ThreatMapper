---
title: Managed Database
---

# Managed Elasticsearch and PostgreSQL

For production deployment of Deepfence Management Console, we recommend using cloud/vendor managed Elasticsearch and PostgreSQL services.

# Elasticsearch

## Amazon Opensearch Service

Please use the following settings to configure the Elasticsearch service

| Option                             | Recommended Value                                    |
|------------------------------------|------------------------------------------------------|
| Deployment type                    | Production                                           |
| Version                            | 7.10                                                 |
| Auto-Tune                          | Enable                                               |
| Availability Zones                 | 2-AZ  / 3-AZ depending on requirements               |
| Number of nodes                    | 2 / 3                                                |
| Instance type                      | t3.medium.search / m6g.large.search or better        |
| Storage type                       | EBS                                                  |
| EBS volume type                    | gp3                                                  |
| EBS storage size per node          | >100 GiB                                             |
| Master node - Instance type        | m6g.large.search / r6g.large.search                  |
| Master - Number of nodes           | 3                                                    |
| Public access                      | No (provide access only to management console nodes) |
| Enable fine-grained access control | Yes                                                  |
| Create master user                 | Set username and password                            |
| Password                           | Should only contain alphabets, numbers and -         |
| Access policy                      | Only use fine-grained access control                 |
| Encryption                         | Yes                                                  |

In console helm chart, set the values for elasticsearch accordingly.
```yaml
db:
  elasticsearch:
    scheme: "https"
    host: search-deepfence-aaaaaa.us-east-1.es.amazonaws.com
    port: "443"
    # Accepted characters for username and password: alphabets, numbers and -
    user: "<user>"
    password: "<password>"
```

## Elastic Cloud

Please use the following settings to configure the Elasticsearch service

| Option           | Recommended Value  |
|------------------|--------------------|
| Version          | 7.17.6             |
| Hardware profile | General purpose    |
| Size             | 4 GB RAM or better |


In console helm chart, set the values for elasticsearch accordingly.
```yaml
db:
  elasticsearch:
    scheme: "https"
    host: deepfence-012345.es.us-east-1.aws.found.io
    port: "443"
    # Accepted characters for username and password: alphabets, numbers and -
    user: "<user>"
    password: "<password>"
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

In console helm chart, set the values for postgresql accordingly.
```yaml
db:
  postgresUserDb:
    host: pg-db-1.aaaaaa.us-east-1.rds.amazonaws.com
    port: "5432"
    user: "postgres"
    password: "<password>"
    dbname: "deepfence"
    sslmode: "disable"
```
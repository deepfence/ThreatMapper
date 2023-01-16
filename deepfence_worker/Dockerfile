FROM golang:1.19-alpine3.17 AS build

RUN apk add --no-cache git make
ADD deepfence_worker /go/deepfence_worker/
ADD deepfence_utils /go/deepfence_utils/
ADD deepfence_server /go/deepfence_server/
ADD deepfence_utils /go/deepfence_utils/
ADD deepfence_server_client /go/deepfence_server_client/
WORKDIR /go/deepfence_worker/
# "make vendor" is run before separately to avoid docker cache invalidation
RUN CGO_ENABLED=0 make deepfence_worker

FROM alpine:3.17
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

RUN apk add --no-cache kafkacat

ENV DEEPFENCE_POSTGRES_USER_DB_HOST=deepfence-postgres \
    DEEPFENCE_POSTGRES_USER_DB_PORT=5432 \
    DEEPFENCE_POSTGRES_USER_DB_USER=deepfence \
    DEEPFENCE_POSTGRES_USER_DB_PASSWORD=deepfence \
    DEEPFENCE_POSTGRES_USER_DB_NAME=users \
    DEEPFENCE_POSTGRES_USER_DB_SSLMODE=disable \
    DEEPFENCE_REDIS_HOST=deepfence-redis \
    DEEPFENCE_REDIS_PORT=6379 \
    DEEPFENCE_REDIS_DB_NUMBER=0 \
    DEEPFENCE_NEO4J_HOST=deepfence-neo4j \
    DEEPFENCE_NEO4J_BOLT_PORT=7687 \
    DEEPFENCE_NEO4J_USER=neo4j \
    DEEPFENCE_NEO4J_PASSWORD=password \
    DEEPFENCE_MINIO_HOST=deepfence-file-server \
    DEEPFENCE_MINIO_PORT=9000 \
    DEEPFENCE_MINIO_USER=deepfence \
    DEEPFENCE_MINIO_PASSWORD=deepfence \
    DEEPFENCE_MINIO_BUCKET=deepfence \
    DEEPFENCE_MINIO_SECURE=false \
    DEEPFENCE_SAAS_DEPLOYMENT=false \
    DEEPFENCE_KAFKA_BROKERS=deepfence-kafka-broker:9092 \
    DEEPFENCE_KAFKA_TOPIC_PARTITIONS=3 \
    DEEPFENCE_KAFKA_TOPIC_REPLICAS=1 \
    DEEPFENCE_KAFKA_TOPIC_RETENTION_MS="86400000" \
    DEEPFENCE_DEBUG=false \
    DEEPFENCE_MODE=worker

RUN apk add --no-cache --update bash curl \
    && apk upgrade \
    && curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin v0.55.0

COPY --from=build /go/deepfence_worker/deepfence_worker /usr/local/bin/deepfence_worker
COPY deepfence_worker/entrypoint.sh /entrypoint.sh
COPY deepfence_worker/grype.yaml /usr/local/bin/grype.yaml
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_worker"]

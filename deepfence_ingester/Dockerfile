FROM golang:1.19-alpine3.16 AS build

RUN apk add --no-cache git make

ADD deepfence_server /go/deepfence_server/
ADD deepfence_worker /go/deepfence_worker/
ADD deepfence_utils /go/deepfence_utils/
ADD deepfence_server_client /go/deepfence_server_client/
ADD deepfence_ingester /go/deepfence_ingester/
WORKDIR /go/deepfence_ingester/
# "make vendor" is run before separately to avoid docker cache invalidation
RUN make deepfence_ingester

FROM alpine:3.16
LABEL maintainer="Deepfence Inc"
LABEL deepfence.role=system

RUN apk add --no-cache kafkacat

COPY deepfence_ingester/entrypoint.sh /entrypoint.sh

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
    DEEPFENCE_METRICS_PORT=8181 \
    DEEPFENCE_SAAS_DEPLOYMENT=false \
    DEEPFENCE_KAFKA_BROKERS=deepfence-kafka-broker:9092 \
    DEEPFENCE_KAFKA_TOPIC_PARTITIONS=3 \
    DEEPFENCE_KAFKA_TOPIC_REPLICAS=1 \
    DEEPFENCE_KAFKA_TOPIC_RETENTION_MS="86400000" \
    DEEPFENCE_DEBUG=false

COPY --from=build /go/deepfence_ingester/deepfence_ingester /usr/local/bin/deepfence_ingester
EXPOSE 8090
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_ingester"]

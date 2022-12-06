FROM golang:1.19-alpine3.16 AS build

ADD deepfence_server /go/deepfence_server/
ADD deepfence_worker /go/deepfence_worker/
ADD deepfence_utils /go/deepfence_utils/
ADD deepfence_server_client /go/deepfence_server_client/
ADD deepfence_ingester /go/deepfence_ingester/
WORKDIR /go/deepfence_ingester/
RUN apk add --no-cache git make
RUN make

FROM alpine:3.16
LABEL maintainer="Deepfence Inc"
LABEL deepfence.role=system

ENV POSTGRES_USER_DB_HOST=deepfence-postgres \
    POSTGRES_USER_DB_PORT=5432 \
    POSTGRES_USER_DB_USER=deepfence \
    POSTGRES_USER_DB_PASSWORD=deepfence \
    POSTGRES_USER_DB_NAME=users \
    POSTGRES_USER_DB_SSLMODE=disable \
    REDIS_HOST=deepfence-redis \
    REDIS_PORT=6379 \
    REDIS_DB_NUMBER=0 \
    NEO4J_HOST=deepfence-neo4j \
    NEO4J_BOLT_PORT=7687 \
    NEO4J_USER=neo4j \
    NEO4J_PASSWORD=password \
    HTTP_LISTEN_ENDPOINT=8090 \
    SAAS_DEPLOYMENT=false \
    KAFKA_BROKERS=deepfence-kafka-broker:9092 \
    KAFKA_TOPIC_PARTITIONS=3 \
    KAFKA_TOPIC_REPLICAS=1 \
    KAFKA_TOPIC_RETENTION_MS="86400000" 

COPY --from=build /go/deepfence_ingester/deepfence_ingester /usr/local/bin/deepfence_ingester
EXPOSE 8090
CMD ["/usr/local/bin/deepfence_ingester"]

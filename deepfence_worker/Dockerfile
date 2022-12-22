FROM golang:1.19-alpine3.16 AS build

ADD deepfence_worker /go/deepfence_worker/
ADD deepfence_utils /go/deepfence_utils/
WORKDIR /go/deepfence_worker/
RUN apk add --no-cache git make
# "make vendor" is run before separately to avoid docker cache invalidation
RUN make deepfence_worker

FROM alpine:3.16
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

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
    DEEPFENCE_SAAS_DEPLOYMENT=false

COPY --from=build /go/deepfence_worker/deepfence_worker /usr/local/bin/deepfence_worker
COPY deepfence_worker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8081
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_worker"]

FROM golang:1.19-alpine3.16 AS build

ADD deepfence_worker /go/deepfence_worker/
ADD deepfence_utils /go/deepfence_utils/
WORKDIR /go/deepfence_worker/
RUN apk add --no-cache git \
    && go mod tidy \
    && go build -o /tmp/deepfence_worker

FROM alpine:3.16
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV POSTGRES_USER_DB_HOST=deepfence-postgres \
    POSTGRES_USER_DB_PORT=5432 \
    POSTGRES_USER_DB_USER=cve \
    POSTGRES_USER_DB_PASSWORD=cve \
    POSTGRES_USER_DB_NAME=users \
    POSTGRES_USER_DB_SSLMODE=disable \
    REDIS_HOST=deepfence-redis \
    REDIS_PORT=6379 \
    REDIS_DB_NUMBER=0 \
    NEO4J_HOST=deepfence-neo4j \
    NEO4J_BOLT_PORT=7687 \
    NEO4J_USER=neo4j \
    NEO4J_PASSWORD=password \
    SAAS_DEPLOYMENT=false

COPY --from=build /tmp/deepfence_worker /usr/local/bin/deepfence_worker
COPY deepfence_worker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8081
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_worker"]

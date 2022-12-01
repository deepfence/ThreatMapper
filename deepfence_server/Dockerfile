FROM golang:1.19-alpine3.16 AS build

ADD deepfence_server /go/deepfence_server/
ADD deepfence_worker /go/deepfence_worker/
ADD deepfence_utils /go/deepfence_utils/
RUN mkdir -p /go/deepfence_agent/tools/apache
ADD deepfence_agent/tools/apache /go/deepfence_agent/tools/apache
WORKDIR /go/deepfence_server/
RUN apk add --no-cache git build-base libpcap-dev libcap-dev
RUN make

FROM alpine:3.16
MAINTAINER Deepfence Inc
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
    HTTP_LISTEN_ENDPOINT=8080 \
    SAAS_DEPLOYMENT=false

ADD deepfence_server/auth /auth
ADD deepfence_utils/postgresql /usr/local/postgresql-migrate
COPY deepfence_server/entrypoint.sh /entrypoint.sh
RUN apk add --no-cache --update bash curl libpcap \
    && apk add --no-cache postgresql-client --repository=https://dl-cdn.alpinelinux.org/alpine/v3.14/main \
    && chmod +x /entrypoint.sh \
    && curl -L "https://github.com/golang-migrate/migrate/releases/latest/download/migrate.linux-amd64.tar.gz" | tar xvz \
    && mv migrate /usr/local/bin/migrate \
    && chmod +x /usr/local/bin/migrate
COPY --from=build /go/deepfence_server/deepfence_server /usr/local/bin/deepfence_server

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_server"]

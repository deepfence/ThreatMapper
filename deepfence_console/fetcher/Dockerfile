FROM golang:1.18-alpine3.15 AS build
RUN apk add --no-cache build-base git

ADD .   /go/fetcher/
WORKDIR /go/fetcher/

RUN go build fetcher-server.go

FROM alpine:3.15.0
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV DF_PROG_NAME="fetcher" \
    POSTGRES_USER_DB_HOST=deepfence-postgres \
    POSTGRES_USER_DB_PORT=5432 \
    POSTGRES_USER_DB_USER=cve \
    POSTGRES_USER_DB_PASSWORD=cve \
    POSTGRES_USER_DB_NAME=users \
    POSTGRES_USER_DB_SSLMODE=disable \
    ELASTICSEARCH_SCHEME=http \
    ELASTICSEARCH_HOST=deepfence-es \
    ELASTICSEARCH_PORT=9200 \
    REDIS_HOST=deepfence-redis \
    REDIS_PORT=6379 \
    REDIS_DB_NUMBER=0

COPY --from=build /go/fetcher/fetcher-server /usr/local/bin/fetcher-server
COPY start_fetcher.sh /usr/bin/start_fetcher.sh
COPY grype.yaml /root/.grype.yaml

RUN apk add --no-cache bash curl postgresql-client \
    && curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin v0.40.1 \
    && /usr/local/bin/grype db update \
    && chmod 755 /usr/local/bin/fetcher-server /usr/bin/start_fetcher.sh \
    && apk del curl \
    && rm -rf /var/cache/apk/*

ENTRYPOINT ["/usr/bin/start_fetcher.sh"]
EXPOSE 8006

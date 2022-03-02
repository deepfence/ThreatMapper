FROM golang:1.17-alpine3.15 AS build
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
    ELASTICSEARCH_HOST=deepfence-es \
    ELASTICSEARCH_PORT=9200 \
    REDIS_HOST=deepfence-redis \
    REDIS_PORT=6379 \
    REDIS_DB_NUMBER=0

COPY --from=build /go/fetcher/fetcher-server /usr/local/bin/fetcher-server
COPY start_fetcher.sh /usr/bin/start_fetcher.sh
RUN mkdir /etc/filebeat/
COPY filebeat.crt /etc/filebeat/
COPY filebeat.key /etc/filebeat/

RUN apk add --no-cache bash postgresql-client \
    && rm -rf /var/cache/apk/* \
    && chmod 755 /usr/local/bin/fetcher-server /usr/bin/start_fetcher.sh

ENTRYPOINT ["/usr/bin/start_fetcher.sh"]
EXPOSE 8006

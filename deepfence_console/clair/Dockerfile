FROM golang:1.17-alpine3.15 AS build
RUN apk add --no-cache build-base git

ADD .   /go/clair/
WORKDIR /go/clair/

RUN mv /go/clair/check_postgres /go \
    && mv /go/clair/fetcher_api_server /go \
    && cd /go/check_postgres && go build check-postgres.go \
    && cd /go/fetcher_api_server && go build fetcher-server.go

FROM alpine:3.15.0
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV DF_PROG_NAME="fetcher" \
    POSTGRES_FETCHER_DB_HOST=deepfence-postgres \
    POSTGRES_FETCHER_DB_PORT=5432 \
    POSTGRES_FETCHER_DB_USER=cve \
    POSTGRES_FETCHER_DB_PASSWORD=cve \
    POSTGRES_FETCHER_DB_NAME=cve \
    POSTGRES_FETCHER_DB_SSLMODE=disable \
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

COPY --from=build /go/fetcher_api_server/fetcher-server /usr/local/bin/fetcher-server
COPY --from=build /go/check_postgres/check-postgres /usr/local/bin/check-postgres
COPY start_fetcher.sh /usr/bin/start_fetcher.sh
RUN mkdir /etc/filebeat/
COPY filebeat.crt /etc/filebeat/
COPY filebeat.key /etc/filebeat/

RUN apk add --no-cache bash postgresql-client \
    && rm -rf /var/cache/apk/* \
    && chmod 755 /usr/local/bin/check-postgres /usr/local/bin/fetcher-server /usr/bin/start_fetcher.sh

ENTRYPOINT ["/usr/bin/start_fetcher.sh"]
EXPOSE 8006

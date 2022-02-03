FROM golang:1.17-alpine3.14 AS build
RUN apk add --no-cache build-base git

ADD .   /go/clair/
WORKDIR /go/clair/

RUN export CLAIR_VERSION="v2.1.2" \
    && mv /go/clair/check_postgres /go \
    && mv /go/clair/cve_server /go \
    && cd /go/clair && go build -ldflags "-X github.com/quay/clair/v2/pkg/version.Version=$CLAIR_VERSION" ./cmd/clair \
    && cd /go/check_postgres && go build check-postgres.go \
    && cd /go/cve_server && go build cve-server.go

FROM alpine:3.14.2
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

COPY --from=build /go/clair/clair /usr/bin/cvecheck
COPY --from=build /go/cve_server/cve-server /usr/local/bin/cve-server
COPY --from=build /go/check_postgres/check-postgres /usr/local/bin/check-postgres
COPY start_fetcher.sh /usr/bin/start_fetcher.sh
COPY update-owasp.sh /usr/local/bin/update-owasp.sh
RUN mkdir /etc/filebeat/ /etc/fetcher
COPY filebeat.crt /etc/filebeat/
COPY filebeat.key /etc/filebeat/
COPY config.yml /etc/fetcher/config-temp.yml
COPY clear-cache.sh /usr/local/bin/clear-cache.sh
COPY dependency-check-6.5.3-release.zip /tmp/dependency-check-6.5.3-release.zip

RUN apk add --no-cache git rpm xz bash py3-pip openjdk8-jre curl zip unzip gettext tar postgresql-client \
    && mkdir -p /var/log/supervisor /var/log/supervisord /etc/supervisor/conf.d/ \
    && pip3 install --no-cache-dir --upgrade pip setuptools supervisor==4.2.2 \
    && rm -rf /usr/lib/python*/ensurepip /usr/local/lib/python*/ensurepip \
    && rm -rf /var/cache/apk/* \
    && unzip /tmp/dependency-check-6.5.3-release.zip -d /tmp/ \
    && mkdir -p /tmp/dependency-check/data/ \
    && mv /tmp/dependency-check /usr/local/bin/ \
    && chmod -R +x /usr/local/bin/dependency-check \
    && rm /tmp/dependency-check-6.5.3-release.zip \
    && apk del curl \
    && chmod 755 /usr/local/bin/clear-cache.sh /usr/local/bin/check-postgres /usr/local/bin/update-owasp.sh /usr/local/bin/cve-server \
    && chmod 755 /usr/bin/cvecheck /usr/bin/start_fetcher.sh
 
COPY supervisord.conf /etc/supervisor/supervisord.conf
COPY cve-server-supervisor.conf /etc/supervisor/conf.d/cve-server.conf
 
ENTRYPOINT ["/usr/bin/start_fetcher.sh"]
EXPOSE 8001 8002 8006

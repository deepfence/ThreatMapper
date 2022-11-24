FROM golang:1.19-alpine3.16 AS build

ADD deepfence_server /go/deepfence_server/
ADD deepfence_worker /go/deepfence_worker/
WORKDIR /go/deepfence_server/
RUN apk add --no-cache git \
    && go mod tidy \
    && go build -o /tmp/deepfence_server

FROM alpine:3.16
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV POSTGRES_USER_DB_HOST=deepfence-postgres \
    POSTGRES_USER_DB_PORT=5432 \
    POSTGRES_USER_DB_USER=cve \
    POSTGRES_USER_DB_PASSWORD=cve \
    POSTGRES_USER_DB_NAME=users \
    POSTGRES_USER_DB_SSLMODE=disable \
    WORKER_REDIS_HOST=deepfence-redis \
    WORKER_REDIS_PORT=6379 \
    REDIS_DB_NUMBER=0

COPY --from=build /tmp/deepfence_server /usr/local/bin/deepfence_server
COPY deepfence_server/entrypoint.sh /entrypoint.sh
RUN apk add --no-cache --update bash curl \
    && apk add --no-cache postgresql-client --repository=https://dl-cdn.alpinelinux.org/alpine/v3.14/main \
    && chmod +x /entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_server"]
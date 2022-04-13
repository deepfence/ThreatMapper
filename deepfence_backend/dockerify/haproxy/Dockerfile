FROM golang:1.18-alpine3.15 AS minica-builder
COPY minica.go /go
COPY genCert.sh /go
WORKDIR /go
RUN apk add --no-cache bash
RUN /bin/bash /go/genCert.sh


FROM haproxy:2.4-alpine3.15
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

USER root

ARG is_dev_build

ENV ENABLE_AUTH=true \
    REDIS_HOST=deepfence-redis \
    REDIS_PORT=6379 \
    IS_DEV_BUILD=$is_dev_build \
    UI_SERVICE_NAME=deepfence-ui

COPY --from=minica-builder /go/minica.pem /usr/local/etc/haproxy/deepfence.crt
COPY --from=minica-builder /go/minica-key.pem /usr/local/etc/haproxy/deepfence.key
COPY ./dockerify/haproxy/router-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN apk update --no-cache \
    && chmod +x /usr/local/bin/docker-entrypoint.sh \
    && apk add --no-cache bash lua5.3 lua5.3-socket curl \
    && rm -rf /var/cache/apk/*

COPY ./dockerify/haproxy/haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg
COPY ./dockerify/haproxy/verify_api_key.lua /usr/local/share/verify_api_key.lua
COPY ./dockerify/haproxy/socks5.lua /usr/local/share/socks5.lua
COPY ./dockerify/haproxy/fifo.lua /usr/local/share/fifo.lua
COPY ./dockerify/haproxy/redis.lua /usr/local/share/redis.lua
COPY ./dockerify/haproxy/redis_wrapper.lua /usr/local/share/redis_wrapper.lua

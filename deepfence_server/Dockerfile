FROM golang:1.19-alpine3.16 AS build


RUN apk add --no-cache git build-base libpcap-dev libcap-dev

ADD deepfence_server /go/deepfence_server/
ADD deepfence_worker /go/deepfence_worker/
ADD golang_deepfence_sdk /go/golang_deepfence_sdk
RUN mkdir -p /go/deepfence_agent/tools/apache
ADD deepfence_agent/tools/apache /go/deepfence_agent/tools/apache
WORKDIR /go/deepfence_server/
# "make vendor" is run before separately to avoid docker cache invalidation
RUN make deepfence_server

FROM alpine:3.16
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV DEEPFENCE_HTTP_LISTEN_ENDPOINT=8080 \
    DEEPFENCE_ACCESS_TOKEN_EXPIRY_MINUTES=5

ADD deepfence_server/auth /auth
ADD deepfence_server/cloud_controls /cloud_controls
ADD golang_deepfence_sdk/utils/postgresql /usr/local/postgresql-migrate
COPY deepfence_server/entrypoint.sh /entrypoint.sh

RUN apk add --no-cache --update bash curl libpcap tar kafkacat && \
    apk add --no-cache postgresql-client --repository=https://dl-cdn.alpinelinux.org/alpine/v3.14/main

RUN chmod +x /entrypoint.sh

RUN curl -L "https://github.com/golang-migrate/migrate/releases/latest/download/migrate.linux-amd64.tar.gz" | tar xvz && \
    mv migrate /usr/local/bin/migrate && \
    chmod +x /usr/local/bin/migrate

RUN cd /usr/local/share/ && \
    wget https://github.com/swagger-api/swagger-ui/archive/refs/tags/v4.15.5.tar.gz -O /usr/local/share/swagger-ui.tar.gz && \
    tar -xzf /usr/local/share/swagger-ui.tar.gz -C /usr/local/share/ && \
    mv /usr/local/share/swagger-ui-4.15.5/dist /usr/local/share/swagger-ui && \
    rm -rf /usr/local/share/swagger-ui.tar.gz /usr/local/share/swagger-ui-4.15.5

COPY --from=build /go/deepfence_server/deepfence_server /usr/local/bin/deepfence_server

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_server"]

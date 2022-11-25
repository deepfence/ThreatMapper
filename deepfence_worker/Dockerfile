FROM golang:1.19-alpine3.16 AS build

ADD deepfence_worker /go/deepfence_worker/
WORKDIR /go/deepfence_worker/
RUN apk add --no-cache git \
    && go mod tidy \
    && go build -o /tmp/deepfence_worker

FROM alpine:3.16
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV REDIS_ENDPOINT=deepfence-redis:6379 \
REDIS_DB_NUMBER=0

COPY --from=build /tmp/deepfence_worker /usr/local/bin/deepfence_worker
COPY deepfence_worker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8081
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_worker"]

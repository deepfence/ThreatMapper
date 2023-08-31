FROM alpine:3.18
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV MINIO_ROOT_USER=deepfence \
    MINIO_ROOT_PASSWORD=deepfence \
    BUCKET_NAME=deepfence

WORKDIR /usr/local/bin
COPY entrypoint.sh /entrypoint.sh
RUN apk update --no-cache && apk upgrade --no-cache \
    && wget https://dl.min.io/server/minio/release/linux-amd64/minio \
    && chmod +x /usr/local/bin/minio /entrypoint.sh \
    && mkdir -p /data

ENTRYPOINT ["/entrypoint.sh"]
CMD ["minio", "server", "/data", "--address", "0.0.0.0:9000", "--console-address", "0.0.0.0:9090", "--anonymous", "--json"]
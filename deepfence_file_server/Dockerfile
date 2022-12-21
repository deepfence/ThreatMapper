FROM alpine:3.17
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV MINIO_ROOT_USER=deepfence \
    MINIO_ROOT_PASSWORD=deepfence \
    MINIO_USERNAME=minio \
    MINIO_GROUPNAME=minio

WORKDIR /usr/local/bin
COPY entrypoint.sh /entrypoint.sh
RUN wget https://dl.min.io/server/minio/release/linux-amd64/minio \
    && chmod +x /usr/local/bin/minio /entrypoint.sh \
    && mkdir -p /data

ENTRYPOINT ["/entrypoint.sh"]
CMD ["minio", "server", "/data", "--address", ":9000", "--console-address", ":9090", "--anonymous", "--json", "--quiet"]
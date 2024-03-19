FROM alpine:3.18
MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV FILE_SERVER_ROOT_USER=deepfence \
    FILE_SERVER_ROOT_PASSWORD=deepfence \
    BUCKET_NAME=deepfence

RUN apk add envsubst
WORKDIR /usr/local/bin
COPY entrypoint.sh /entrypoint.sh
COPY config.json /etc/seaweed.json.sample
RUN apk update --no-cache && apk upgrade --no-cache
RUN wget https://github.com/seaweedfs/seaweedfs/releases/download/3.55/linux_amd64_full.tar.gz
RUN tar xvf ./linux_amd64_full.tar.gz
RUN chmod +x /usr/local/bin/weed /entrypoint.sh
RUN rm ./linux_amd64_full.tar.gz
RUN mkdir -p /data

ENTRYPOINT ["/entrypoint.sh"]
CMD ["weed", "server", "-ip=0.0.0.0", "-dir=/data", "-s3", "-s3.port=9000", "-s3.config=/etc/seaweed.json", "-volume.max=100"]

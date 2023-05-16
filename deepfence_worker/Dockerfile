ARG DF_IMG_TAG=latest
ARG IMAGE_REPOSITORY=deepfenceio
FROM $IMAGE_REPOSITORY/deepfence_package_scanner_ce:$DF_IMG_TAG AS packagescanner
FROM $IMAGE_REPOSITORY/deepfence_secret_scanner_ce:$DF_IMG_TAG AS secretscanner
FROM $IMAGE_REPOSITORY/deepfence_malware_scanner_ce:$DF_IMG_TAG AS yarahunter
FROM surnet/alpine-wkhtmltopdf:3.17.0-0.12.6-full as wkhtmltopdf

FROM alpine:3.17 AS builder-yara

RUN apk add --no-cache make build-base pkgconfig
RUN apk add --no-cache openssl file jansson bison tini su-exec
RUN apk add --no-cache -t .build-deps py-setuptools \
    openssl-dev \
    jansson-dev \
    build-base \
    libc-dev \
    file-dev \
    automake \
    autoconf \
    libtool \
    flex \
    git \
    && cd /root  \
    && wget https://github.com/VirusTotal/yara/archive/refs/tags/v4.2.1.tar.gz \
    && tar -zxf v4.2.1.tar.gz \
    && cd yara-4.2.1 \
    && ./bootstrap.sh \
    && ./configure --prefix=/usr/local/yara --disable-dotnet --enable-magic --enable-cuckoo \
    && make \
    && make install \
    && cd /usr/local/ \
    && tar -czf yara.tar.gz yara

FROM golang:1.19-alpine3.17 AS build

RUN apk add --no-cache git make build-base pkgconfig 
ADD deepfence_worker /go/deepfence_worker/
ADD golang_deepfence_sdk /go/golang_deepfence_sdk
ADD deepfence_server /go/deepfence_server/
WORKDIR /go/deepfence_worker/

COPY --from=builder-yara /usr/local/yara.tar.gz /usr/local/yara.tar.gz
# extract
RUN tar -xzf /usr/local/yara.tar.gz -C /usr/local/ \
    && rm /usr/local/yara.tar.gz

RUN apk update && apk add --no-cache --upgrade \
    curl tar libstdc++ libgcc docker skopeo python3 \
    py3-pip bash podman gcc musl-dev pkgconfig \
    g++ git protoc jansson-dev libc-dev openssl-dev \
    && apk add hyperscan-dev --repository=https://dl-cdn.alpinelinux.org/alpine/v3.13/community \
    && git clone https://github.com/deepfence/yara-rules

ENV PKG_CONFIG_PATH=/usr/local/include/hs/:$(PKG_CONFIG_PATH) \
    CGO_CFLAGS="-I/usr/local/include/hyperscan/src" \
    LD_LIBRARY_PATH=/usr/local/lib:/usr/local/include/hs/lib:$LD_LIBRARY_PATH \
    PKG_CONFIG_PATH=/usr/local/yara/lib/pkgconfig:$(PKG_CONFIG_PATH)

# "make vendor" is run before separately to avoid docker cache invalidation
RUN make deepfence_worker

FROM alpine:3.17 AS final
LABEL MAINTAINER="Deepfence Inc"
LABEL deepfence.role=system

ADD deepfence_server/cloud_controls /cloud_controls
RUN apk add --no-cache kafkacat docker openrc bash skopeo jansson-dev \
        libmagic libstdc++ libx11 libxrender libxext libssl1.1 ca-certificates \
        fontconfig freetype ttf-droid ttf-freefont ttf-liberation
RUN apk add hyperscan --repository=https://dl-cdn.alpinelinux.org/alpine/v3.13/community \
    && apk add --no-cache postgresql-client --repository=https://dl-cdn.alpinelinux.org/alpine/v3.14/main

ENV DEEPFENCE_KAFKA_TOPIC_PARTITIONS=3 \
    DEEPFENCE_KAFKA_TOPIC_PARTITIONS_TASKS=3 \
    DEEPFENCE_KAFKA_TOPIC_REPLICAS=1 \
    DEEPFENCE_KAFKA_TOPIC_RETENTION_MS="86400000" \
    DEEPFENCE_DEBUG=false \
    DEEPFENCE_MODE=worker \
    LD_LIBRARY_PATH=/usr/local/yara/lib

# RUN apk add --no-cache --update bash curl \
#     && apk upgrade \
#     && curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin v0.55.0

COPY --from=wkhtmltopdf /bin/wkhtmltopdf /bin/libwkhtmltox.so /bin/

COPY --from=packagescanner /usr/local/bin/syft /usr/local/bin/syft
COPY --from=packagescanner /usr/local/bin/grype /usr/local/bin/grype
COPY --from=packagescanner /root/.grype.yaml /usr/local/bin/grype.yaml

COPY --from=secretscanner /home/deepfence/usr/config.yaml /config.yaml

COPY --from=yarahunter /home/deepfence/usr/config.yaml /malware-config/config.yaml

COPY --from=build /go/deepfence_worker/deepfence_worker /usr/local/bin/deepfence_worker
COPY --from=build /go/deepfence_worker/entrypoint.sh /entrypoint.sh
COPY --from=build /go/deepfence_worker/yara-rules /usr/local/yara-rules

COPY --from=builder-yara /usr/local/yara.tar.gz /usr/local/yara.tar.gz
# extract yara 
RUN tar -xzf /usr/local/yara.tar.gz -C /usr/local/ \
    && rm /usr/local/yara.tar.gz \
    && chmod +x /entrypoint.sh

ENV GRYPE_DB_UPDATE_URL="http://deepfence-file-server:9000/database/database/vulnerability/listing.json"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_worker"]

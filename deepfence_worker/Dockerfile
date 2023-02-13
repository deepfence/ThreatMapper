ARG DF_IMG_TAG=latest
ARG IMAGE_REPOSITORY=deepfenceio
FROM $IMAGE_REPOSITORY/deepfence_package_scanner_ce:$DF_IMG_TAG AS packagescanner
RUN ls -l /usr/local/bin/

FROM golang:1.19-alpine3.17 AS build

RUN apk add --no-cache git make build-base pkgconfig
ADD deepfence_worker /go/deepfence_worker/
ADD golang_deepfence_sdk /go/golang_deepfence_sdk
ADD deepfence_server /go/deepfence_server/
WORKDIR /go/deepfence_worker/
RUN apk update && apk add --no-cache --upgrade curl tar libstdc++ libgcc docker skopeo python3 py3-pip bash podman gcc musl-dev pkgconfig g++ git protoc\
    && apk add hyperscan-dev --repository=https://dl-cdn.alpinelinux.org/alpine/v3.13/community 
ENV PKG_CONFIG_PATH=/usr/local/include/hs/ \
    CGO_CFLAGS="-I/usr/local/include/hyperscan/src" \
    LD_LIBRARY_PATH=/usr/local/lib:/usr/local/include/hs/lib:$LD_LIBRARY_PATH
# "make vendor" is run before separately to avoid docker cache invalidation
RUN make deepfence_worker

FROM alpine:3.17 AS final
LABEL MAINTAINER="Deepfence Inc"
LABEL deepfence.role=system

RUN apk add --no-cache kafkacat docker openrc bash skopeo
RUN apk add hyperscan --repository=https://dl-cdn.alpinelinux.org/alpine/v3.13/community 

ENV DEEPFENCE_KAFKA_TOPIC_PARTITIONS=3 \
    DEEPFENCE_KAFKA_TOPIC_REPLICAS=1 \
    DEEPFENCE_KAFKA_TOPIC_RETENTION_MS="86400000" \
    DEEPFENCE_DEBUG=false \
    DEEPFENCE_MODE=worker

# RUN apk add --no-cache --update bash curl \
#     && apk upgrade \
#     && curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin v0.55.0

COPY --from=build /go/deepfence_worker/deepfence_worker /usr/local/bin/deepfence_worker
COPY --from=packagescanner /usr/local/bin/syft /usr/local/bin/syft
COPY --from=packagescanner /usr/local/bin/grype /usr/local/bin/grype
COPY --from=build /go/deepfence_worker/entrypoint.sh /entrypoint.sh
COPY --from=build /go/deepfence_worker/grype.yaml /usr/local/bin/grype.yaml
COPY --from=build /go/deepfence_worker/secretscan-config.yaml /config.yaml
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_worker"]

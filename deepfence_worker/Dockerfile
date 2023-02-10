ARG DF_IMG_TAG=latest
ARG IMAGE_REPOSITORY=deepfenceio
FROM $IMAGE_REPOSITORY/deepfence_package_scanner_ce:$DF_IMG_TAG AS packagescanner
RUN ls -l /usr/local/bin/

FROM golang:1.19-alpine3.17 AS build

RUN apk add --no-cache git make
ADD deepfence_worker /go/deepfence_worker/
ADD golang_deepfence_sdk /go/golang_deepfence_sdk
ADD deepfence_server /go/deepfence_server/
WORKDIR /go/deepfence_worker/
# "make vendor" is run before separately to avoid docker cache invalidation
RUN CGO_ENABLED=0 make deepfence_worker

FROM alpine:3.17 AS final
LABEL MAINTAINER="Deepfence Inc"
LABEL deepfence.role=system

RUN apk add --no-cache kafkacat docker openrc bash

ENV DEEPFENCE_KAFKA_TOPIC_PARTITIONS=3 \
    DEEPFENCE_KAFKA_TOPIC_REPLICAS=1 \
    DEEPFENCE_KAFKA_TOPIC_RETENTION_MS="86400000" \
    DEEPFENCE_MODE=worker

# RUN apk add --no-cache --update bash curl \
#     && apk upgrade \
#     && curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin v0.55.0

COPY --from=build /go/deepfence_worker/deepfence_worker /usr/local/bin/deepfence_worker
COPY --from=packagescanner /usr/local/bin/syft /usr/local/bin/syft
COPY --from=packagescanner /usr/local/bin/grype /usr/local/bin/grype
COPY --from=build /go/deepfence_worker/entrypoint.sh /entrypoint.sh
COPY --from=build /go/deepfence_worker/grype.yaml /usr/local/bin/grype.yaml
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_worker"]

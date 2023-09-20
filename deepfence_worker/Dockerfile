ARG DF_IMG_TAG=latest
ARG IMAGE_REPOSITORY=deepfenceio
FROM $IMAGE_REPOSITORY/deepfence_package_scanner_ce:$DF_IMG_TAG AS packagescanner
FROM $IMAGE_REPOSITORY/deepfence_secret_scanner_ce:$DF_IMG_TAG AS secretscanner
FROM $IMAGE_REPOSITORY/deepfence_malware_scanner_ce:$DF_IMG_TAG AS yarahunter
FROM surnet/alpine-wkhtmltopdf:3.17.0-0.12.6-full as wkhtmltopdf
FROM $IMAGE_REPOSITORY/deepfence_builder_ce:$DF_IMG_TAG AS builder-yara

FROM alpine:3.18 AS final
LABEL MAINTAINER="Deepfence Inc"
LABEL deepfence.role=system

ADD deepfence_server/cloud_controls /cloud_controls
ADD deepfence_utils/postgresql/migrate /usr/local/postgresql-migrate

RUN apk add --no-cache curl kafkacat docker-cli openrc bash skopeo jansson-dev \
        libmagic libstdc++ libx11 libxrender libxext libssl1.1 ca-certificates \
        fontconfig freetype ttf-droid ttf-freefont ttf-liberation postgresql15-client
RUN apk add hyperscan --repository=https://dl-cdn.alpinelinux.org/alpine/v3.13/community

RUN curl -fsSL https://raw.githubusercontent.com/pressly/goose/master/install.sh | sh

ENV DEEPFENCE_KAFKA_TOPIC_PARTITIONS=3 \
    DEEPFENCE_KAFKA_TOPIC_PARTITIONS_TASKS=3 \
    DEEPFENCE_KAFKA_TOPIC_REPLICAS=1 \
    DEEPFENCE_KAFKA_TOPIC_RETENTION_MS="86400000" \
    DEEPFENCE_DEBUG=false \
    DEEPFENCE_MODE=worker \
    LD_LIBRARY_PATH=/usr/local/yara/lib \
    GRYPE_DB_UPDATE_URL="http://deepfence-file-server:9000/database/database/vulnerability/listing.json"

# RUN apk add --no-cache --update bash curl \
#     && apk upgrade \
#     && curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin v0.55.0

COPY --from=wkhtmltopdf /bin/wkhtmltopdf /bin/libwkhtmltox.so /bin/

COPY --from=packagescanner /usr/local/bin/syft /usr/local/bin/syft
COPY --from=packagescanner /usr/local/bin/grype /usr/local/bin/grype
COPY --from=packagescanner /root/.grype.yaml /usr/local/bin/grype.yaml

COPY --from=secretscanner /home/deepfence/usr/config.yaml /config.yaml

COPY --from=yarahunter /home/deepfence/usr/config.yaml /malware-config/config.yaml

COPY ./deepfence_worker/deepfence_worker /usr/local/bin/deepfence_worker
COPY ./deepfence_worker/entrypoint.sh /entrypoint.sh

COPY --from=builder-yara /root/yara-rules /usr/local/yara-rules

COPY --from=builder-yara /usr/local/yara.tar.gz /usr/local/yara.tar.gz
# extract yara
RUN tar -xzf /usr/local/yara.tar.gz -C /usr/local/ \
    && rm /usr/local/yara.tar.gz \
    && chmod +x /entrypoint.sh \
    && sed -i 's/auto-update: true/auto-update: false/g' /usr/local/bin/grype.yaml \
    && echo "0 */2 * * * /usr/local/bin/grype db update" >> /etc/crontabs/root

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_worker"]

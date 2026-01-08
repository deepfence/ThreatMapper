ARG DF_IMG_TAG=latest
ARG IMAGE_REPOSITORY=deepfenceio

FROM $IMAGE_REPOSITORY/deepfence_package_scanner_ce:$DF_IMG_TAG AS packagescanner
FROM $IMAGE_REPOSITORY/deepfence_secret_scanner_ce:$DF_IMG_TAG AS secretscanner
FROM $IMAGE_REPOSITORY/deepfence_malware_scanner_ce:$DF_IMG_TAG AS yarahunter
FROM $IMAGE_REPOSITORY/deepfence_glibc_builder_ce:$DF_IMG_TAG AS builder-yara

FROM debian:trixie-slim AS final

ARG AGENT_BINARY_DIST_RELATIVE

LABEL MAINTAINER="Deepfence Inc"
LABEL deepfence.role=system

ADD deepfence_utils/postgresql/migrate /usr/local/postgresql-migrate

RUN apt-get update && apt install -y curl && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install docker-ce-cli -y

RUN apt install -y \
    cron \
    netcat-traditional \
    kafkacat \
    bash \
    skopeo \
    libjansson-dev \
    libmagic-dev \
    libstdc++6 \
    libssl3 \
    ca-certificates \
    postgresql-client \
    libvectorscan5 \
    gdb \
    strace && \
    apt clean && \
    apt autoclean && \
    apt auto-remove -y && \
    rm -rf /var/lib/{apt,dpkg,cache,log}/

RUN curl -fsSL https://raw.githubusercontent.com/pressly/goose/master/install.sh | sh

ENV DEEPFENCE_KAFKA_TOPIC_PARTITIONS=3 \
    DEEPFENCE_KAFKA_TOPIC_PARTITIONS_TASKS=3 \
    DEEPFENCE_KAFKA_TOPIC_REPLICAS=1 \
    DEEPFENCE_KAFKA_TOPIC_RETENTION_MS="86400000" \
    DEEPFENCE_DEBUG=false \
    DEEPFENCE_MODE=worker \
    LD_LIBRARY_PATH=/usr/local/yara/lib

# ENV GRYPE_DB_UPDATE_URL="http://${DEEPFENCE_FILE_SERVER_HOST}:${DEEPFENCE_FILE_SERVER_PORT}/database/database/vulnerability/listing.json"

# RUN apk add --no-cache --update bash curl \
#     && apk upgrade \
#     && curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin v0.55.0


COPY --from=packagescanner /usr/local/bin/syft /usr/local/bin/syft
COPY --from=packagescanner /usr/local/bin/grype /usr/local/bin/grype
COPY --from=packagescanner /root/.grype.yaml /usr/local/bin/grype.yaml

COPY --from=secretscanner /home/deepfence/usr/config.yaml /secret-config/config.yaml

COPY --from=yarahunter /home/deepfence/usr/config.yaml /malware-config/config.yaml

COPY ./deepfence_worker/deepfence_worker /usr/local/bin/deepfence_worker
COPY ./deepfence_worker/entrypoint.sh /entrypoint.sh

# COPY --from=builder-yara /root/yara-rules /usr/local/yara-rules

COPY --from=builder-yara /usr/local/yara.tar.gz /usr/local/yara.tar.gz
# extract yara
RUN tar -xzf /usr/local/yara.tar.gz -C /usr/local/ \
    && rm /usr/local/yara.tar.gz \
    && chmod +x /entrypoint.sh \
    && mkdir -p /opt/deepfence

COPY ./deepfence_agent/binary-install-scripts/* /opt/deepfence/
COPY ./${AGENT_BINARY_DIST_RELATIVE}/* /opt/deepfence/

COPY --from=builder-yara /go/bin/asynq /usr/local/bin/asynq

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/local/bin/deepfence_worker"]

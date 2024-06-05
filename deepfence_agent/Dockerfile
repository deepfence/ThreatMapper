ARG DF_IMG_TAG=latest
ARG IMAGE_REPOSITORY=deepfenceio

FROM $IMAGE_REPOSITORY/deepfence_secret_scanner_ce:$DF_IMG_TAG AS secret_build
FROM $IMAGE_REPOSITORY/deepfence_package_scanner_ce:$DF_IMG_TAG AS package_build
FROM $IMAGE_REPOSITORY/deepfence_malware_scanner_ce:$DF_IMG_TAG AS malware_build
FROM $IMAGE_REPOSITORY/deepfence_compliance_scanner_ce:$DF_IMG_TAG AS compliance_build

FROM debian:12-slim as downloads

ENV DOCKERVERSION="24.0.2" \
    VESSEL_VERSION="0.12.3"\
    NERDCTL_VERSION="1.6.0" \
    CRICTL_VERSION="v1.28.0"

ARG TARGETARCH

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates

# for docker 
RUN <<EOF
set -eux

if [ "$TARGETARCH" = "arm64" ]; then
    echo "export ARCHITECTURE=aarch64" >> /envfile-docker
elif [ "$TARGETARCH" = "amd64" ]; then
    echo "export ARCHITECTURE=x86_64" >> /envfile-docker
else
    echo "Unsupported architecture $TARGETARCH" && exit 1;
fi

EOF

RUN . /envfile-docker; cat /envfile-docker && \
    curl -fsSLO https://download.docker.com/linux/static/stable/${ARCHITECTURE}/docker-${DOCKERVERSION}.tgz && \
    tar xzvf docker-${DOCKERVERSION}.tgz --strip 1 -C /usr/local/bin docker/docker && \
    rm docker-${DOCKERVERSION}.tgz

# for other binary tools
RUN <<EOF
set -eux

if [ "$TARGETARCH" = "arm64" ]; then
    echo "export ARCHITECTURE=arm64" >> /envfile-tools
elif [ "$TARGETARCH" = "amd64" ]; then
    echo "export ARCHITECTURE=amd64" >> /envfile-tools
else
    echo "Unsupported architecture $TARGETARCH" && exit 1
fi

EOF

RUN . /envfile-tools; cat /envfile-tools && \
    curl -fsSLO https://github.com/deepfence/vessel/releases/download/v${VESSEL_VERSION}/vessel_v${VESSEL_VERSION}_linux_${ARCHITECTURE}.tar.gz && \
    tar -xzf vessel_v${VESSEL_VERSION}_linux_${ARCHITECTURE}.tar.gz && \
    mv vessel /usr/local/bin/ && \
    rm -rf vessel_v${VESSEL_VERSION}_linux_${ARCHITECTURE}.tar.gz

RUN . /envfile-tools; cat /envfile-tools && \
    curl -fsSLO https://github.com/containerd/nerdctl/releases/download/v${NERDCTL_VERSION}/nerdctl-${NERDCTL_VERSION}-linux-${ARCHITECTURE}.tar.gz && \
    tar Cxzvvf /usr/local/bin nerdctl-${NERDCTL_VERSION}-linux-${ARCHITECTURE}.tar.gz && \
    rm nerdctl-${NERDCTL_VERSION}-linux-${ARCHITECTURE}.tar.gz

RUN . /envfile-tools; cat /envfile-tools && \
    curl -fsSLO https://github.com/kubernetes-sigs/cri-tools/releases/download/${CRICTL_VERSION}/crictl-${CRICTL_VERSION}-linux-${ARCHITECTURE}.tar.gz && \
    tar zxvf crictl-${CRICTL_VERSION}-linux-${ARCHITECTURE}.tar.gz -C /usr/local/bin && \
    rm -f crictl-${CRICTL_VERSION}-linux-${ARCHITECTURE}.tar.gz


FROM debian:12-slim

MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV CHECKPOINT_DISABLE=true \
    DF_TLS_ON="1" \
    MGMT_CONSOLE_PORT=443 \
    DF_KUBERNETES_ON="N" \
    MGMT_CONSOLE_URL_SCHEMA=https \
    DEEPFENCE_KEY="" \
    MGMT_CONSOLE_URL_INTERNAL=127.0.0.1 \
    MGMT_CONSOLE_PORT_INTERNAL=8081

RUN export LD_LIBRARY_PATH="/usr/local/lib:$LD_LIBRARY_PATH" \
    && mkdir -p /usr/share/man/man1 /usr/share/man/man2 /usr/share/man/man3 /usr/share/man/man4 /usr/share/man/man5 /usr/share/man/man6 /usr/share/man/man7 /usr/share/man/man8 \
    && echo "Installing some basic stuff"

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpcap0.8 \
    gettext \
    ca-certificates \
    supervisor \
    logrotate \
    util-linux \
    dnsutils \
    net-tools \
    cgroup-tools \
    libcap2 \
    libaudit1 \
    conntrack \
    runit \
    auditd \
    apparmor \
    gzip \
    lsof \
    file \
    curl \
    zip \
    at \
    gnupg \
    unzip \
    procps \
    cron \
    sudo \
    bzip2 \
    libssl3 \
    libevent-2.1-7 \
    libevent-openssl-2.1-7 \
    libevent-pthreads-2.1-7 \
    libnet1 \
    gnupg2 \
    libfile-mimeinfo-perl \
    libjansson4 \
    libmagic1 \
    wget \
    bash \
    python3-pip \
    libvectorscan5 \
    skopeo \
    podman && \
    apt-get clean && \
    apt-get -y autoremove && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/license/ /usr/local/bin /usr/local/lib /deepfenced /var/tmp/layers && \
    chown root:root /deepfenced && \
    chmod 0744 /deepfenced && \
    mkdir -p /usr/local/bin/compliance_check && \
    mkdir -p /usr/local/discovery

COPY tools/apache/deepfence/df-utils/get_cloud_instance_id/getCloudInstanceId /usr/local/bin/getCloudInstanceId
COPY etc/fenced_logrotate.conf /etc/logrotate.d/fenced_logrotate.conf
COPY etc/certs/* /etc/filebeat/
COPY start_agent.sh /usr/local/bin/start_agent
COPY tools/apache/scope/docker/discovery /usr/local/discovery/deepfence-discovery
COPY plugins/compliance/scripts /usr/local/bin/compliance_check/scripts
COPY plugins/compliance/config.json /usr/local/bin/compliance_check/config.json
COPY supervisord.conf /home/deepfence/supervisord.conf
COPY run_discovery.sh /home/deepfence/
COPY plugins/etc/run_shipper.sh /home/deepfence/
COPY create_cgroups.sh /home/deepfence/create-cgroups.sh
RUN mkdir -p /home/deepfence/bin && mkdir -p /home/deepfence/bin/secret-scanner/config && mkdir -p /home/deepfence/bin/yara-hunter
# COPY plugins/yara-rules /home/deepfence/bin/yara-hunter/yara-rules
COPY deepfenced /bin/deepfenced
COPY plugins/deepfence_shipper/deepfence_shipper /home/deepfence/bin/shipper
COPY plugins/deepfence_shipper/routes.yaml /home/deepfence/routes.yaml

COPY --from=secret_build /home/deepfence/usr/SecretScanner /home/deepfence/bin/secret-scanner
# COPY --from=secret_build /home/deepfence/usr/config.yaml /home/deepfence/bin/secret-scanner/config
COPY --from=package_build /usr/local/bin/syft /usr/local/bin/syft
COPY --from=package_build /usr/local/bin/package-scanner /home/deepfence/bin
COPY --from=malware_build /usr/local/yara/lib /usr/lib
COPY --from=malware_build /home/deepfence/usr/YaraHunter /home/deepfence/bin/yara-hunter
COPY --from=malware_build /home/deepfence/usr/config.yaml /home/deepfence/bin/yara-hunter
COPY --from=compliance_build /usr/bin/compliance /usr/local/bin/compliance_check/compliance
COPY --from=compliance_build /usr/bin/compliance /home/deepfence/bin/compliance

# copy bins 
COPY --from=downloads /usr/local/bin/docker /usr/local/bin/docker
COPY --from=downloads /usr/local/bin/vessel /usr/local/bin/vessel
COPY --from=downloads /usr/local/bin/nerdctl /usr/local/bin/nerdctl
COPY --from=downloads /usr/local/bin/crictl /usr/local/bin/crictl

RUN chmod 700 /usr/local/bin/getCloudInstanceId \
    && chmod 700 /usr/local/discovery/deepfence-discovery /home/deepfence/run_discovery.sh \
    && chmod +x /home/deepfence/*.sh \
    && cd /tmp \
    && chmod +x /usr/local/bin/start_agent

ENTRYPOINT ["/usr/local/bin/start_agent"]

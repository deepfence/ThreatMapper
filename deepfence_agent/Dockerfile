ARG DF_IMG_TAG=latest
ARG IMAGE_REPOSITORY=deepfenceio
FROM $IMAGE_REPOSITORY/deepfence_package_scanner_ce:$DF_IMG_TAG AS build
FROM $IMAGE_REPOSITORY/deepfence_malware_scanner_ce:$DF_IMG_TAG AS malware_build

FROM debian:bullseye-slim

MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV CHECKPOINT_DISABLE=true \
    DOCKERVERSION=20.10.8 \
    DF_TLS_ON="1" \
    MGMT_CONSOLE_PORT=443 \
    DF_KUBERNETES_ON="N" \
    PACKAGE_SCAN_CONCURRENCY=1 

RUN export LD_LIBRARY_PATH="/usr/local/lib:$LD_LIBRARY_PATH" \
    && mkdir -p /usr/share/man/man1 /usr/share/man/man2 /usr/share/man/man3 /usr/share/man/man4 /usr/share/man/man5 /usr/share/man/man6 /usr/share/man/man7 /usr/share/man/man8 \
    && echo "Installing some basic stuff" \
    && apt-get update && apt-get install -y --no-install-recommends gettext ca-certificates supervisor logrotate util-linux dnsutils net-tools cgroup-tools libcgroup1 libcap2 libaudit1 conntrack runit auditd apparmor gzip lsof file curl zip at gnupg jq unzip procps cron sudo bzip2 libssl1.1 libevent-2.1-7 libevent-openssl-2.1-7 libevent-pthreads-2.1-7 libnet1 gnupg2 libfile-mimeinfo-perl libjansson4 libmagic1 bash python3-pip\
    && echo 'deb https://mirrorcache-us.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/Debian_11/ /' > /etc/apt/sources.list.d/devel:kubic:libcontainers:stable.list \
    && curl -L https://mirrorcache-us.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/Debian_11/Release.key | sudo apt-key add - \
    && apt-get update \
    && apt-get -y install skopeo \
    && echo "Installing docker" \
    && curl -fsSLO https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKERVERSION}.tgz \
    && tar xzvf docker-${DOCKERVERSION}.tgz --strip 1 -C /usr/local/bin docker/docker \
    && rm docker-${DOCKERVERSION}.tgz \
    && mkdir -p /etc/license/ /usr/local/bin /usr/local/lib \
        /deepfenced /var/tmp/layers /usr/local/lua-waf /var/log/nginx/ \
    && chown root:root /deepfenced && chmod 0744 /deepfenced \
    && mkdir /usr/local/bin/compliance_check && mkdir /usr/local/discovery
COPY misc/deepfence/df-utils/agent_auth/agentAuth /usr/local/bin/agentAuth
COPY misc/deepfence/df-utils/get_cloud_instance_id/getCloudInstanceId /usr/local/bin/getCloudInstanceId
COPY etc/fenced_logrotate.conf /etc/logrotate.d/fenced_logrotate.conf
COPY etc/certs/* /etc/filebeat/
COPY start_serverless_services.sh /usr/local/bin/start_services
COPY tools/apache/scope/docker/deepfence_exe /usr/local/discovery/deepfence-discovery
COPY tools/apache/compliance_check /usr/local/bin/compliance_check
COPY plugins/compliance/scripts /usr/local/bin/compliance_check/scripts
COPY plugins/compliance/config.json /usr/local/bin/compliance_check/config.json
COPY plugins/docker_bin/compliance /usr/local/bin/compliance_check/compliance
COPY tools/apache/scope/docker/agent_check.sh /home/deepfence/
COPY supervisord.conf /home/deepfence/supervisord-temp.conf
COPY run_discovery.sh /home/deepfence/
COPY create_cgroups.sh /home/deepfence/created-cgroups.sh
COPY plugins/docker_bin /home/deepfence/bin


FROM golang:1.18.3-bullseye AS builder
MAINTAINER DeepFence

RUN apt-get update  \
    && apt-get -qq -y --no-install-recommends install build-essential automake libtool make gcc pkg-config libssl-dev \
    libjansson-dev libmagic-dev \
    && cd /root  \
    && wget https://github.com/VirusTotal/yara/archive/refs/tags/v4.2.1.tar.gz \
    && tar -zxf v4.2.1.tar.gz \
    && cd yara-4.2.1 \
    && ./configure --prefix=/usr/local/yara --disable-dotnet --enable-magic --enable-cuckoo \
    && make \
    && make install \
    && cd /usr/local/ \
    && tar -czf yara.tar.gz yara

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.27.1 \
    && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.2.0


COPY --from=build /usr/local/bin/syft /usr/local/bin/syft
COPY --from=malware_build  /home/deepfence/usr/YaRadare /home/deepfence/usr/YaRadare
COPY --from=malware_build  /home/deepfence/rules /home/deepfence/rules
COPY --from=malware_build /home/deepfence/usr/config.yaml /home/deepfence/usr/yara-hunter/config.yaml



RUN mkdir -p /home/deepfence/bin/yara-hunter \
    && RUN cd /usr/local/ \
    && tar -xzf yara.tar.gz \
    && rm -rf /usr/local/bin/compliance_check/*.go \
    && chmod 700 /usr/local/bin/agentAuth /usr/local/bin/getCloudInstanceId \
    && chmod 700 /usr/local/discovery/deepfence-discovery /home/deepfence/run_discovery.sh \
    && chmod +x /home/deepfence/*.sh \
    && cd /tmp \
    && chmod +x /usr/local/bin/start_services \
    && apt-get clean && apt-get -y autoremove && rm -rf /var/lib/apt/lists/* \
    && curl -fsSLOk https://github.com/deepfence/vessel/releases/download/v0.5.7/vessel-v0.5.7-linux-amd64.tar.gz \
    && tar -xzf vessel-v0.5.7-linux-amd64.tar.gz \
    && mv vessel /usr/local/bin/ \
    && rm -rf vessel-v0.5.7-linux-amd64.tar.gz \
    && curl -fsSLOk https://github.com/containerd/nerdctl/releases/download/v0.18.0/nerdctl-0.18.0-linux-amd64.tar.gz \
    && tar Cxzvvf /usr/local/bin nerdctl-0.18.0-linux-amd64.tar.gz \
    && rm nerdctl-0.18.0-linux-amd64.tar.gz

RUN apt update && DEBIAN_FRONTEND=noninteractive apt install libhyperscan5

ENTRYPOINT ["/usr/local/bin/start_services"]

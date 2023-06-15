ARG DF_IMG_TAG=latest
ARG IMAGE_REPOSITORY=deepfenceio
FROM $IMAGE_REPOSITORY/deepfence_package_scanner_ce:$DF_IMG_TAG AS build
FROM $IMAGE_REPOSITORY/deepfence_malware_scanner_ce:$DF_IMG_TAG AS malware_build

FROM debian:bullseye-slim

MAINTAINER Deepfence Inc
LABEL deepfence.role=system

ENV CHECKPOINT_DISABLE=true \
    DOCKERVERSION=24.0.2 \
    DF_TLS_ON="1" \
    MGMT_CONSOLE_PORT=443 \
    DF_KUBERNETES_ON="N" \
    PACKAGE_SCAN_CONCURRENCY=1 \
    MGMT_CONSOLE_URL_SCHEMA=https \
    DEEPFENCE_KEY="" \
    MGMT_CONSOLE_URL_INTERNAL=127.0.0.1 \
    MGMT_CONSOLE_PORT_INTERNAL=8081

RUN export LD_LIBRARY_PATH="/usr/local/lib:$LD_LIBRARY_PATH" \
    && mkdir -p /usr/share/man/man1 /usr/share/man/man2 /usr/share/man/man3 /usr/share/man/man4 /usr/share/man/man5 /usr/share/man/man6 /usr/share/man/man7 /usr/share/man/man8 \
    && echo "Installing some basic stuff" \
    && apt-get update && apt-get install -y --no-install-recommends libpcap0.8 gettext ca-certificates supervisor logrotate util-linux dnsutils net-tools cgroup-tools libcgroup1 libcap2 libaudit1 conntrack runit auditd apparmor gzip lsof file curl zip at gnupg  unzip procps cron sudo bzip2 libssl1.1 libevent-2.1-7 libevent-openssl-2.1-7 libevent-pthreads-2.1-7 libnet1 gnupg2 libfile-mimeinfo-perl libjansson4 libmagic1 wget bash python3-pip\
    # && echo 'deb https://mirrorcache-us.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/Debian_11/ /' > /etc/apt/sources.list.d/devel:kubic:libcontainers:stable.list \
    # && curl -L https://mirrorcache-us.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/Debian_11/Release.key | sudo apt-key add - \
    # && apt-get update --allow-insecure-repositories \
    && apt-get -y --allow-unauthenticated install skopeo podman \
    && echo "Installing docker" \
    && curl -fsSLO https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKERVERSION}.tgz \
    && tar xzvf docker-${DOCKERVERSION}.tgz --strip 1 -C /usr/local/bin docker/docker \
    && rm docker-${DOCKERVERSION}.tgz \
    && mkdir -p /etc/license/ /usr/local/bin /usr/local/lib \
        /deepfenced /var/tmp/layers /usr/local/lua-waf /var/log/nginx/ \
    && chown root:root /deepfenced && chmod 0744 /deepfenced \
    && mkdir /usr/local/bin/compliance_check && mkdir /usr/local/discovery \
    && apt update --allow-insecure-repositories && DEBIAN_FRONTEND=noninteractive apt install libhyperscan5

# Installing FluentBit
RUN wget -qO - https://packages.fluentbit.io/fluentbit.key | apt-key add - \
    && echo "deb https://packages.fluentbit.io/debian/buster buster main " >> /etc/apt/sources.list \
    && apt-get update --allow-insecure-repositories \
    && apt-get install -y td-agent-bit=1.6.10 && mkdir -p /etc/td-agent-bit/

COPY tools/apache/fluentbit/* /etc/td-agent-bit/

# Copy fluentbit plugin
COPY tools/apache/fluentbit/out_deepfence/out_deepfence.so /opt/td-agent-bit/bin/
COPY tools/apache/deepfence/df-utils/get_cloud_instance_id/getCloudInstanceId /usr/local/bin/getCloudInstanceId
COPY etc/fenced_logrotate.conf /etc/logrotate.d/fenced_logrotate.conf
COPY etc/certs/* /etc/filebeat/
COPY start_agent.sh /usr/local/bin/start_agent
COPY tools/apache/scope/docker/deepfence_exe /usr/local/discovery/deepfence-discovery
COPY tools/apache/compliance_check /usr/local/bin/compliance_check
COPY plugins/compliance/scripts /usr/local/bin/compliance_check/scripts
COPY plugins/compliance/config.json /usr/local/bin/compliance_check/config.json
COPY plugins/bin/compliance /usr/local/bin/compliance_check/compliance
COPY tools/apache/scope/docker/agent_check.sh /home/deepfence/
COPY supervisord.conf /home/deepfence/supervisord-temp.conf
COPY run_discovery.sh /home/deepfence/
COPY create_cgroups.sh /home/deepfence/create-cgroups.sh
COPY plugins/bin /home/deepfence/bin
COPY plugins/yara-rules /home/deepfence/bin/yara-hunter/yara-rules

COPY --from=build /usr/local/bin/syft /usr/local/bin/syft
COPY --from=malware_build /usr/local/yara/lib /usr/lib

RUN apt-get update --allow-insecure-repositories \
    && apt-get -qq -y --no-install-recommends install libjansson4 libssl1.1 libmagic1 bash curl python3-pip \
    && rm -rf /usr/local/bin/compliance_check/*.go \
    && chmod 700 /usr/local/bin/getCloudInstanceId \
    && chmod 700 /usr/local/discovery/deepfence-discovery /home/deepfence/run_discovery.sh \
    && chmod +x /home/deepfence/*.sh \
    && chmod 600 /etc/td-agent-bit/* \
    && cd /tmp \
    && chmod +x /usr/local/bin/start_agent \
    && apt-get clean && apt-get -y autoremove && rm -rf /var/lib/apt/lists/* \
    && curl -fsSLOk https://github.com/deepfence/vessel/releases/download/v0.11.1/vessel_v0.11.1_linux_amd64.tar.gz \
    && tar -xzf vessel_v0.11.1_linux_amd64.tar.gz \
    && mv vessel /usr/local/bin/ \
    && rm -rf vessel_v0.11.1_linux_amd64.tar.gz \
    && nerdctl_version=1.4.0 \
    && curl -fsSLOk https://github.com/containerd/nerdctl/releases/download/v${nerdctl_version}/nerdctl-${nerdctl_version}-linux-amd64.tar.gz \
    && tar Cxzvvf /usr/local/bin nerdctl-${nerdctl_version}-linux-amd64.tar.gz \
    && rm nerdctl-${nerdctl_version}-linux-amd64.tar.gz \
    && VERSION="v1.27.0" \
    && curl -L https://github.com/kubernetes-sigs/cri-tools/releases/download/$VERSION/crictl-${VERSION}-linux-amd64.tar.gz --output crictl-${VERSION}-linux-amd64.tar.gz \
    && tar zxvf crictl-$VERSION-linux-amd64.tar.gz -C /usr/local/bin \
    && rm -f crictl-$VERSION-linux-amd64.tar.gz

ENTRYPOINT ["/usr/local/bin/start_agent"]

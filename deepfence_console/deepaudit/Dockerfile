FROM golang:1.17-alpine3.14 AS build
RUN apk add --no-cache git \
    && apk add gcc libc-dev libffi-dev
ADD . /go/deepaudit/
WORKDIR /go/deepaudit/
RUN go mod tidy \
    && go build -o deepaudit

FROM python:3.9-alpine3.14
LABEL maintainer="Deepfence Inc"
LABEL deepfence.role=system

ENV PYTHONPATH=/root/cve_scan_registry \
    DOCKERVERSION=20.10.8

COPY --from=build /go/deepaudit/deepaudit /usr/local/bin/deepaudit
COPY dependency-check-6.5.3-release.zip /tmp/
COPY filebeat /etc/filebeat
COPY cve_scan_registry /root/cve_scan_registry
COPY entrypoint.sh /root/entrypoint.sh

RUN apk update --no-cache \
    && apk add --no-cache curl openjdk8-jre bash unzip tar jq p7zip perl-utils skopeo \
    && curl -fsSLO https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKERVERSION}.tgz \
    && tar xzvf docker-${DOCKERVERSION}.tgz --strip 1 -C /usr/local/bin docker/docker \
    && rm docker-${DOCKERVERSION}.tgz \
    && rm -rf /var/cache/apk/* \
    && pip3 install --no-cache-dir --upgrade pip setuptools wheel \
    && pip3 install --no-cache-dir -r /root/cve_scan_registry/requirements.txt \
    && pip3 uninstall setuptools -y \
    && unzip /tmp/dependency-check-6.5.3-release.zip -d /tmp/ \
    && mkdir -p /tmp/dependency-check/data/ \
    && mv /tmp/dependency-check /usr/local/bin/ \
    && chmod -R +x /usr/local/bin/dependency-check \
    && rm /tmp/dependency-check-6.5.3-release.zip \
    && chmod +x /root/entrypoint.sh \
    && rm -rf /usr/lib/python*/ensurepip /usr/local/lib/python*/ensurepip \
    && rm -rf /root/.cache && apk del unzip \
    && rm -f /root/cve_scan_registry/ReadMe.md /root/cve_scan_registry/requirements.txt \
    && wget https://github.com/containerd/nerdctl/releases/download/v0.14.0/nerdctl-0.14.0-linux-amd64.tar.gz \
    && tar Cxzvvf /usr/local/bin nerdctl-0.14.0-linux-amd64.tar.gz \
    && rm nerdctl-0.14.0-linux-amd64.tar.gz
COPY dependencycheck-base-suppression.xml /usr/local/bin/dependency-check/

WORKDIR /root/cve_scan_registry
ENTRYPOINT ["/root/entrypoint.sh"]

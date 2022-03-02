FROM golang:1.17-bullseye AS build

WORKDIR /go/logstashPubSubReader
ADD tasks/logstashPubSubReader /go/logstashPubSubReader/
RUN go build -o logstashPubSubReader .

ADD websocket_api/scope_websocket_client /go/scope_websocket_client
WORKDIR /go/scope_websocket_client
RUN go build -o websocket_client websocket_client.go helper.go main.go node_utils.go \
    && go build -o websocket_server websocket_server.go helper.go main.go node_utils.go

FROM steampipe_build:latest AS steampipe-build

FROM python:3.9-slim-bullseye
LABEL deepfence.role=system

ENV PYTHONUNBUFFERED=1 \
    FLASK_APP=config/app.py \
    MAX_RESULT_WINDOW=50000 \
    POSTGRES_USER_DB_HOST=deepfence-postgres \
    POSTGRES_USER_DB_PORT=5432 \
    POSTGRES_USER_DB_USER=cve \
    POSTGRES_USER_DB_PASSWORD=cve \
    POSTGRES_USER_DB_NAME=users \
    POSTGRES_USER_DB_SSLMODE=disable \
    JWT_ALGORITHM=RS256 \
    ELASTICSEARCH_HOST=deepfence-es \
    ELASTICSEARCH_PORT=9200 \
    ELASTICSEARCH_CVE_DOC_TYPE=cve \
    REDIS_HOST=deepfence-redis \
    REDIS_PORT=6379 \
    REDIS_DB_NUMBER=0 \
    PYTHONPATH=/app/code \
    DOCKERVERSION=20.10.8 \
    AUTHLIB_INSECURE_TRANSPORT=true

COPY ./requirements.txt /tmp/requirements.txt

RUN mkdir -p /usr/share/man/man1 \
    && mkdir -p /usr/share/man/man2 \
    && mkdir -p /usr/share/man/man3 \
    && mkdir -p /usr/share/man/man4 \
    && mkdir -p /usr/share/man/man5 \
    && mkdir -p /usr/share/man/man6 \
    && mkdir -p /usr/share/man/man7 \
    && mkdir -p /usr/share/man/man8 \
    && apt-get update -y \
    && apt-get install wkhtmltopdf -y \
    && apt-get install wget -y \
    && apt-get install -y cron git gnupg2 gettext-base logrotate curl gcc make g++ postgresql-client procps libmagic1 libpq-dev --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/log/supervisor /etc/supervisor/conf.d \
    && mkdir -p /app/code \
    && curl -fsSLO https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKERVERSION}.tgz \
    && tar xzvf docker-${DOCKERVERSION}.tgz --strip 1 -C /usr/local/bin docker/docker \
    && rm docker-${DOCKERVERSION}.tgz \
    && pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt \
    && /bin/sh -c "$(curl -fsSL https://raw.githubusercontent.com/turbot/steampipe/main/install.sh)" \
    && apt-get remove -y git gcc make g++ linux-libc-dev && apt-get clean && apt-get autoclean && apt-get autoremove -y \
    && rm -rf /usr/lib/python*/ensurepip /usr/local/lib/python*/ensurepip

RUN cd /tmp \
    && apt-get update -y \
    && apt-get install -y xfonts-75dpi \
    && wget https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6-1/wkhtmltox_0.12.6-1.buster_amd64.deb \
    && dpkg -i wkhtmltox_0.12.6-1.buster_amd64.deb \
    && ln -s /usr/local/bin/wkhtmltopdf /usr/bin \
    && cd -

ADD supervisord.conf /etc/supervisor/supervisord.conf
ADD supervisord_celery.conf /etc/supervisor/supervisord_celery.conf
ADD supervisord_api.conf /etc/supervisor/supervisord_api.conf

COPY . /app/code
COPY --from=build /go/scope_websocket_client/websocket_client /app/code/websocket_api/websocket_client
COPY --from=build /go/scope_websocket_client/websocket_server /app/code/websocket_api/websocket_server
COPY --from=build /go/logstashPubSubReader/logstashPubSubReader /app/code/tasks/logstashPubSubReader/logstashPubSubReader

RUN chmod +x /app/code/dockerify/api/entrypoint.sh /app/code/dockerify/api/init_es_config.sh /app/code/dockerify/celery/entrypoint.sh /app/code/dockerify/backend/entrypoint.sh \
    && rm -f /app/code/.gitignore /app/code/requirements.txt /app/code/websocket_api/*.go \
    /app/code/dockerify/api/Dockerfile \
    && rm -rf /app/code/.git /app/code/unused /app/code/tests /app/code/scripts /app/code/websocket_api/scope_websocket_client \
    /app/code/dockerify/haproxy /app/code/tasks/logstashPubSubReader/*.go \
    && openssl genrsa -out /app/code/rs256.pem 2048 \
    && openssl rsa -in /app/code/rs256.pem -pubout -outform PEM -out /app/code/rs256.pub

RUN useradd -rm -d /home/ubuntu -s /bin/bash -g root -G sudo -u 1001 -p "$(openssl passwd -1 ubuntu)" ubuntu

USER ubuntu

WORKDIR /home/ubuntu
RUN mkdir -p /home/ubuntu/.steampipe/plugins/hub.steampipe.io/plugins/turbot/aws@latest \
    && mkdir -p /home/ubuntu/.steampipe/plugins/hub.steampipe.io/plugins/turbot/gcp@latest \
    && mkdir -p /home/ubuntu/.steampipe/plugins/hub.steampipe.io/plugins/turbot/azure@latest \
    && mkdir -p /home/ubuntu/.steampipe/config \
    && steampipe plugin install steampipe

COPY --chown=ubuntu:root --from=steampipe-build /go/steampipe-plugin-aws/steampipe-plugin-aws.plugin /home/ubuntu/.steampipe/plugins/hub.steampipe.io/plugins/turbot/aws@latest/steampipe-plugin-aws.plugin
COPY --chown=ubuntu:root --from=steampipe-build /go/steampipe-plugin-gcp/steampipe-plugin-gcp.plugin /home/ubuntu/.steampipe/plugins/hub.steampipe.io/plugins/turbot/gcp@latest/steampipe-plugin-gcp.plugin
COPY --chown=ubuntu:root --from=steampipe-build /go/steampipe-plugin-azure/steampipe-plugin-azure.plugin /home/ubuntu/.steampipe/plugins/hub.steampipe.io/plugins/turbot/azure@latest/steampipe-plugin-azure.plugin
COPY --chown=ubuntu:root --from=steampipe-build /go/steampipe-plugin-aws/config/aws.spc /home/ubuntu/.steampipe/config/aws.spc
COPY --chown=ubuntu:root --from=steampipe-build /go/steampipe-plugin-gcp/config/gcp.spc /home/ubuntu/.steampipe/config/gcp.spc
COPY --chown=ubuntu:root --from=steampipe-build /go/steampipe-plugin-azure/config/azure.spc /home/ubuntu/.steampipe/config/azure.spc

USER root

RUN apt-get clean && apt-get autoclean && apt-get autoremove -y && rm -rf /tmp/*

WORKDIR /app/code
ENTRYPOINT ["/app/code/dockerify/api/entrypoint.sh"]

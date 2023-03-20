ARG DF_IMG_TAG=latest
ARG IMAGE_REPOSITORY=deepfenceio
FROM docker.io/alpine:3.17

MAINTAINER Deepfence Inc
LABEL deepfence.role=system

RUN apk add --update --no-cache nginx

RUN set -e \
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log

COPY default.conf /etc/nginx/http.d/default.conf

RUN rm -f /var/lib/nginx/html/50x.html /var/lib/nginx/html/index.html \
    && mkdir -p /var/lib/nginx/html/store
COPY dist/artifacts.json /var/lib/nginx/html/store
COPY dist/agentAuth.zst /var/lib/nginx/html/store
COPY dist/getCloudInstanceId.zst /var/lib/nginx/html/store
COPY dist/deepfence-discovery.zst /var/lib/nginx/html/store
COPY dist/deepfence_compliance_check.zst /var/lib/nginx/html/store
COPY dist/compliance.zst /var/lib/nginx/html/store
COPY dist/package-scanner.zst /var/lib/nginx/html/store
COPY dist/SecretScanner.zst /var/lib/nginx/html/store

EXPOSE 80

ENTRYPOINT ["/usr/sbin/nginx"]
CMD ["-g", "daemon off;"]

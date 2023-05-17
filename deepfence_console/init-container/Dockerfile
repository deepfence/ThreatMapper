FROM alpine:3.18
LABEL maintainer="Deepfence Inc"
LABEL deepfence.role=system

COPY entrypoint.sh /usr/local/bin

RUN apk add --no-cache --update bash \
    && chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
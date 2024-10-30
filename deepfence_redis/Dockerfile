FROM redis:7.4-alpine3.20

MAINTAINER Deepfence Inc
LABEL deepfence.role=system

COPY redis.conf /usr/local/etc/redis/
COPY df.sh /bin

ENTRYPOINT ["/bin/df.sh"]

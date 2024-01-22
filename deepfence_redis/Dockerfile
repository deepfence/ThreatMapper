FROM redis:7.2-alpine3.19

MAINTAINER Deepfence Inc
LABEL deepfence.role=system

COPY redis.conf /usr/local/etc/redis/
COPY df.sh /bin

ENTRYPOINT ["/bin/df.sh"]

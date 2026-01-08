FROM redis:8.4-alpine3.22

LABEL deepfence.role=system

COPY redis.conf /usr/local/etc/redis/
COPY df.sh /bin

ENTRYPOINT ["/bin/df.sh"]

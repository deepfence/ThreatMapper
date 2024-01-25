FROM jaegertracing/all-in-one:1.53

ENV DEEPFENCE_TELEMETRY_ENABLED="false"

USER root

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER 10001

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

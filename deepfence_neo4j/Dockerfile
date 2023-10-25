FROM neo4j:4.4.25
RUN apt update \
    && apt install rclone -y \
    && mkdir /plugins \
    && wget https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/download/4.4.0.21/apoc-4.4.0.21-all.jar -O /plugins/apoc.jar \
    && chown -R neo4j:neo4j /plugins
COPY df.sh /startup
ENTRYPOINT ["tini", "-g", "--", "/startup/df.sh"]

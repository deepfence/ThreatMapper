FROM neo4j:4.4.21
COPY df.sh /startup
ENTRYPOINT ["tini", "-g", "--", "/startup/df.sh"]

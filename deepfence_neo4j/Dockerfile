FROM neo4j:4.4.25
RUN apt update && apt install rclone -y
COPY df.sh /startup
ENTRYPOINT ["tini", "-g", "--", "/startup/df.sh"]

FROM neo4j:4.4.25
RUN apt update && apt install rclone netcat -y
COPY df.sh /startup
COPY backup_neo4j.sh /usr/local/bin/
COPY load_backup_neo4j.sh /usr/local/bin/
COPY health-check.sh /startup
ENTRYPOINT ["tini", "-g", "--", "/startup/df.sh"]

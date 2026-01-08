FROM neo4j:5.26-community-bullseye
RUN apt update && apt install rclone netcat -y
COPY df.sh /startup
COPY pre-upgrade-to-v5.sh /startup
COPY post-upgrade-to-v5.sh /startup
COPY backup_neo4j.sh /usr/local/bin/
COPY load_backup_neo4j.sh /usr/local/bin/
COPY health-check.sh /startup
ENTRYPOINT ["tini", "-g", "--", "/startup/df.sh"]

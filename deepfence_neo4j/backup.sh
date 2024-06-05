#!/bin/bash
docker run --rm --volumes-from deepfence-neo4j -v $(pwd):/backup ubuntu tar cvf /backup/backup.tar /data

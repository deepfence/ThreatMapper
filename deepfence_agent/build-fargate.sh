#!/bin/bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}

BINPATH="deepfence-agent-bin-$VERSION"

rm -rf $BINPATH

wget https://deepfence-public.s3.amazonaws.com/ThreatStryker/agent-sensor/v2.1.0/30d25325-83fc-4b42-9682-a06cd1249ad9/deepfence-agent-2.tar.gz

mkdir -p fargate/$BINPATH
tar -zxvf deepfence-agent-2.tar.gz -C fargate/$BINPATH/
rm -rf deepfence-agent-2.tar.gz

docker build --network host --rm=true --tag=$IMAGE_REPOSITORY/deepfence_agent_ce:fargate-${DF_IMG_TAG:-latest} -f fargate/Dockerfile.fargate .
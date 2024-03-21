#!/bin/bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}

BINPATH="deepfence-agent-bin-$VERSION"

rm -rf $BINPATH

wget https://deepfence-public.s3.amazonaws.com/ThreatMapper/agent-sensor/v2.1.0/cc11435d-bf5f-4a16-8c92-0a5a27e06b92/deepfence-agent-2.tar.gz

mkdir -p fargate/$BINPATH
tar -zxvf deepfence-agent-2.tar.gz -C fargate/$BINPATH/
rm -rf deepfence-agent-2.tar.gz

docker build --build-arg BINPATH="$BINPATH" --network host --rm=true --tag=$IMAGE_REPOSITORY/deepfence_agent_ce:fargate-${DF_IMG_TAG:-latest} -f fargate/Dockerfile.fargate .

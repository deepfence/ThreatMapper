#!/bin/bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}

rm -rf $AGENT_BINARY_BUILD/*

wget https://deepfence-public.s3.amazonaws.com/ThreatMapper/agent-sensor/v2.1.0/cc11435d-bf5f-4a16-8c92-0a5a27e06b92/deepfence-agent-2.tar.gz

tar -zxvf deepfence-agent-2.tar.gz -C $AGENT_BINARY_BUILD/
rm -rf deepfence-agent-2.tar.gz

docker build --build-arg AGENT_BINARY_BUILD_RELATIVE="$AGENT_BINARY_BUILD_RELATIVE" --network host --rm=true --tag=$IMAGE_REPOSITORY/deepfence_agent_ce:fargate-${DF_IMG_TAG:-latest} -f agent-binary/Dockerfile.fargate ..

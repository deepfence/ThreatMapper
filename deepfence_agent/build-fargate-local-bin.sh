#!/bin/bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}

docker build --build-arg AGENT_BINARY_BUILD_RELATIVE="$AGENT_BINARY_BUILD_RELATIVE" --network host --rm=true --tag=$IMAGE_REPOSITORY/deepfence_agent_ce:fargate-${DF_IMG_TAG:-latest} -f agent-binary/Dockerfile.fargate ..

#!/bin/bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}

tar -zxvf fargate/$AGENT_BINARY_DIR.tar.gz -C fargate/

docker build --build-arg AGENT_BINARY_DIR="$AGENT_BINARY_DIR" --network host --rm=true --tag=$IMAGE_REPOSITORY/deepfence_agent_ce:fargate-${DF_IMG_TAG:-latest} -f fargate/Dockerfile.fargate .

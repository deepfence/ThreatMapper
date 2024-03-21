#!/bin/bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}

BINPATH="deepfence-agent-bin-$VERSION"

tar -zxvf fargate/$BINPATH.tar.gz -C fargate/

docker build --build-arg BINPATH="$BINPATH" --network host --rm=true --tag=$IMAGE_REPOSITORY/deepfence_agent_ce:fargate-${DF_IMG_TAG:-latest} -f fargate/Dockerfile.fargate .

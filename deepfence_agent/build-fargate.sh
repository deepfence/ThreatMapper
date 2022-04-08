#!/bin/bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}

building_image(){

    echo "Building Scope"
    cd tools/apache/scope
    make realclean && make scope.tar
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Scope build failed, bailing out"
        exit 1
    fi
    docker tag weaveworks/scope $IMAGE_REPOSITORY/deepfence_discovery_ce:${DF_IMG_TAG:-latest}
    cd -

    docker build --network host --rm=true --tag=$IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} -f build/Dockerfile .
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence build image building failed, bailing out"
        exit 1
    fi
    docker run --rm -it -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} bash -x /home/deepfence/gocode-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence code compilation failed, bailing out"
        exit 1
    fi

    wget -P fargate/misc https://deepfence-public.s3.amazonaws.com/ThreatMapper/fargate/scanners-1.3.0.tar.gz

    rm -rf fargate/bin
    wget https://deepfence-public.s3.amazonaws.com/ThreatMapper/fargate/fargate_bin.zip
    unzip fargate_bin.zip -d fargate
    rm fargate_bin.zip

    echo "Building Agent"
    docker build --network host --rm=true --tag=$IMAGE_REPOSITORY/deepfence_fargate_agent_ce:${DF_IMG_TAG:-latest} -f fargate/Dockerfile.scratch .
}


main () {
    building_image "$@"
}
main "$@"

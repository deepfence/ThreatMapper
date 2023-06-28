#!/bin/bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}
DF_IMG_TAG=${DF_IMG_TAG:-latest}
GIT_COMMIT=$(git rev-parse --short HEAD)

building_image(){

    echo "Building GetCloudInstanceId"
    docker run --rm -i -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_builder_ce:$DF_IMG_TAG bash -x /home/deepfence/gocode-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence code compilation failed, bailing out"
        exit 1
    fi

    echo "Building Fluentbit deepfence output plugin"
    docker run --rm -i -v $(pwd)/../golang_deepfence_sdk:/go/src/github.com/deepfence/golang_deepfence_sdk -v $(pwd)/../deepfence_utils:/go/src/github.com/deepfence/deepfence_utils -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_builder_ce:$DF_IMG_TAG bash -x /home/deepfence/deepfence-out-plugin-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Fluentbit deepfence out plugins build failed, bailing out"
        exit 1
    fi

    echo "Building Agent Executable"
    docker run --rm -i -v $(pwd)/../golang_deepfence_sdk:/go/src/github.com/deepfence/golang_deepfence_sdk -v $(pwd)/../deepfence_utils:/go/src/github.com/deepfence/deepfence_utils -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host -e GIT_COMMIT="$GIT_COMMIT" $IMAGE_REPOSITORY/deepfence_agent_builder_ce:$DF_IMG_TAG bash -x /home/deepfence/agent-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Agent executable build failed, bailing out"
        exit 1
    fi

    echo "Building Cluster Agent Image"
    docker build --network host --rm=true --tag=$IMAGE_REPOSITORY/deepfence_cluster_agent_ce:$DF_IMG_TAG -f tools/apache/scope/docker/Dockerfile.cluster-agent tools/apache
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence cluster agent building failed, bailing out"
        exit 1
    fi

    echo "Building Agent Image"
    docker build --network host --rm=true --build-arg DF_IMG_TAG="${DF_IMG_TAG}" --build-arg IMAGE_REPOSITORY="${IMAGE_REPOSITORY}" --tag=$IMAGE_REPOSITORY/deepfence_agent_ce:$DF_IMG_TAG -f Dockerfile .
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence agent building failed, bailing out"
        exit 1
    fi
}


main () {
    building_image "$@"
}
main "$@"

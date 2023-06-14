#!/bin/bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}

building_image(){

    docker build --network host --rm=true --tag=$IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} -f build/Dockerfile .
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence build image building failed, bailing out"
        exit 1
    fi

    echo "Prepare plugins"
    (cd plugins && ./bootstrap.sh)

    docker run --rm -it -v $(pwd)/../deepfence_server_client:/go/src/github.com/deepfence/deepfence_server_client -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} bash -x /home/deepfence/gocode-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence code compilation failed, bailing out"
        exit 1
    fi

    echo "Building Agent Plugins protobuf"
    docker run --rm -it -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} bash -x /home/deepfence/grpccode-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Agent plugins gRPC code compilation failed, bailing out"
        exit 1
    fi

    echo "Building Agent Plugins binaries"
    docker run --rm -it -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} bash -x /home/deepfence/plugincode-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Agent plugins build failed, bailing out"
        exit 1
    fi

    echo "Building Fluentbit deepfence output plugin"
    docker run --rm -it -v $(pwd)/../golang_deepfence_sdk:/go/src/github.com/deepfence/golang_deepfence_sdk -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} bash -x /home/deepfence/deepfence-out-plugin-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Fluentbit deepfence out plugins build failed, bailing out"
        exit 1
    fi

    echo "Building Agent Executable"
    docker run --rm -it -v $(pwd)/../golang_deepfence_sdk:/go/src/github.com/deepfence/golang_deepfence_sdk -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} bash -x /home/deepfence/agent-build
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Agent executable build failed, bailing out"
        exit 1
    fi

    echo "Building Cluster Agent Image"
    cd tools/apache
    docker build --network host --rm=true --tag=$IMAGE_REPOSITORY/deepfence_discovery_ce:${DF_IMG_TAG:-latest} -f scope/docker/Dockerfile.cluster-agent .
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence cluster agent building failed, bailing out"
        exit 1
    fi
    cd -

    echo "Building Agent Image"
    docker build --network host --rm=true --build-arg DF_IMG_TAG="${DF_IMG_TAG:-latest}" --build-arg IMAGE_REPOSITORY="${IMAGE_REPOSITORY}" --tag=$IMAGE_REPOSITORY/deepfence_agent_ce:"${DF_IMG_TAG:-latest}" -f Dockerfile .
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

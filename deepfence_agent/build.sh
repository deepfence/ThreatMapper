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

    docker run --rm -it -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} bash -x /home/deepfence/gocode-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence code compilation failed, bailing out"
        exit 1
    fi

    echo "Building Scope Plugins protobuf"
    docker run --rm -it -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} bash -x /home/deepfence/grpccode-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Scope plugins gRPC code compilation failed, bailing out"
        exit 1
    fi

    echo "Building Scope Plugins binaries"
    docker run --rm -it -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} bash -x /home/deepfence/plugincode-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Scope plugins build failed, bailing out"
        exit 1
    fi

    echo "Building Fluentbit deepfence output plugin"
    docker run --rm -it -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_agent_build_ce:${DF_IMG_TAG:-latest} bash -x /home/deepfence/deepfence-out-plugin-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Fluentbit deepfence out plugins build failed, bailing out"
        exit 1
    fi

    echo "Building Scope"
    cd tools/apache/scope
    make realclean && go mod vendor && make scope.tar
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Scope build failed, bailing out"
        exit 1
    fi
    docker tag weaveworks/scope $IMAGE_REPOSITORY/deepfence_discovery_ce:${DF_IMG_TAG:-latest}
    cd -



    echo "Building Agent"
    docker build --network host --rm=true --build-arg DF_IMG_TAG="${DF_IMG_TAG:-latest}" --build-arg IMAGE_REPOSITORY="${IMAGE_REPOSITORY}" --tag=$IMAGE_REPOSITORY/deepfence_agent_ce:"${DF_IMG_TAG:-latest}" -f Dockerfile .
}


main () {
    building_image "$@"
}
main "$@"

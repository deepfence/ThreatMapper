#!/bin/bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}
DF_IMG_TAG=${DF_IMG_TAG:-latest}
STEAMPIPE_IMG_TAG=${STEAMPIPE_IMG_TAG:-latest}
VERSION=${VERSION:-v2.2.0}

building_image(){

    echo "Building GetCloudInstanceId"
    docker run --rm --workdir /go/src/github.com/deepfence/deepfence_agent -v $(pwd)/../deepfence_utils:/go/src/github.com/deepfence/deepfence_utils -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_builder_ce:$DF_IMG_TAG bash -x /home/deepfence/gocode-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence code compilation failed, bailing out"
        exit 1
    fi

    echo "Building Shipper Executable"
    docker run --rm --workdir /go/src/github.com/deepfence/deepfence_agent -v $(pwd)/../golang_deepfence_sdk:/go/src/github.com/deepfence/golang_deepfence_sdk -v $(pwd)/../deepfence_utils:/go/src/github.com/deepfence/deepfence_utils -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host -e VERSION=${VERSION} $IMAGE_REPOSITORY/deepfence_builder_ce:$DF_IMG_TAG bash -c "cd plugins/deepfence_shipper && make"
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Shipper executable build failed, bailing out"
        exit 1
    fi

    echo "Building Cloud Agent Image"
    docker build --network host --rm=true --build-arg VERSION=$VERSION --build-arg IMAGE_REPOSITORY=$IMAGE_REPOSITORY --build-arg STEAMPIPE_IMG_TAG=$STEAMPIPE_IMG_TAG --tag=$IMAGE_REPOSITORY/cloud-scanner:$DF_IMG_TAG -f Dockerfile.cloud-agent .
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence cloud agent building failed, bailing out"
        exit 1
	fi
}


main () {
    building_image "$@"
}
main "$@"

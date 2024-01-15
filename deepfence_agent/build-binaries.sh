#!/bin/bash

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}
DF_IMG_TAG=${DF_IMG_TAG:-latest}
GIT_COMMIT=$(git rev-parse --short HEAD)


build_binaries()(){
    echo "Building GetCloudInstanceId"
    docker run --rm --workdir /go/src/github.com/deepfence/deepfence_agent -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_builder_ce:$DF_IMG_TAG bash -x /home/deepfence/gocode-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Deepfence code compilation failed, bailing out"
        exit 1
    fi

    echo "Prepare Fluentbit"
    docker run --rm --workdir /go/src/github.com/deepfence/deepfence_agent  -v $(pwd)/../golang_deepfence_sdk:/go/src/github.com/deepfence/golang_deepfence_sdk -v $(pwd)/../deepfence_utils:/go/src/github.com/deepfence/deepfence_utils -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_glibc_builder_ce:$DF_IMG_TAG bash -c "\
        mkdir -p plugins/fluent-bit/build && \
        cd plugins/fluent-bit/build && \
        cmake \
        -DFLB_WASM=No \
        -DFLB_LUAJIT=No \
        -DFLB_DEBUG=No \
        -DFLB_RELEASE=Yes \
        -DFLB_SHARED_LIB=No \
        -DCMAKE_FIND_LIBRARY_SUFFIXES='.a' \
        -DFLB_CONFIG_YAML=Off \
        -DBUILD_SHARED_LIBS=OFF \
        -DCMAKE_EXE_LINKER_FLAGS='-static' \
        -DOPENSSL_USE_STATIC_LIBS=Yes \
        -DZLIB_USE_STATIC_LIBS=Yes \
        -DCMAKE_C_FLAGS='-fcommon' \
        .."
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Fluentbit deepfence out plugins build failed, bailing out"
        exit 1
    fi

    echo "Building Fluentbit deepfence output plugin"
    docker run --rm --workdir /go/src/github.com/deepfence/deepfence_agent  -v $(pwd)/../golang_deepfence_sdk:/go/src/github.com/deepfence/golang_deepfence_sdk -v $(pwd)/../deepfence_utils:/go/src/github.com/deepfence/deepfence_utils -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_glibc_builder_ce:$DF_IMG_TAG bash -c "cd plugins/fluent-bit/plugins/out_deepfence && make out_deepfence.a"
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Fluentbit deepfence out plugins build failed, bailing out"
        exit 1
    fi

    echo "Building Fluentbit"
    docker run --rm --workdir /go/src/github.com/deepfence/deepfence_agent  -v $(pwd)/../golang_deepfence_sdk:/go/src/github.com/deepfence/golang_deepfence_sdk -v $(pwd)/../deepfence_utils:/go/src/github.com/deepfence/deepfence_utils -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host $IMAGE_REPOSITORY/deepfence_glibc_builder_ce:$DF_IMG_TAG bash -c "cd plugins/fluent-bit/build \
        && make flb-plugin-out_deepfence\
        && cp ../plugins/out_deepfence/out_deepfence.a ./library/libflb-plugin-out_deepfence.a\
        && make"
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Fluentbit deepfence out plugins build failed, bailing out"
        exit 1
    fi

    echo "Building Agent Executable"
    docker run --rm --workdir /go/src/github.com/deepfence/deepfence_agent -v $(pwd)/../golang_deepfence_sdk:/go/src/github.com/deepfence/golang_deepfence_sdk -v $(pwd)/../deepfence_utils:/go/src/github.com/deepfence/deepfence_utils -v $(pwd):/go/src/github.com/deepfence/deepfence_agent:rw --net=host -e GIT_COMMIT="$GIT_COMMIT" $IMAGE_REPOSITORY/deepfence_builder_ce:$DF_IMG_TAG bash -x /home/deepfence/agent-build.sh
    build_result=$?
    if [ $build_result -ne 0 ]
    then
        echo "Agent executable build failed, bailing out"
        exit 1
    fi
}

create_tarball() {
    echo "Creating tarball of binaries"
    tar czvf binaries.tar.gz binary1 binary2 binary3
}

main() {
    build_binaries
    create_tarball
}

main "$@"

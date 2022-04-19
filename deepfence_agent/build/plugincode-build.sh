#!/bin/bash

cp -R plugins /tmp
cd /tmp/plugins
make clean
make bin/open-tracer
build_result=$?
if [ $build_result -ne 0 ]
then
    exit 1
fi
make bin/package-scanner
build_result=$?
if [ $build_result -ne 0 ]
then
    exit 1
fi
make bin/SecretScanner
build_result=$?
if [ $build_result -ne 0 ]
then
    exit 1
fi
cd /go/src/github.com/deepfence/deepfence_agent
rm -rf ./plugins/docker_bin
mkdir ./plugins/docker_bin 2>/dev/null
cp /tmp/plugins/bin/* ./plugins/docker_bin

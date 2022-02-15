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
make bin/SecretScanner
build_result=$?
if [ $build_result -ne 0 ]
then
    exit 1
fi
make bin/vulnerability_sbom_plugin
build_result=$?
if [ $build_result -ne 0 ]
then
    exit 1
fi
cd -
rm -rf ./plugins/docker_bin
mkdir ./plugins/docker_bin 2>/dev/null
cp /tmp/plugins/bin/* ./plugins/docker_bin

#!/bin/bash

cp -R plugins /tmp
cd /tmp/plugins
make clean
make bin/open_tracer
build_result=$?
if [ $build_result -ne 0 ]
then
    exit 1
fi
cd -
mkdir ./plugins/docker_bin 2>/dev/null
cp /tmp/plugins/bin/* ./plugins/docker_bin

#!/bin/bash

cp -R plugins /tmp && cd /tmp/plugins && make clean && make proto -B
build_result=$?
if [ $build_result -ne 0 ]
then
    exit 1
fi
cd -
rm -rf ./tools/apache/scope/proto
mkdir ./tools/apache/scope/proto 2>/dev/null
cp /tmp/plugins/proto/*.go ./tools/apache/scope/proto
cp /tmp/plugins/proto/*.go ./plugins/agent-plugins-grpc/proto
mkdir -p ./plugins/proto && cp /tmp/plugins/proto/*.go ./plugins/proto

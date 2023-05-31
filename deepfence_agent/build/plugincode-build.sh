#!/bin/bash

cp -R plugins /tmp
cd /tmp/plugins

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

make bin/compliance
build_result=$?
if [ $build_result -ne 0 ]
then
    exit 1
fi

make bin/YaraHunter
build_result=$?
if [ $build_result -ne 0 ]
then
    exit 1
fi

cd /go/src/github.com/deepfence/deepfence_agent
mkdir ./plugins/bin 2>/dev/null
cp -r /tmp/plugins/bin/* ./plugins/bin

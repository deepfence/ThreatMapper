#!/bin/bash

echo "Building Deepfence Agent"
make agent
build_result=$?
if [ $build_result -ne 0 ]
then
    exit 1
fi

#!/bin/bash

echo "Checking and installing dependencies"
bash /home/deepfence/check-deps.sh
build_result=$?
if [ $build_result -ne 0 ]
then
    echo "Dependencies installation failed, bailing out"
    exit 1
fi
echo "Building Deepfence Go binaries"
make all

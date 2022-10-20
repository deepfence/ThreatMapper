#!/bin/bash

cd plugins
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

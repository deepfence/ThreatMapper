#!/bin/bash

git submodule update --init --remote --recursive ./SecretScanner
git submodule update --init --remote --recursive ./open-tracer
git submodule update --init --remote --recursive ./agent-plugins-grpc
git submodule update --init --remote --recursive ./package-scanner
exit 0

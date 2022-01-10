#!/bin/bash

git submodule update --init --remote --recursive ./SecretScanner
git submodule update --init --remote --recursive ./open-tracer
git submodule update --init --remote --recursive ./agent-plugins-grpc
mkdir bin 2>/dev/null
mkdir proto 2>/dev/null
exit 0

#!/bin/bash

git submodule update --init --remote --recursive ./open-tracer
git submodule update --init --remote --recursive ./agent-plugins-grpc
git submodule update --init --remote --recursive ./vulnerability-sbom-plugin
mkdir bin 2>/dev/null
mkdir proto 2>/dev/null
exit 0

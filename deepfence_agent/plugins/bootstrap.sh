#!/bin/bash

git submodule update --init --remote --recursive ./SecretScanner
git submodule update --init --remote --recursive ./YaraHunter
#git submodule update --init --remote --recursive ./open-tracer
git submodule update --init --remote --recursive ./agent-plugins-grpc
git submodule update --init --remote --recursive ./package-scanner
git submodule update --init --remote --recursive ./compliance
exit 0

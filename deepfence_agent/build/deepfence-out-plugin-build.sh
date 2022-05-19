#!/bin/bash

cp -R tools/apache/fluentbit/out_deepfence /tmp
cd /tmp/out_deepfence
make

cd /go/src/github.com/deepfence/deepfence_agent
cp /tmp/out_deepfence/out_deepfence.so ./tools/apache/fluentbit/out_deepfence/
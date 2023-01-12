#!/bin/bash

sleep 5
until curl --output /dev/null --silent --fail "http://deepfence-api:9998/deepfence/v1.5/initialize-redis"; do
    printf '.'
    sleep 5
done
echo "Redis initialized"
#!/bin/bash

sleep 5
until curl -s "http://deepfence-api:9998/deepfence/v1.5/initialize-redis"; do
  sleep 5
done
echo "Redis initialized"
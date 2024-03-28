#!/bin/bash

ps -aux | grep df-agent | awk '{print $2}' | xargs kill -9

rm -rf /opt/deepfence

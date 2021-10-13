#!/bin/bash

 Check if deepfence-agent container is running or not.
# Returns:
#   "deepfence-agent" if running
#   "" if not running

agent_running=$(docker ps --format '{{.Names}}' | grep  "deepfence-agent")
if [[ "$agent_running" = "deepfence-agent" ]]; then
    echo "running"
elif [[ "$agent_running" = *"deepfence-agent"* ]]; then
    echo "running"
else
    echo "not_running"
fi
exit 0


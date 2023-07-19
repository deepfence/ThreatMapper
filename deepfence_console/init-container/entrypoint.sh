#!/bin/bash

# Required for redis
sysctl -w net.core.somaxconn=512
sysctl vm.overcommit_memory=1

# Required for deepfence-backend
sysctl -w net.core.somaxconn=10240
sysctl -w net.ipv4.tcp_mem="1048576 1048576 6291456"
sysctl -w net.ipv4.tcp_max_syn_backlog=1024
sysctl -w net.ipv4.ip_local_port_range="1024 65534"
sysctl -w fs.nr_open=1048576
sysctl -w fs.file-max=1048576

# Required for deepfence-es-master
sysctl -w vm.max_map_count=262144

tail -f /dev/null

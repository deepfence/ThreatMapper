#!/bin/bash

# add hard-limits to cgroup created for container

echo 20000 > /sys/fs/cgroup/cpu/cpu.cfs_quota_us

# create three cgroups named high, medium-1, medium-2

cgcreate -a root -t $USER:$USER -g cpu:high
cgcreate -a root -t $USER:$USER -g cpu:medium_1
cgcreate -a root -t $USER:$USER -g cpu:medium_2

# add appropriate cpu-shares

echo 512 > /sys/fs/cgroup/cpu/high/cpu.shares
echo 256 > /sys/fs/cgroup/cpu/medium_1/cpu.shares
echo 256 > /sys/fs/cgroup/cpu/medium_2/cpu.shares



#!/bin/bash

set -e

create_cgroups() {
    # create three cgroups named high, medium-1, medium-2
    cgcreate -a root -t $USER:$USER -g cpu:high
    cgcreate -a root -t $USER:$USER -g cpu:medium_1
    cgcreate -a root -t $USER:$USER -g cpu:medium_2
}

manage_cgroups_v1() {
    # add hard-limits to cgroup created for container
    echo 50000 > /sys/fs/cgroup/cpu/cpu.cfs_quota_us

    create_cgroups

    # add appropriate cpu-shares
    echo 512 > /sys/fs/cgroup/cpu/high/cpu.shares
    echo 256 > /sys/fs/cgroup/cpu/medium_1/cpu.shares
    echo 256 > /sys/fs/cgroup/cpu/medium_2/cpu.shares
}

manage_cgroups_v2() {
    echo "50000 100000" > /sys/fs/cgroup/cpu.max

    create_cgroups

    # add appropriate cpu-shares
    echo 512 > /sys/fs/cgroup/high/cpu.weight
    echo 256 > /sys/fs/cgroup/medium_1/cpu.weight
    echo 256 > /sys/fs/cgroup/medium_2/cpu.weight
}

# Check the cgroups version
CGROUPV2=0
if grep cgroup2 /proc/mounts; then
    CGROUPV2=1
fi

if [ $CGROUPV2 -eq 1 ]; then
    manage_cgroups_v2
else
    manage_cgroups_v1
fi

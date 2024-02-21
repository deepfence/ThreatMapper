#!/bin/bash

while true
do
	/bin/sh -c "ulimit -l unlimited; $DF_INSTALL_DIR/bin/deepfenced >> $DF_INSTALL_DIR/var/log/supervisor/deepfenced.log 2>&1"
	sleep 5
done

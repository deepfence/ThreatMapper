#!/bin/bash

# Set mount dir to "/" for Serverless or Fargate
if [ ! -v DF_SERVERLESS ]; then
    MOUNT_PATH_VAR="/fenced/mnt/host/"
else
    MOUNT_PATH_VAR="/"
fi

$DF_INSTALL_DIR/usr/local/bin/fileUploader "$1" "$2" "$3" "$4" "$5" "$MOUNT_PATH_VAR" >> $DF_INSTALL_DIR/var/log/fenced/cve_upload_file.logfile 2>&1

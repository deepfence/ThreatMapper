#!/bin/bash

# Set mount dir to "/" for Serverless or Fargate
if [[ "$DF_SERVERLESS" == "true" ]]; then
  MOUNT_PATH_VAR="/"
else
  MOUNT_PATH_VAR="/fenced/mnt/host/"
fi

"$DF_INSTALL_DIR"/usr/local/bin/fileUploader "$1" "$2" "$3" "$4" "$5" "$MOUNT_PATH_VAR" >>"$DF_INSTALL_DIR"/var/log/fenced/cve_upload_file.logfile 2>&1

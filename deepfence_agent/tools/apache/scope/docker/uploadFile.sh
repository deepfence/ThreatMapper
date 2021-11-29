#!/bin/bash

$DF_INSTALL_DIR/usr/local/bin/fileUploader "$1" "$2" "$3" "$4" "$5" >> $DF_INSTALL_DIR/var/log/fenced/cve_upload_file.logfile 2>&1

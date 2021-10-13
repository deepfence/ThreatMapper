#!/bin/bash

/usr/local/bin/fileUploader "$1" "$2" "$3" "$4" "$5" >> /var/log/fenced/cve_upload_file.logfile 2>&1

#!/bin/bash

DF_CONSOLE_COMMIT_ID=`git log --format="%h" -n 1`
DF_UI_COMMIT_ID=`cd ../deepfence_ui && git log --format="%h" -n 1`
DF_BACKEND_COMMIT_ID=`cd ../deepfence_backend && git log --format="%h" -n 1`
echo ${DF_CONSOLE_COMMIT_ID}-${DF_UI_COMMIT_ID}-${DF_BACKEND_COMMIT_ID} > ../deepfence_ui/console_version.txt


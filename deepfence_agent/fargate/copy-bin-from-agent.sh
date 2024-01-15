#!/bin/bash

ID=$CONTAINER_ID
VERSION=$VERSION

echo "Agent Container ID is $ID"

if [ -z "$ID" ]; then
  echo "Usage: $0 <id>"
  exit 1
fi

folder="deepfence-agent-bin-$VERSION"

deep_docker_copy() {
  echo "Copying $1 to $2"
  mkdir -p "$(dirname "$2")" && docker cp $ID:$1 "$2"
}

# delete folder if exists
rm -rf $folder

# create folder
mkdir -p $folder

copy() {
  echo "Copying ..."
  deep_docker_copy "/bin/." "$folder/bin/."
  deep_docker_copy "/home/." "$folder/home/."
  deep_docker_copy "/opt/." "$folder/opt/."
  deep_docker_copy "/usr/bin/." "$folder/usr/bin/."
  deep_docker_copy "/usr/local/bin/." "$folder/usr/local/bin/."
  deep_docker_copy "/usr/local/discovery/." "$folder/usr/local/discovery/."
  # copy cool stuffs from /etc
  deep_docker_copy "/etc/filebeat/." "$folder/etc/filebeat/."
  deep_docker_copy "/etc/logrotate.d/." "$folder/etc/logrotate.d/."
  deep_docker_copy "/etc/supervisor/." "$folder/etc/supervisor/."
  deep_docker_copy "/etc/td-agent-bit/." "$folder/etc/td-agent-bit/."

  # delete rules.tar (not needed)
  rm -rf $folder/home/deepfence/rules.tar.gz
}

copy

echo "Creating tar.gz file..."
rm -rf $folder.tar.gz
tar -czvf $folder.tar.gz $folder

rm -rf $folder

echo "Done"

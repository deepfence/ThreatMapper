#!/bin/bash
#Any change made in this script needs to be made in upgrade-agent.sh script and
#in the golang code that uses that script
usage() {

  cat <<EOF

	usage: $0 <options>

	OPTIONS:
        -h Show this message
        -r IP Address / domain of Deepfence management console (Mandatory)
        -o Port of Deepfence management console (Mandatory. Default is 443)
        -k Deepfence key for auth
        -n Hostname to use in deepfence agent (Optional)
        -t User defined tags, comma separated string (Optional)
        -i Add cloud instance id as suffix for hostname (Y/N) (Optional. Default is "N")
EOF
}

MGMT_CONSOLE_URL=""
MGMT_CONSOLE_PORT="443"
USER_DEFINED_TAGS=""
DEEPFENCE_KEY=""
DF_HOSTNAME=""
INSTANCE_ID_SUFFIX="N"
IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-deepfenceio}

check_options() {
  if [ "$#" -lt 1 ]; then
    usage
    exit 0
  fi
  while getopts "f:c:p:s:k:i:n:r:o:t:h" opt; do
    case $opt in
    h)
      usage
      exit 0
      ;;
    r)
      MGMT_CONSOLE_URL=$OPTARG
      ;;
    o)
      MGMT_CONSOLE_PORT=$OPTARG
      ;;
    k)
      DEEPFENCE_KEY=$OPTARG
      ;;
    n)
      DF_HOSTNAME=$OPTARG
      ;;
    t)
      USER_DEFINED_TAGS="$OPTARG"
      ;;
    i)
      if [ "$OPTARG" == "Y" ] || [ "$OPTARG" == "y" ]; then
        INSTANCE_ID_SUFFIX="Y"
      else
        INSTANCE_ID_SUFFIX="N"
      fi
      ;;
    *)
      usage
      exit 0
      ;;
    esac
  done
  if [ "$MGMT_CONSOLE_URL" == "" ]; then
    usage
    exit 0
  fi
  if [ "$MGMT_CONSOLE_PORT" == "" ]; then
    usage
    exit 0
  fi
  if [ "$DF_HOSTNAME" == "" ]; then
    DF_HOSTNAME=$(hostname)
  fi
}

kill_agent() {
  agent_running=$(docker ps --format '{{.Names}}' | grep "deepfence-agent")
  if [ "$agent_running" != "" ]; then
    docker rm -f deepfence-agent
  fi
}

start_agent() {
  docker run -dit --cpus=".2" --ulimit core=0 --name=deepfence-agent --restart on-failure --pid=host --net=host --uts=host --privileged=true -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced -v /var/run/docker.sock:/var/run/docker.sock -v /var/lib/docker/:/fenced/mnt/host/var/lib/docker/:rw -v /:/fenced/mnt/host/:ro -e DF_ENABLE_PROCESS_REPORT="true" -e DF_ENABLE_CONNECTIONS_REPORT="true" -e INSTANCE_ID_SUFFIX="$INSTANCE_ID_SUFFIX" -e USER_DEFINED_TAGS="$USER_DEFINED_TAGS" -e MGMT_CONSOLE_URL="$MGMT_CONSOLE_URL" -e MGMT_CONSOLE_PORT="$MGMT_CONSOLE_PORT" -e SCOPE_HOSTNAME="$DF_HOSTNAME" -e DEEPFENCE_KEY="$DEEPFENCE_KEY" "$IMAGE_REPOSITORY"/deepfence_agent_ce:"${DF_IMG_TAG:-1.3.0}"
}

main() {
  check_options "$@"
  kill_agent
  start_agent
}

main "$@"

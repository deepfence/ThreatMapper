#!/bin/bash

trim() {
  local var="$*"
  # remove leading whitespace characters
  var="${var#"${var%%[![:space:]]*}"}"
  # remove trailing whitespace characters
  var="${var%"${var##*[![:space:]]}"}"
  echo -n "$var"
}

echoerr() { echo "$@" 1>&2; }

configure_cron() {
  #Setup cron jobs for misc tasks, it needs to be killed and restarted
  #doesnt work smoothly inside docker!
  sudo service cron start
  sudo chmod 600 /etc/logrotate.d/fenced_logrotate.conf
  (echo "*/5 * * * * /usr/sbin/logrotate /etc/logrotate.d/fenced_logrotate.conf") | sudo crontab -
}

parse_options() {
	echo "Parshing options"

	while getopts "h:u:p:k:m:a:o:s:" option; do
		case $option in 
			h) usage
				exit 0
				;;
			u) mgmt_console_url=$OPTARG
				echo "mgmt_console_url:"$mgmt_console_url
				export MGMT_CONSOLE_URL=$mgmt_console_url
				;;
			p) mgmt_console_port=$OPTARG
				echo "mgmt_console_port:"$mgmt_console_port	
				export MGMT_CONSOLE_PORT=$mgmt_console_port
				;;
			k) deepfence_key=$OPTARG
				echo "key:"$deepfence_key
				export DEEPFENCE_KEY=$deepfence_key
				;;
			m) mode=$OPTARG
				echo "mode:"$mode
				export MODE=$mode
				;;
			a) multiple_acc_id=$OPTARG
				echo "multiple_acc_id:"$multiple_acc_id
				export DF_MULTIPLE_ACC_ID=$multiple_acc_id
				;;
			o) org_acc_id=$OPTARG
				echo "org_acc_id:"$org_acc_id
				export DF_ORG_ACC_ID=$org_acc_id
				;;
			l) success_signal_url=$OPTARG
				echo "success_signal_url:"$success_signal_url
				export SUCCESS_SIGNAL_URL=$success_signal_url
				;;
			d) debug=$OPTARG
				echo "debug:"$debug
				export DF_ENABLE_DEBUG=$debug
				;;
			r) role_prefix=$OPTARG
				echo "role_prefix:"$role_prefix
				export ROLE_PREFIX=$role_prefix
				;;
			c) cloud_audit_log_ids=$OPTARG
				echo "cloud_audit_log_ids:"$cloud_audit_log_ids
				export CLOUD_AUDIT_LOG_IDS=$cloud_audit_log_ids
				;;
			i) inactive_threshold=$OPTARG
				echo "inactive_threshold:"$inactive_threshold
				export INACTIVE_THRESHOLD=$inactive_threshold
				;;
			s) http_server_required=$OPTARG
				echo "http_server_required:"$http_server_required
				export HTTP_SERVER_REQUIRED=$http_server_required
				;;
		esac
	done

}

launch_deepfenced() {
  # In k8s, if agent pod restarts these files are not cleared
  rm -rf /var/log/fenced/* 2>/dev/null
  configure_cron

  if [[ -z "${SCOPE_HOSTNAME}" ]]; then
    SCOPE_HOSTNAME="$(hostname)"
    export SCOPE_HOSTNAME="$SCOPE_HOSTNAME"
  fi
  if [ "$INSTANCE_ID_SUFFIX" == "Y" ]; then
    cloud_instance_id=$(/usr/local/bin/getCloudInstanceId)
    cloud_instance_id="${cloud_instance_id//[$'\t\r\n ']/}"
    export SCOPE_HOSTNAME="$SCOPE_HOSTNAME-$cloud_instance_id"
  fi
  if [ "$DF_PROXY_MODE" == "1" ]; then
    # echo "App security : Active Mode, Listening on port $DF_LISTEN_PORT "
    DOCKER_API_VERSION=$DOCKER_API_VERSION run_dind.sh -a $MGMT_CONSOLE_PORT -s 0
  fi


  unlink /var/run/supervisor.sock 2>/dev/null
  /usr/bin/supervisord -c /home/deepfence/supervisord.conf

  echo "Starting cloud agent"
  until [[ "$(ls $DF_INSTALL_DIR/var/log/supervisor/deepfenced* 2>/dev/null | wc -w)" != "0" ]]; do
    sleep 5
  done
  tail -f $DF_INSTALL_DIR/var/log/supervisor/deepfenced*
}

main() {
  sudo ln -sf bash /bin/sh
  parse_options "$@"
  env
  launch_deepfenced
}

for arg in "$@"; do
  shift
  case "$arg" in
    '-help')                    set -- "$@" '-h'   ;;
    '-mgmt-console-url')        set -- "$@" '-u'   ;;
    '-mgmt-console-port')       set -- "$@" '-p'   ;;
    '-deepfence-key')           set -- "$@" '-k'   ;;
    '-mode')                    set -- "$@" '-m'   ;;
    '-multiple-acc-ids')        set -- "$@" '-a'   ;;
    '-org-acc-id')              set -- "$@" '-o'   ;;
    '-success-signal-url')    	set -- "$@" '-l'   ;;
    '-debug')    				set -- "$@" '-d'   ;;
    '-rolePrefix')    			set -- "$@" '-r'   ;;
    '-cloud-audit-log-ids')    	set -- "$@" '-c'   ;;
    '-inactive-threshold')    	set -- "$@" '-i'   ;;
    '-http-server-required')    
		set -- "$@" '-s'
		set -- "$@" 'true'
		;;
    *)                      	set -- "$@" "$arg" ;;
  esac
done


main "$@"

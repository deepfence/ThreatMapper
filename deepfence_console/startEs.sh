#!/bin/bash

set -e
umask 0002

if [ ! -v DF_PROG_NAME ]; then
  echo "Environment variable DF_PROG_NAME not set. It has to be es_master, or es_slave<1,2,3...>"
  exit 0
fi

# pg_running=1
# while [ $pg_running != 0 ]; do
#   # echo "Running the postgres check"
#   # /usr/local/bin/check-postgres
#   pg_running=$(echo $?)
#   echo "Return value is " $pg_running
#   if [ $pg_running != 0 ]; then
#     sleep 5
#   fi
# done

DF_ES_BASE_PATH="/usr/share/elasticsearch"

ulimit -n 65536 > /dev/null 2>&1
if [ ! $? -eq 0 ]; then
    echo "Could not set ulimit -n 65536. Ignoring."
fi
ulimit -u 4096 > /dev/null 2>&1
if [ ! $? -eq 0 ]; then
    echo "Could not set ulimit -u 4096. Ignoring."
fi
ulimit -l unlimited > /dev/null 2>&1
if [ ! $? -eq 0 ]; then
    echo "Could not set ulimit -l unlimited. Ignoring."
fi

if [ -d "/data" ]; then
  mkdir -p /data/$DF_PROG_NAME/data
  mkdir -p /data/$DF_PROG_NAME/logs
  rm -rf $DF_ES_BASE_PATH/data
  rm -rf $DF_ES_BASE_PATH/logs
  ln -s /data/$DF_PROG_NAME/data $DF_ES_BASE_PATH/data
  ln -s /data/$DF_PROG_NAME/logs $DF_ES_BASE_PATH/logs
  chown -R elasticsearch:elasticsearch /data/$DF_PROG_NAME
fi

declare -a es_opts

while IFS='=' read -r envvar_key envvar_value; do
  # Elasticsearch env vars need to have at least two dot separated lowercase words, e.g. `cluster.name`
  if [[ "$envvar_key" =~ ^[a-z0-9_]+\.[a-z0-9_]+ ]]; then
    if [[ ! -z $envvar_value ]]; then
      es_opt="-E${envvar_key}=${envvar_value}"
      es_opts+=("${es_opt}")
    fi
  fi
done < <(env)

export JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(which javac || which java)")")")
export ES_JAVA_OPTS="-Des.cgroups.hierarchy.override=/ $ES_JAVA_OPTS"

# Add elasticsearch as command if needed
if [ "${1:0:1}" = '-' ]; then
  set -- elasticsearch "$@"
fi

# Drop root privileges if we are running elasticsearch
# allow the container to be started with `--user`
if [ "$1" = 'elasticsearch' -a "$(id -u)" = '0' ]; then
  set -- su-exec elasticsearch "$@" "${es_opts[@]}"
fi

exec env ES_JAVA_OPTS="-Xms${ES_MEM} -Xmx${ES_MEM}" "$@"

#/usr/bin/env ES_JAVA_OPTS="-Xms${ES_MEM} -Xmx${ES_MEM}" /usr/bin/su elasticsearch -c "$DF_ES_BASE_PATH/bin/es-docker"

#!/bin/bash

#This seems to take care of the fact that during the first run of this script
#the download of data fails. Possibly network subsystem init delays ??
sleep 20

#Exit if already running
pidVal=`ps -ef | grep owasp-data | grep -v grep | awk '{print $2}'`
if [ ! -z "$pidVal" ]; then
    echo "owasp updater running. exiting"
    exit 0
fi

/bin/rm -f /data/owasp-data/logs/depcheck-update.log || true

/usr/local/bin/dependency-check/bin/dependency-check.sh --data /data/owasp-data/data --updateonly --cveUrlBase "https://nvd.nist.gov/feeds/json/cve/1.1/nvdcve-1.1-%d.json.gz" --cveUrlModified "https://nvd.nist.gov/feeds/json/cve/1.1/nvdcve-1.1-modified.json.gz" -l /data/owasp-data/logs/depcheck-update.log

#retVal=$?

#if [ "$retVal" != 0 ]; then
#   if [ ! -f /data/owasp-data/logs/failed-counter.txt ]; then
#       echo "1" > /data/owasp-data/logs/failed-counter.txt
#       exit 0
#   fi
#   oldValue=`cat /data/owasp-data/logs/failed-counter.txt`
#   if [ "$oldValue" -eq "5" ]; then
#       #If this has failed 5 times, then remove existing data and refetch
#       /bin/rm -f /data/owasp-data/data/* || true
#       /bin/rm -f /data/owasp-data/logs/failed-counter.txt || true
#       exit 0
#   fi
#   newValue=$(( oldValue + 1 ))
#   echo "$newValue" > /data/owasp-data/logs/failed-counter.txt
#   exit 0
#fi
##
#/bin/rm -f /data/owasp-data/logs/failed-counter.txt || true
#/bin/rm -f /data/owasp-data/depcheck-data.tar.bz2 || true

(cd /data/owasp-data/data; /bin/tar -jcf /data/owasp-data/depcheck-data.tar.bz2 .)
(cd /data/owasp-data/data; /usr/bin/zip -r -9 /data/owasp-data/depcheck-data.zip .)


#!/bin/bash

GOPROCSYS_DIR="/src/github.com/deepfence/procspy/"
GODFUTILS_DIR="/src/github.com/deepfence/df-utils/"
BPF_URL="golang.org/x/net/bpf/"
GOBPF_DIR="/src/$BPF_URL"
GOPKT_URL="github.com/google/gopacket"
GOPKT_DIR="/src/$GOPKT_URL"
GOPKT_LAYERS_URL="github.com/google/gopacket/layers"
GOPKT_LAYERS_DIR="/src/$GOPKT_LAYERS_URL"
GOPKT_PCAP_URL="github.com/google/gopacket/pcap"
GOPKT_PCAP_DIR="/src/$GOPKT_PCAP_URL"
GOPKT_PCAPGO_URL="github.com/google/gopacket/pcapgo"
GOPKT_PCAPGO_DIR="/src/$GOPKT_PCAPGO_URL"
GOPKT_AFPKT_URL="github.com/google/gopacket/afpacket"
GOPKT_AFPKT_DIR="/src/$GOPKT_AFPKT_URL"
GOSYS_URL="golang.org/x/sys/unix"
GOSYS_DIR="/src/$GOSYS_URL"
GOENC_URL="golang.org/x/text/encoding"
GOENC_DIR="/src/$GOENC_URL"
GOPS_URL="github.com/shirou/gopsutil"
GOPS_DIR="/src/$GOPS_URL"
GOFSNOTIFY_URL="github.com/fsnotify/fsnotify"
GOFSNOTIFY_DIR="/src/$GOFSNOTIFY_URL"
GONETSTAT_URL="github.com/cakturk/go-netstat/netstat"
GONETSTAT_DIR="/src/$GONETSTAT_URL"
GOUTMP_URL="github.com/neko-neko/utmpdump/utmp"
GOUTMP_DIR="/src/$GOUTMP_URL"
GOYAML_URL="gopkg.in/yaml.v2"
GOYAML_DIR="/src/$GOYAML_URL"
GOPROCFS_URL="github.com/prometheus/procfs"
GOPROCFS_DIR="/src/$GOPROCFS_URL"
GO_VIS_NETLINK_URL="github.com/vishvananda/netlink"
GO_VIS_NETLINK_DIR="/src/$GO_VIS_NETLINK_URL"
GO_SYSCONF_URL="github.com/tklauser/go-sysconf"
GO_SYSCONF_DIR="/src/$GO_SYSCONF_URL"
REDIGO_URL="github.com/gomodule/redigo/redis"
REDIGO_DIR="/src/$REDIGO_URL"
LIBPQ_URL="github.com/lib/pq"
LIBPQ_DIR="/src/$LIBPQ_URL"

if [ -z "${GOPATH}" ]; then
    echo "GOPATH environment variable is not set. Please set it"
    exit 1
fi

retVal=0

PATH3="$GOPATH/$GOBPF_DIR"
if [ ! -d "$PATH3" ]; then
    go get $BPF_URL
    retVal=$?
fi    

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH4="$GOPATH/$GOPKT_DIR"
if [ ! -d "$PATH4" ]; then
    go get $GOPKT_URL
    retVal=$?
fi    

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH5="$GOPATH/$GOPKT_LAYERS_DIR"
if [ ! -d "$PATH5" ]; then
    go get $GOPKT_LAYERS_URL
    retVal=$?
fi    

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH6="$GOPATH/$GOPKT_PCAP_DIR"
if [ ! -d "$PATH6" ]; then
    go get $GOPKT_PCAP_URL
fi    

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH7="$GOPATH/$GOPKT_PCAPGO_DIR"
if [ ! -d "$PATH7" ]; then
    go get $GOPKT_PCAPGO_URL
    retVal=$?
fi    

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH8="$GOPATH/$GOPKT_AFPKT_DIR"
if [ ! -d "$PATH8" ]; then
    go get $GOPKT_AFPKT_URL
    retVal=$?
fi    

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH9="$GOPATH/$GOSYS_DIR"
if [ ! -d "$PATH9" ]; then
    go get $GOSYS_URL
    retVal=$?
fi    

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH11="$GOPATH/$GOENC_DIR"
if [ ! -d "$PATH11" ]; then
    go get $GOENC_URL
    retVal=$?
fi    

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH12="$GOPATH/$GODFUTILS_DIR"
if [ -d "$PATH12" ]; then
    rm -rf $PATH12
fi
mkdir -p $PATH12
cp -R `pwd`/misc/deepfence/df-utils/* $PATH12
(cd $PATH12 && go get .)
retVal=$?

if (( $retVal != 0 )); then
    exit $retVal
fi


PATH13="$GOPATH/$GOPROCSYS_DIR"
if [ ! -d "$PATH13" ]; then
    mkdir -p $PATH13
    cp -R `pwd`/misc/deepfence/procspy/* $PATH13
    (cd $PATH13 && go get .)
    retVal=$?
fi

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH17="$GOPATH/$GOPS_DIR"
if [ ! -d "$PATH17" ]; then
    go get $GOPS_URL
    retVal=$?
fi

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH18="$GOPATH/$GOFSNOTIFY_DIR"
if [ ! -d "$PATH18" ]; then
    go get $GOFSNOTIFY_URL
    retVal=$?
fi

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH19="$GOPATH/$GONETSTAT_DIR"
if [ ! -d "$PATH19" ]; then
    go get $GONETSTAT_URL
    retVal=$?
fi

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH20="$GOPATH/$GOUTMP_DIR"
if [ ! -d "$PATH20" ]; then
    go get $GOUTMP_URL
    retVal=$?
fi

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH21="$GOPATH/$GOYAML_DIR"
if [ ! -d "$PATH21" ]; then
    go get $GOYAML_URL
    retVal=$?
fi

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH22="$GOPATH/$GOPROCFS_DIR"
if [ ! -d "$PATH22" ]; then
    go get $GOPROCFS_URL
    retVal=$?
fi

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH23="$GOPATH/$GO_VIS_NETLINK_DIR"
if [ ! -d "$PATH23" ]; then
    go get $GO_VIS_NETLINK_URL
    retVal=$?
fi

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH24="$GOPATH/$GO_SYSCONF_DIR"
if [ ! -d "$PATH24" ]; then
    go get $GO_SYSCONF_URL
    retVal=$?
fi

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH25="$GOPATH/$REDIGO_DIR"
if [ ! -d "$PATH25" ]; then
    go get $REDIGO_URL
    retVal=$?
fi

if (( $retVal != 0 )); then
    exit $retVal
fi

PATH26="$GOPATH/$LIBPQ_DIR"
if [ ! -d "$PATH26" ]; then
    go get $LIBPQ_URL
    retVal=$?
fi

if (( $retVal != 0 )); then
    exit $retVal
fi

echo "Checking dependencies complete. Returning with value " $retVal
exit $retVal


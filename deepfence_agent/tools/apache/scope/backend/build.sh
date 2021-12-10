#!/bin/sh

set -eu
set -x

SCOPE_SRC=$GOPATH/src/github.com/weaveworks/scope

echo $SCOPE_SRC

# Mount the scope repo:
#  -v $(pwd):/go/src/github.com/weaveworks/scope

make -C "$SCOPE_SRC" BUILD_IN_CONTAINER=false "$@"

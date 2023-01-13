#!/bin/sh
set -e
/usr/local/bin/grype db update
exec "$@"

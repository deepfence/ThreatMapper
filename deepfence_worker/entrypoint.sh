#!/bin/bash
set -e

/usr/local/bin/grype db update

if [[ "${1#-}" != "$1" ]]; then
	set -- /usr/local/bin/deepfence_worker "$@"
fi

exec "$@"

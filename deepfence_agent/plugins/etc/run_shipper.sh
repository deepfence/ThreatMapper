BATCH_SIZE=${1:-100}
TRUNCATE_SIZE=${2:-10}

PATH=${DF_INSTALL_DIR:-/home/deepfence}

exec $PATH/bin/shipper --base-path="${DF_INSTALL_DIR:-/}" --truncate-size=$TRUNCATE_SIZE --routes=$PATH/routes.yaml --batch-size=$BATCH_SIZE

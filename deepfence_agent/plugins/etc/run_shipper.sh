BATCH_SIZE=${1:-100}
TRUNCATE_SIZE=${2:-10}

exec $DF_INSTALL_DIR/home/deepfence/bin/shipper --base-path="${DF_INSTALL_DIR:-/}" --truncate-size=$TRUNCATE_SIZE --routes=$DF_INSTALL_DIR/home/deepfence/routes.yaml --batch-size=$BATCH_SIZE

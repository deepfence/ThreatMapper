BATCH_SIZE=${1:-100}

PATH=${DF_INSTALL_DIR:-/home/deepfence}

exec $PATH/bin/shipper --base-path="${DF_INSTALL_DIR:-/}" --truncate-size=2 --routes=$PATH/routes.yaml --batch-size=$BATCH_SIZE

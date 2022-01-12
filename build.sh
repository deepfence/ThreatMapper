#!/bin/sh

DEEPFENCE_CONSOLE_DIR=$(pwd)/deepfence_console
DEEPFENCE_AGENT_DIR=$(pwd)/deepfence_agent
DOCKER_BUILD_LOG="docker-build.log"
DEEPFENCE_BACKEND_DIR=$(pwd)/deepfence_backend
DEEPFENCE_UI_DIR=$(pwd)/deepfence_ui
DEEPFENCE_DIAG_DIR=$(pwd)/deepfence_diagnosis
DEEPFENCE_FETCHER_DIR=$DEEPFENCE_CONSOLE_DIR/clair
DEEPAUDIT_DIR=$DEEPFENCE_CONSOLE_DIR/deepaudit

cd $DEEPFENCE_CONSOLE_DIR

if [ ! -f certs/ssl/filebeat.crt ]; then
    echo "SSL certificate not found! Grenerating SSL certificate...."
    mkdir -p certs/ssl
    sudo openssl genrsa -out certs/ssl/filebeat.key 2048
    sudo openssl req -new -x509 -config self-signed-certificate.cnf -nodes -days 365 -key certs/ssl/filebeat.key -out certs/ssl/filebeat.crt
    sudo chmod a+r certs/ssl/filebeat*
else
    echo "SSL certificate found"
fi

dependency_check_file=$(pwd)/clair/dependency-check-6.5.3-release.zip
if [ ! -f "$dependency_check_file" ]; then
    wget https://github.com/jeremylong/DependencyCheck/releases/download/v6.5.3/dependency-check-6.5.3-release.zip -P "$(pwd)/clair/"
    if [ ! $? -eq 0 ]; then
        exit 1
    fi
fi

echo "Building init container image"
cd $DEEPFENCE_CONSOLE_DIR/init-container
docker build -f $DEEPFENCE_CONSOLE_DIR/init-container/Dockerfile -t ${IMAGE_REPOSITORY:-deepfenceio}/deepfence_init_ce:${DF_IMG_TAG:-latest} .

if [ ! $? -eq 0 ]; then
    echo "Building init container image failed. Exiting"
    exit 1
fi

echo "Building Vulnerability mapper image"
cd $DEEPFENCE_CONSOLE_DIR
rm -rf $DEEPAUDIT_DIR/filebeat $DEEPAUDIT_DIR/cve_scan_registry
cp -r filebeat $DEEPAUDIT_DIR
rm -rf $DEEPAUDIT_DIR/filebeat/filebeat.yml
cp clair/dependency-check-6.5.3-release.zip $DEEPAUDIT_DIR
cp -r $DEEPFENCE_BACKEND_DIR/cve_scan_registry $DEEPAUDIT_DIR
docker build -f $DEEPAUDIT_DIR/Dockerfile -t ${IMAGE_REPOSITORY:-deepfenceio}/deepfence_vulnerability_mapper_ce:${DF_IMG_TAG:-latest} $DEEPAUDIT_DIR

if [ ! $? -eq 0 ]; then
    echo "Building vulnerability mapper image failed. Exiting"
    exit 1
fi

echo "Creating elastic-search docker image. You can check $DOCKER_BUILD_LOG for status"
docker build --network host --tag=${IMAGE_REPOSITORY:-deepfenceio}/deepfence_elastic_ce:${DF_IMG_TAG:-latest} --rm=true -f elastic-Dockerfile .

if [ ! $? -eq 0 ]; then
    echo "Error while creating elastic-search docker. Check $DOCKER_BUILD_LOG"
    exit 1
fi


echo "Creating redis docker image. You can check $DOCKER_BUILD_LOG for status"
docker build --network host --tag=${IMAGE_REPOSITORY:-deepfenceio}/deepfence_redis_ce:${DF_IMG_TAG:-latest} --rm=true -f redis-Dockerfile .

if [ ! $? -eq 0 ]; then
    echo "Error while creating redis docker. Check $DOCKER_BUILD_LOG"
    exit 1
fi

echo "Building postgres"
docker build --network host --tag=${IMAGE_REPOSITORY:-deepfenceio}/deepfence_postgres_ce:${DF_IMG_TAG:-latest} --rm=true -f postgres-Dockerfile .

if [ ! $? -eq 0 ]; then
    echo "Building postgres failed. Exiting"
    exit 1
fi

echo "Building deepfence_router image"
docker build -f $DEEPFENCE_BACKEND_DIR/dockerify/haproxy/Dockerfile --build-arg is_dev_build=${IS_DEV_BUILD:-false} -t ${IMAGE_REPOSITORY:-deepfenceio}/deepfence_router_ce:${DF_IMG_TAG:-latest} $DEEPFENCE_BACKEND_DIR

if [ ! $? -eq 0 ]; then
    echo "Building deepfence_router failed. Exiting"
    exit 1
fi

echo "Building steampipe image"
docker build -f $DEEPFENCE_BACKEND_DIR/dockerify/api/Dockerfile.steampipe -t steampipe_build:latest $DEEPFENCE_BACKEND_DIR

if [ ! $? -eq 0 ]; then
    echo "Building steampipe failed. Exiting"
    exit 1
fi

echo "Building API image"
docker build -f $DEEPFENCE_BACKEND_DIR/dockerify/api/Dockerfile -t ${IMAGE_REPOSITORY:-deepfenceio}/deepfence_api_ce:${DF_IMG_TAG:-latest} $DEEPFENCE_BACKEND_DIR

if [ ! $? -eq 0 ]; then
    echo "Building API image failed. Exiting"
    exit 1
fi

echo "Building UI image"
bash ./write_console_version.sh
docker build -f $DEEPFENCE_UI_DIR/Dockerfile -t ${IMAGE_REPOSITORY:-deepfenceio}/deepfence_ui_ce:${DF_IMG_TAG:-latest} $DEEPFENCE_UI_DIR

if [ ! $? -eq 0 ]; then
    echo "Building UI image failed. Exiting"
    exit 1
fi
bash ./clean_console_version.sh

echo "Building fetcher"
cp filebeat/filebeat.crt filebeat/filebeat.key $DEEPFENCE_FETCHER_DIR
docker build -f $DEEPFENCE_FETCHER_DIR/Dockerfile -t ${IMAGE_REPOSITORY:-deepfenceio}/deepfence_fetcher_ce:${DF_IMG_TAG:-latest} $DEEPFENCE_FETCHER_DIR

if [ ! $? -eq 0 ]; then
    echo "Building fetcher image failed. Exiting"
    exit 1
fi

echo "Building diagnosis"
docker build -f $DEEPFENCE_DIAG_DIR/service/Dockerfile -t ${IMAGE_REPOSITORY:-deepfenceio}/deepfence_diagnosis_ce:${DF_IMG_TAG:-latest} $DEEPFENCE_DIAG_DIR/service

if [ ! $? -eq 0 ]; then
    echo "Building diagnosis image failed. Exiting"
    exit 1
fi

echo "Building agent"
cd $DEEPFENCE_AGENT_DIR
env IMAGE_REPOSITORY="${IMAGE_REPOSITORY:-deepfenceio}" DF_IMG_TAG="${DF_IMG_TAG:-latest}" bash build.sh

if [ ! $? -eq 0 ]; then
    echo "Building agent image failed. Exiting"
    exit 1
fi

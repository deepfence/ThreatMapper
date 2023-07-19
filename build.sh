#!/bin/sh

DEEPFENCE_CONSOLE_DIR=$(pwd)/deepfence_console
DEEPFENCE_AGENT_DIR=$(pwd)/deepfence_agent
DOCKER_BUILD_LOG="docker-build.log"
DEEPFENCE_BACKEND_DIR=$(pwd)/deepfence_backend
DEEPFENCE_UI_DIR=$(pwd)/deepfence_ui
DEEPFENCE_DIAG_DIR=$(pwd)/deepfence_diagnosis
DEEPFENCE_FETCHER_DIR=$DEEPFENCE_CONSOLE_DIR/fetcher
VULNERABILITY_MAPPER_DIR=$(pwd)/vulnerability_mapper
SECRET_SCANNER_DIR=$DEEPFENCE_AGENT_DIR/plugins/SecretScanner/
MALWARE_SCANNER_DIR=$DEEPFENCE_AGENT_DIR/plugins/YaraHunter/
PACKAGE_SCANNER_DIR=$DEEPFENCE_AGENT_DIR/plugins/package-scanner/

cd $DEEPFENCE_AGENT_DIR/plugins
bash bootstrap.sh

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

echo "Building init container image"
docker build -f $DEEPFENCE_CONSOLE_DIR/init-container/Dockerfile -t ${IMAGE_REPOSITORY:-deepfenceio}/deepfence_init_ce:${DF_IMG_TAG:-latest} $DEEPFENCE_CONSOLE_DIR/init-container

if [ ! $? -eq 0 ]; then
   echo "Building init container image failed. Exiting"
   exit 1
fi

echo "Building Vulnerability mapper image"
cd $DEEPFENCE_CONSOLE_DIR
docker build -f $VULNERABILITY_MAPPER_DIR/Dockerfile -t ${IMAGE_REPOSITORY:-deepfenceio}/deepfence_vulnerability_mapper_ce:${DF_IMG_TAG:-latest} $VULNERABILITY_MAPPER_DIR

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

echo "Building kafka broker"
docker build --network host --tag=${IMAGE_REPOSITORY:-deepfenceio}/deepfence_kafka_broker_ce:${DF_IMG_TAG:-latest} --rm=true -f kafka-broker-Dockerfile .

if [ ! $? -eq 0 ]; then
   echo "Building postgres failed. Exiting"
   exit 1
fi

echo "Building kafka rest proxy"
docker build --network host --tag=${IMAGE_REPOSITORY:-deepfenceio}/deepfence_kafka_rest_proxy_ce:${DF_IMG_TAG:-latest} --rm=true -f kafka-rest-proxy-Dockerfile .

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

echo "Building API image"
docker build -f $DEEPFENCE_BACKEND_DIR/dockerify/api/Dockerfile -t ${IMAGE_REPOSITORY:-deepfenceio}/deepfence_api_ce:${DF_IMG_TAG:-latest} $DEEPFENCE_BACKEND_DIR

if [ ! $? -eq 0 ]; then
   echo "Building API image failed. Exiting"
   exit 1
fi

echo "Building UI image"
git log --format="%h" -n 1 > $DEEPFENCE_UI_DIR/console_version.txt
echo "1.5.0" > $DEEPFENCE_UI_DIR/product_version.txt
docker build -f $DEEPFENCE_UI_DIR/Dockerfile -t ${IMAGE_REPOSITORY:-deepfenceio}/deepfence_ui_ce:${DF_IMG_TAG:-latest} $DEEPFENCE_UI_DIR

if [ ! $? -eq 0 ]; then
   echo "Building UI image failed. Exiting"
   exit 1
fi
rm -rf $DEEPFENCE_UI_DIR/console_version.txt $DEEPFENCE_UI_DIR/product_version.txt

echo "Building fetcher"
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

echo "Building Secret Scanner Image"
cd $SECRET_SCANNER_DIR
bash bootstrap.sh
docker build --rm=true --tag=${IMAGE_REPOSITORY:-deepfenceio}/deepfence_secret_scanner_ce:${DF_IMG_TAG:-latest} -f $SECRET_SCANNER_DIR/Dockerfile $SECRET_SCANNER_DIR
if [ ! $? -eq 0 ]; then
   echo "Building secret scanner image failed. Exiting"
   exit 1
fi

echo "Building Malware Scanner Image"
cd $MALWARE_SCANNER_DIR
bash bootstrap.sh
docker build --rm=true --tag=${IMAGE_REPOSITORY:-deepfenceio}/deepfence_malware_scanner_ce:${DF_IMG_TAG:-latest} -f $MALWARE_SCANNER_DIR/Dockerfile $MALWARE_SCANNER_DIR
if [ ! $? -eq 0 ]; then
   echo "Building malware scanner image failed. Exiting"
   exit 1
fi

echo "Building Package Scanner Image"
cd $PACKAGE_SCANNER_DIR
docker build --rm=true --tag=${IMAGE_REPOSITORY:-deepfenceio}/deepfence_package_scanner_ce:${DF_IMG_TAG:-latest} -f $PACKAGE_SCANNER_DIR/Dockerfile $PACKAGE_SCANNER_DIR
if [ ! $? -eq 0 ]; then
    echo "Building package scanner image failed. Exiting"
    exit 1
fi

echo "Building agent"
cd $DEEPFENCE_AGENT_DIR
env IMAGE_REPOSITORY="${IMAGE_REPOSITORY:-deepfenceio}" DF_IMG_TAG="${DF_IMG_TAG:-latest}" bash build.sh

if [ ! $? -eq 0 ]; then
    echo "Building agent image failed. Exiting"
    exit 1
fi

cd $DEEPFENCE_CONSOLE_DIR

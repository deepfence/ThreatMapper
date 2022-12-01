PWD=$(shell pwd)

DEEPFENCE_CONSOLE_DIR=$(PWD)/deepfence_console
DEEPFENCE_AGENT_DIR=$(PWD)/deepfence_agent
DEEPFENCE_BACKEND_DIR=$(PWD)/deepfence_backend
DEEPFENCE_UI_DIR=$(PWD)/deepfence_ui
DEEPFENCE_DIAG_DIR=$(PWD)/deepfence_diagnosis
DEEPFENCE_FETCHER_DIR=$(DEEPFENCE_CONSOLE_DIR)/fetcher
VULNERABILITY_MAPPER_DIR=$(PWD)/vulnerability_mapper
SECRET_SCANNER_DIR=$(DEEPFENCE_AGENT_DIR)/plugins/SecretScanner
MALWARE_SCANNER_DIR=$(DEEPFENCE_AGENT_DIR)/plugins/YaraHunter/
PACKAGE_SCANNER_DIR=$(DEEPFENCE_AGENT_DIR)/plugins/package-scanner
IMAGE_REPOSITORY?=deepfenceio
DF_IMG_TAG?=latest
IS_DEV_BUILD?=false
VERSION?="3.6.0"

default: console console_plugins agent

.PHONY: console console_plugins agent
console: certs vulnerability-mapper redis postgres kafka-broker router server worker ui console_plugins

console_plugins: secretscanner malwarescanner packagescanner

agent: agent


.PHONY: certs
certs:
	(cd $(DEEPFENCE_CONSOLE_DIR) && bash generate_certs.sh)

#.PHONY: init-container
#init-container:
#	docker build -f $(DEEPFENCE_CONSOLE_DIR)/init-container/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_init_ce:$(DF_IMG_TAG) $(DEEPFENCE_CONSOLE_DIR)/init-container

.PHONY: bootstrap-agent-plugins
bootstrap-agent-plugins:
	cd $(DEEPFENCE_AGENT_DIR)/plugins && bash bootstrap.sh && cd -
	cd $(SECRET_SCANNER_DIR) && bash bootstrap.sh && cd -
	cd $(MALWARE_SCANNER_DIR) && bash bootstrap.sh && cd -

.PHONY: agent
agent:
	(cd $(DEEPFENCE_AGENT_DIR) &&\
	IMAGE_REPOSITORY="$(IMAGE_REPOSITORY)" DF_IMG_TAG="$(DF_IMG_TAG)" bash build.sh)

.PHONY: vulnerability-mapper
vulnerability-mapper:
	docker build -f $(VULNERABILITY_MAPPER_DIR)/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_vulnerability_mapper_ce:$(DF_IMG_TAG) $(VULNERABILITY_MAPPER_DIR)

.PHONY: redis
redis:
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_redis_ce:$(DF_IMG_TAG) -f deepfence_redis/redis-Dockerfile ./deepfence_redis

.PHONY: postgres
postgres:
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_postgres_ce:$(DF_IMG_TAG) -f deepfence_postgres/postgres-Dockerfile ./deepfence_postgres

.PHONY: kafka-broker
kafka-broker:
	docker build -t $(IMAGE_REPOSITORY)/deepfence_kafka_broker_ce:$(DF_IMG_TAG) -f ./deepfence_kafka/kafka-broker-Dockerfile ./deepfence_kafka

.PHONY: router
router:
	docker build -f $(DEEPFENCE_BACKEND_DIR)/dockerify/haproxy/Dockerfile --build-arg is_dev_build=$(IS_DEV_BUILD) -t $(IMAGE_REPOSITORY)/deepfence_router_ce:$(DF_IMG_TAG) $(DEEPFENCE_BACKEND_DIR)

.PHONY: server
server: certs
	docker build -f ./deepfence_server/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_server_ce:$(DF_IMG_TAG) .

.PHONY: worker
worker:
	docker build -f ./deepfence_worker/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_worker_ce:$(DF_IMG_TAG) .

.PHONY: ui
ui:
	git log --format="%h" -n 1 > $(DEEPFENCE_UI_DIR)/console_version.txt && \
	echo $(VERSION) > $(DEEPFENCE_UI_DIR)/product_version.txt && \
	docker build -f $(DEEPFENCE_UI_DIR)/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_ui_ce:$(DF_IMG_TAG) $(DEEPFENCE_UI_DIR) && \
	rm -rf $(DEEPFENCE_UI_DIR)/console_version.txt $(DEEPFENCE_UI_DIR)/product_version.txt

#.PHONY: fetcher
#fetcher:
#	docker build -f $(DEEPFENCE_FETCHER_DIR)/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_fetcher_ce:$(DF_IMG_TAG) $(DEEPFENCE_FETCHER_DIR)

.PHONY: secretscanner
secretscanner: bootstrap-agent-plugins
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_secret_scanner_ce:$(DF_IMG_TAG) -f $(SECRET_SCANNER_DIR)/Dockerfile $(SECRET_SCANNER_DIR)

.PHONY: malwarescanner
malwarescanner: bootstrap-agent-plugins
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_malware_scanner_ce:$(DF_IMG_TAG) -f $(MALWARE_SCANNER_DIR)/Dockerfile $(MALWARE_SCANNER_DIR)

.PHONY: packagescanner
packagescanner:
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_package_scanner_ce:$(DF_IMG_TAG) -f $(PACKAGE_SCANNER_DIR)/Dockerfile $(PACKAGE_SCANNER_DIR)

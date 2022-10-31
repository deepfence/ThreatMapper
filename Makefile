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

default: certs init-container vulnerability-mapper elasticsearch redis postgres kafka-broker kafka-rest-proxy router api ui fetcher diagnosis agent secretscanner malwarescanner packagescanner

.PHONY: certs
certs:
	cd $(DEEPFENCE_CONSOLE_DIR) && bash generate_certs.sh && cd -

.PHONY: init-container
init-container:
	docker build -f $(DEEPFENCE_CONSOLE_DIR)/init-container/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_init_ce:$(DF_IMG_TAG) $(DEEPFENCE_CONSOLE_DIR)/init-container

.PHONY: vulnerability-mapper
vulnerability-mapper:
	docker build -f $(VULNERABILITY_MAPPER_DIR)/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_vulnerability_mapper_ce:$(DF_IMG_TAG) $(VULNERABILITY_MAPPER_DIR)

.PHONY: elasticsearch
elasticsearch:
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_elastic_ce:$(DF_IMG_TAG) -f $(DEEPFENCE_CONSOLE_DIR)/elastic-Dockerfile $(DEEPFENCE_CONSOLE_DIR)

.PHONY: redis
redis:
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_redis_ce:$(DF_IMG_TAG) -f $(DEEPFENCE_CONSOLE_DIR)/redis-Dockerfile $(DEEPFENCE_CONSOLE_DIR)

.PHONY: postgres
postgres:
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_postgres_ce:$(DF_IMG_TAG) -f $(DEEPFENCE_CONSOLE_DIR)/postgres-Dockerfile $(DEEPFENCE_CONSOLE_DIR)

.PHONY: kafka-broker
kafka-broker:
	docker build -t $(IMAGE_REPOSITORY)/deepfence_kafka_broker_ce:$(DF_IMG_TAG) -f $(DEEPFENCE_CONSOLE_DIR)/kafka-broker-Dockerfile $(DEEPFENCE_CONSOLE_DIR)

.PHONY: kafka-rest-proxy
kafka-rest-proxy:
	docker build -t $(IMAGE_REPOSITORY)/deepfence_kafka_rest_proxy_ce:$(DF_IMG_TAG) -f $(DEEPFENCE_CONSOLE_DIR)/kafka-rest-proxy-Dockerfile $(DEEPFENCE_CONSOLE_DIR)

.PHONY: router
router:
	docker build -f $(DEEPFENCE_BACKEND_DIR)/dockerify/haproxy/Dockerfile --build-arg is_dev_build=$(IS_DEV_BUILD) -t $(IMAGE_REPOSITORY)/deepfence_router_ce:$(DF_IMG_TAG) $(DEEPFENCE_BACKEND_DIR)

.PHONY: api
api: certs
	docker build -f $(DEEPFENCE_BACKEND_DIR)/dockerify/api/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_api_ce:$(DF_IMG_TAG) $(DEEPFENCE_BACKEND_DIR)

.PHONY: ui
ui:
	git log --format="%h" -n 1 > $(DEEPFENCE_UI_DIR)/console_version.txt && \
	echo $(VERSION) > $(DEEPFENCE_UI_DIR)/product_version.txt && \
	docker build -f $(DEEPFENCE_UI_DIR)/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_ui_ce:$(DF_IMG_TAG) $(DEEPFENCE_UI_DIR) && \
	rm -rf $(DEEPFENCE_UI_DIR)/console_version.txt $(DEEPFENCE_UI_DIR)/product_version.txt

.PHONY: fetcher
fetcher:
	docker build -f $(DEEPFENCE_FETCHER_DIR)/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_fetcher_ce:$(DF_IMG_TAG) $(DEEPFENCE_FETCHER_DIR)

.PHONY: diagnosis
diagnosis:
	docker build -f $(DEEPFENCE_DIAG_DIR)/service/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_diagnosis_ce:$(DF_IMG_TAG) $(DEEPFENCE_DIAG_DIR)/service

.PHONY: agent
agent:
	cd $(DEEPFENCE_AGENT_DIR) && \
	export IMAGE_REPOSITORY="$(IMAGE_REPOSITORY)" DF_IMG_TAG="$(DF_IMG_TAG)" && \
	bash build.sh && cd -

.PHONY: bootstrap-agent-plugins
bootstrap-agent-plugins:
	cd $(DEEPFENCE_AGENT_DIR)/plugins && bash bootstrap.sh && cd - && \
	cd $(SECRET_SCANNER_DIR) && bash bootstrap.sh && cd - 
	cd $(MALWARE_SCANNER_DIR) && bash bootstrap.sh && cd -

.PHONY: secretscanner
secretscanner: bootstrap-agent-plugins
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_secret_scanner_ce:$(DF_IMG_TAG) -f $(SECRET_SCANNER_DIR)/Dockerfile $(SECRET_SCANNER_DIR)

.PHONY: malwarescanner
malwarescanner: bootstrap-agent-plugins
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_malware_scanner_ce:$(DF_IMG_TAG) -f $(MALWARE_SCANNER_DIR)/Dockerfile $(MALWARE_SCANNER_DIR)

.PHONY: packagescanner
packagescanner:	
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_package_scanner_ce:$(DF_IMG_TAG) -f $(PACKAGE_SCANNER_DIR)/Dockerfile $(PACKAGE_SCANNER_DIR)


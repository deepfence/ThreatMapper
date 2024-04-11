PWD=$(shell pwd)

export ROOT_MAKEFILE_DIR=$(shell pwd)
export DEEPFENCE_AGENT_DIR=$(PWD)/deepfence_agent
export DEEPFENCE_ROUTER_DIR=$(PWD)/haproxy
export DEEPFENCE_TELEMETRY_DIR=$(PWD)/deepfence_telemetry
export DEEPFENCE_FILE_SERVER_DIR=$(PWD)/deepfence_file_server
export DEEPFENCE_FRONTEND_DIR=$(PWD)/deepfence_frontend
export SECRET_SCANNER_DIR=$(DEEPFENCE_AGENT_DIR)/plugins/SecretScanner
export MALWARE_SCANNER_DIR=$(DEEPFENCE_AGENT_DIR)/plugins/YaraHunter/
export PACKAGE_SCANNER_DIR=$(DEEPFENCE_AGENT_DIR)/plugins/package-scanner
export COMPLIANCE_SCANNER_DIR=$(DEEPFENCE_AGENT_DIR)/plugins/compliance
export DEEPFENCE_CTL=$(PWD)/deepfence_ctl
export DEEPFENCED=$(PWD)/deepfence_bootstrapper
export DEEPFENCE_FARGATE_DIR=$(DEEPFENCE_AGENT_DIR)/agent-binary
export IMAGE_REPOSITORY?=quay.io/deepfenceio
export DF_IMG_TAG?=latest
export IS_DEV_BUILD?=false
export VERSION?=2.2.0
export AGENT_BINARY_BUILD=$(DEEPFENCE_FARGATE_DIR)/build
export AGENT_BINARY_BUILD_RELATIVE=deepfence_agent/agent-binary/build
export AGENT_BINARY_DIST=$(DEEPFENCE_FARGATE_DIR)/dist
export AGENT_BINARY_DIST_RELATIVE=deepfence_agent/agent-binary/dist
export AGENT_BINARY_FILENAME=deepfence-agent-$(shell dpkg --print-architecture)-$(VERSION).tar.gz

default: bootstrap console_plugins agent console fargate-local

.PHONY: console
console: redis postgres kafka-broker router server worker ui file-server graphdb jaeger

.PHONY: console_plugins
console_plugins: secretscanner malwarescanner packagescanner compliancescanner

.PHONY: bootstrap
bootstrap:
	./bootstrap.sh

.PHONY: alpine_builder
alpine_builder:
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_builder_ce:$(DF_IMG_TAG) -f docker_builders/Dockerfile-alpine .

.PHONY: go1_20_builder
go1_20_builder:
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_go_builder_ce:$(DF_IMG_TAG) -f docker_builders/Dockerfile-debianfluent-bit .

.PHONY: debian_builder
debian_builder:
	docker build --build-arg DF_IMG_TAG=${DF_IMG_TAG} --build-arg IMAGE_REPOSITORY=${IMAGE_REPOSITORY} --tag=$(IMAGE_REPOSITORY)/deepfence_glibc_builder_ce:$(DF_IMG_TAG) -f docker_builders/Dockerfile-debian .

.PHONY: bootstrap-agent-plugins
bootstrap-agent-plugins:
	(cd $(DEEPFENCE_AGENT_DIR)/plugins && make localinit)
	(cd $(PACKAGE_SCANNER_DIR) && bash bootstrap.sh)
	(cd $(SECRET_SCANNER_DIR) && bash bootstrap.sh)
	(cd $(MALWARE_SCANNER_DIR) && bash bootstrap.sh)

.PHONY: agent
agent: go1_20_builder debian_builder deepfenced console_plugins
	(cd $(DEEPFENCE_AGENT_DIR) &&\
	IMAGE_REPOSITORY=$(IMAGE_REPOSITORY) DF_IMG_TAG=$(DF_IMG_TAG) VERSION=$(VERSION) bash build.sh)

.PHONY: agent-binary
agent-binary: agent agent-binary-tar

.PHONY: agent-binary-tar
agent-binary-tar:
	mkdir -p $(AGENT_BINARY_DIST) $(AGENT_BINARY_BUILD)
	ID=$$(docker create $(IMAGE_REPOSITORY)/deepfence_agent_ce:$(DF_IMG_TAG)); \
	(cd $(DEEPFENCE_FARGATE_DIR) &&\
	CONTAINER_ID=$$ID VERSION=$(VERSION) AGENT_BINARY_BUILD=$(AGENT_BINARY_BUILD) AGENT_BINARY_DIST=$(AGENT_BINARY_DIST) AGENT_BINARY_FILENAME=$(AGENT_BINARY_FILENAME) bash copy-bin-from-agent.sh); \
	docker rm -v $$ID

.PHONY: fargate-local
fargate-local: agent-binary-tar
	(cd $(DEEPFENCE_AGENT_DIR) &&\
	IMAGE_REPOSITORY=$(IMAGE_REPOSITORY) DF_IMG_TAG=$(DF_IMG_TAG) VERSION=$(VERSION) AGENT_BINARY_BUILD_RELATIVE=$(AGENT_BINARY_BUILD_RELATIVE) AGENT_BINARY_FILENAME=$(AGENT_BINARY_FILENAME) bash build-fargate-local-bin.sh)

.PHONY: fargate
fargate:
	mkdir -p $(AGENT_BINARY_BUILD)
	(cd $(DEEPFENCE_AGENT_DIR) &&\
	IMAGE_REPOSITORY=$(IMAGE_REPOSITORY) DF_IMG_TAG=$(DF_IMG_TAG) VERSION=$(VERSION) AGENT_BINARY_BUILD=$(AGENT_BINARY_BUILD) AGENT_BINARY_BUILD_RELATIVE=$(AGENT_BINARY_BUILD_RELATIVE) bash build-fargate.sh)

.PHONY: deepfenced
deepfenced: alpine_builder bootstrap bootstrap-agent-plugins
	(cd $(DEEPFENCED) && make prepare)
	cp $(DEEPFENCED)/deepfence_bootstrapper $(DEEPFENCE_AGENT_DIR)/deepfenced

.PHONY: redis
redis:
	(cd deepfence_redis && docker build --tag=$(IMAGE_REPOSITORY)/deepfence_redis_ce:$(DF_IMG_TAG) .)

.PHONY: postgres
postgres:
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_postgres_ce:$(DF_IMG_TAG) -f deepfence_postgres/Dockerfile ./deepfence_postgres

.PHONY: kafka-broker
kafka-broker:
	docker build -t $(IMAGE_REPOSITORY)/deepfence_kafka_broker_ce:$(DF_IMG_TAG) -f ./deepfence_kafka/kafka-broker-Dockerfile ./deepfence_kafka

.PHONY: router
router:
	docker build --build-arg is_dev_build=$(IS_DEV_BUILD) -t $(IMAGE_REPOSITORY)/deepfence_router_ce:$(DF_IMG_TAG) $(DEEPFENCE_ROUTER_DIR)

.PHONY: file-server
file-server:
	docker build -t $(IMAGE_REPOSITORY)/deepfence_file_server_ce:$(DF_IMG_TAG) $(DEEPFENCE_FILE_SERVER_DIR)

.PHONY: server
server: alpine_builder
	(cd ./deepfence_server && VERSION=$(VERSION) make image)

.PHONY: worker
worker: alpine_builder agent-binary-tar
	(cd ./deepfence_worker && VERSION=$(VERSION) AGENT_BINARY_DIST_RELATIVE=$(AGENT_BINARY_DIST_RELATIVE) make image)

.PHONY: jaeger
jaeger:
	docker build -t $(IMAGE_REPOSITORY)/deepfence_telemetry_ce:$(DF_IMG_TAG) $(DEEPFENCE_TELEMETRY_DIR)

.PHONY: graphdb
graphdb:
	docker build -f ./deepfence_neo4j/Dockerfile --build-arg IMAGE_REPOSITORY=$(IMAGE_REPOSITORY) --build-arg DF_IMG_TAG=$(DF_IMG_TAG) -t $(IMAGE_REPOSITORY)/deepfence_neo4j_ce:$(DF_IMG_TAG) ./deepfence_neo4j

.PHONY: ui
ui:
	git log --format="%h" -n 1 > $(DEEPFENCE_FRONTEND_DIR)/console_version.txt && \
	echo $(VERSION) > $(DEEPFENCE_FRONTEND_DIR)/product_version.txt && \
	docker run --rm --entrypoint=bash -v $(DEEPFENCE_FRONTEND_DIR):/app node:18-bullseye-slim -c "cd /app && corepack enable && corepack prepare pnpm@7.17.1 --activate && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true pnpm install --frozen-lockfile --prefer-offline && ENABLE_ANALYTICS=true pnpm run build" && \
	docker build -f $(DEEPFENCE_FRONTEND_DIR)/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_ui_ce:$(DF_IMG_TAG) $(DEEPFENCE_FRONTEND_DIR) && \
	rm -rf $(DEEPFENCE_FRONTEND_DIR)/console_version.txt $(DEEPFENCE_FRONTEND_DIR)/product_version.txt

.PHONY: secretscanner
secretscanner: bootstrap-agent-plugins
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_secret_scanner_ce:$(DF_IMG_TAG) -f $(SECRET_SCANNER_DIR)/Dockerfile $(SECRET_SCANNER_DIR)

.PHONY: malwarescanner
malwarescanner: bootstrap-agent-plugins
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_malware_scanner_ce:$(DF_IMG_TAG) -f $(MALWARE_SCANNER_DIR)/Dockerfile $(MALWARE_SCANNER_DIR)

.PHONY: packagescanner
packagescanner: bootstrap-agent-plugins
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_package_scanner_ce:$(DF_IMG_TAG) -f $(PACKAGE_SCANNER_DIR)/Dockerfile $(PACKAGE_SCANNER_DIR)

.PHONY: compliancescanner
compliancescanner:
	docker build --tag=$(IMAGE_REPOSITORY)/deepfence_compliance_scanner_ce:$(DF_IMG_TAG) -f $(COMPLIANCE_SCANNER_DIR)/Dockerfile $(COMPLIANCE_SCANNER_DIR)

.PHONY: openapi
openapi: server
	docker run --rm \
	--entrypoint=/usr/local/bin/deepfence_server \
	-v $(PWD):/app $(IMAGE_REPOSITORY)/deepfence_server_ce:$(DF_IMG_TAG) \
	--export-api-docs-path /app/openapi.yaml

	rm -rf golang_deepfence_sdk/client/*

	docker pull openapitools/openapi-generator-cli:latest
	docker run --rm \
	-v $(PWD):/local openapitools/openapi-generator-cli:latest generate \
	-i /local/openapi.yaml \
	-g go \
	-o /local/golang_deepfence_sdk/client \
	-p isGoSubmodule=true \
	-p packageName=client \
	--git-repo-id golang_deepfence_sdk \
	--git-user-id deepfence

	rm openapi.yaml
	cd $(PWD)/golang_deepfence_sdk/client && rm -rf ./test && sed -i 's/go 1.18/go 1.20/g' go.mod && go mod tidy -v && cd -

.PHONY: cli
cli: bootstrap
	(cd $(DEEPFENCE_CTL) && make clean && make all)

.PHONY: publish
publish: publish-redis publish-postgres publish-kafka publish-router publish-file-server publish-server publish-worker publish-ui publish-agent publish-cluster-agent publish-packagescanner publish-secretscanner publish-malwarescanner publish-graphdb publish-jaeger

.PHONY: publish-redis
publish-redis:
	docker push $(IMAGE_REPOSITORY)/deepfence_redis_ce:$(DF_IMG_TAG)

.PHONY: publish-postgres
publish-postgres:
	docker push $(IMAGE_REPOSITORY)/deepfence_postgres_ce:$(DF_IMG_TAG)

.PHONY: publish-kafka
publish-kafka:
	docker push $(IMAGE_REPOSITORY)/deepfence_kafka_broker_ce:$(DF_IMG_TAG)

.PHONY: publish-router
publish-router:
	docker push $(IMAGE_REPOSITORY)/deepfence_router_ce:$(DF_IMG_TAG)

.PHONY: publish-file-server
publish-file-server:
	docker push $(IMAGE_REPOSITORY)/deepfence_file_server_ce:$(DF_IMG_TAG)

.PHONY: publish-server
publish-server:
	docker push $(IMAGE_REPOSITORY)/deepfence_server_ce:$(DF_IMG_TAG)

.PHONY: publish-worker
publish-worker:
	docker push $(IMAGE_REPOSITORY)/deepfence_worker_ce:$(DF_IMG_TAG)

.PHONY: publish-ui
publish-ui:
	docker push $(IMAGE_REPOSITORY)/deepfence_ui_ce:$(DF_IMG_TAG)

.PHONY: publish-agent
publish-agent:
	docker push $(IMAGE_REPOSITORY)/deepfence_agent_ce:$(DF_IMG_TAG)

.PHONY: publish-cluster-agent
publish-cluster-agent:
	docker push $(IMAGE_REPOSITORY)/deepfence_cluster_agent_ce:$(DF_IMG_TAG)

.PHONY: publish-packagescanner
publish-packagescanner:
	docker push $(IMAGE_REPOSITORY)/deepfence_package_scanner_ce:$(DF_IMG_TAG)

.PHONY: publish-secretscanner
publish-secretscanner:
	docker push $(IMAGE_REPOSITORY)/deepfence_secret_scanner_ce:$(DF_IMG_TAG)

.PHONY: publish-malwarescanner
publish-malwarescanner:
	docker push $(IMAGE_REPOSITORY)/deepfence_malware_scanner_ce:$(DF_IMG_TAG)

.PHONY: publish-graphdb
publish-graphdb:
	docker push $(IMAGE_REPOSITORY)/deepfence_neo4j_ce:$(DF_IMG_TAG)

.PHONY: publish-jaeger
publish-jaeger:
	docker push $(IMAGE_REPOSITORY)/deepfence_telemetry_ce:$(DF_IMG_TAG)

.PHONY: clean
clean:
	-(cd $(DEEPFENCE_AGENT_DIR) && make clean)
	-(cd $(DEEPFENCE_FARGATE_DIR) && rm -rf deepfence-agent-bin-$(VERSION)*)
	-(cd $(ROOT_MAKEFILE_DIR)/deepfence_server && make clean)
	-(cd $(ROOT_MAKEFILE_DIR)/deepfence_worker && make clean)
	-(cd $(DEEPFENCED) && make clean && rm $(DEEPFENCE_AGENT_DIR)/deepfenced)
	-rm -rf $(AGENT_BINARY_DIST)/* $(AGENT_BINARY_BUILD)/*

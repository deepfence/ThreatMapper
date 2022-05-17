PWD=$(shell pwd)

DEEPFENCE_CONSOLE_DIR=$(PWD)/deepfence_console
DEEPFENCE_AGENT_DIR=$(PWD)/deepfence_agent
DEEPFENCE_BACKEND_DIR=$(PWD)/deepfence_backend
DEEPFENCE_UI_DIR=$(PWD)/deepfence_ui
DEEPFENCE_DIAG_DIR=$(PWD)/deepfence_diagnosis
DEEPFENCE_FETCHER_DIR=$(DEEPFENCE_CONSOLE_DIR)/fetcher
VULNERABILITY_MAPPER_DIR=$(PWD)/vulnerability_mapper
SECRET_SCANNER_DIR=$(DEEPFENCE_AGENT_DIR)/plugins/SecretScanner/
PACKAGE_SCANNER_DIR=$D(EEPFENCE_AGENT_DIR)/plugins/package-scanner/
IMAGE_REPOSITORY?=deepfenceio
DF_IMG_TAG?=latest

.PHONY: deepfence_backend

deepfence_backend:
	docker build -f $(DEEPFENCE_BACKEND_DIR)/dockerify/api/Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_api_ce:$(DF_IMG_TAG) $(DEEPFENCE_BACKEND_DIR)
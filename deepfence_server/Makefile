VERSION?=$(shell git describe --tags)
GIT_COMMIT=$(shell git rev-parse HEAD)
BUILD_TIME=$(shell date -u +%FT%TZ)

all: deepfence_server

local: deepfence_server

image:
	docker run --rm -i -e VERSION=${VERSION} -e GIT_COMMIT=${GIT_COMMIT} -e BUILD_TIME=${BUILD_TIME} -v $(ROOT_MAKEFILE_DIR):/src:rw -v /tmp/go:/go:rw $(IMAGE_REPOSITORY)/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /src/deepfence_server && make deepfence_server'
	docker build -f ./Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_server_ce:$(DF_IMG_TAG) ..

vendor: go.mod $(shell find ../deepfence_utils -path ../deepfence_utils/vendor -prune -o -name '*.go')
	go mod tidy -v
	go mod vendor

deepfence_server: vendor $(shell find . -path ./vendor -prune -o -name '*.go')
	go build -buildvcs=false -ldflags="-s -w -X github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants.Version=${VERSION} -X github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants.Commit=${GIT_COMMIT} -X github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants.BuildTime=${BUILD_TIME}"

clean:
	-rm deepfence_server
	-rm -rf ./vendor

.PHONY: all clean image local

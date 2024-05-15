VERSION?=$(shell git describe --tags)
GIT_COMMIT=$(shell git rev-parse HEAD)
BUILD_TIME=$(shell date -u +%FT%TZ)

all: deepfence_worker

local: deepfence_worker

image:
	docker run --rm -i -e VERSION=${VERSION} -e GIT_COMMIT=${GIT_COMMIT} -e BUILD_TIME=${BUILD_TIME} -v $(ROOT_MAKEFILE_DIR):/src:rw -v /tmp/go:/go:rw $(IMAGE_REPOSITORY)/deepfence_glibc_builder_ce:$(DF_IMG_TAG) bash -c 'cd /src/deepfence_worker && make deepfence_worker'
	docker build -f ./Dockerfile --build-arg IMAGE_REPOSITORY=$(IMAGE_REPOSITORY) --build-arg DF_IMG_TAG=$(DF_IMG_TAG) --build-arg AGENT_BINARY_DIST_RELATIVE=$(AGENT_BINARY_DIST_RELATIVE) -t $(IMAGE_REPOSITORY)/deepfence_worker_ce:$(DF_IMG_TAG) ..

vendor: go.mod $(shell find ../deepfence_utils -path ../deepfence_utils/vendor -prune -o -name '*.go')
	go mod tidy -v
	go mod vendor

deepfence_worker: vendor $(shell find . -path ./vendor -prune -o -name '*.go')
	CGO_LDFLAGS="-ljansson -lcrypto -lmagic" go build -buildvcs=false -ldflags="-s -w -X github.com/deepfence/ThreatMapper/deepfence_worker/utils.Version=${VERSION} -X github.com/deepfence/ThreatMapper/deepfence_worker/utils.Commit=${GIT_COMMIT} -X github.com/deepfence/ThreatMapper/deepfence_worker/utils.BuildTime=${BUILD_TIME}"

clean:
	-rm deepfence_worker
	-rm -rf ./vendor

.PHONY: all clean image local

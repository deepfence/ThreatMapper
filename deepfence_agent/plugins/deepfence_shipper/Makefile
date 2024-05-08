VERSION?=`git describe --tags`
GIT_COMMIT=`git rev-parse HEAD`
BUILD_TIME=`date -u +%FT%TZ`

all: deepfence_shipper

local: deepfence_shipper

vendor: go.mod $(shell find ../../../deepfence_utils -path ../../../deepfence_utils/vendor -prune -o -name '*.go')
	go mod tidy -v
	go mod vendor

image:
	docker run --rm -i -e VERSION=${VERSION} -e GIT_COMMIT=${GIT_COMMIT} -e BUILD_TIME=${BUILD_TIME} -v $(ROOT_MAKEFILE_DIR):/src:rw -v /tmp/go:/go:rw $(IMAGE_REPOSITORY)/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /src/deepfence_agent/plugins/deepfence_shipper && make deepfence_shipper'

deepfence_shipper: vendor $(shell find . -path ./vendor -prune -o -name '*.go')
	CGO_ENABLED=0 go build -buildvcs=false -ldflags="-s -w -X main.Version=${VERSION} -X main.Commit=${GIT_COMMIT} -X main.BuildTime=${BUILD_TIME} -extldflags=-static"

clean:
	-rm deepfence_shipper
	-rm -rf ./vendor

.PHONY: all clean image local

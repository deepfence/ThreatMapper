VERSION?=`git describe --tags`
GIT_COMMIT=`git rev-parse HEAD`
BUILD_TIME=`date -u +%FT%TZ`

all: deepfence_server

local: deepfence_server

image:
	docker run --rm -i -v $(ROOT_MAKEFILE_DIR):/src:rw -v /tmp/go:/go:rw deepfenceio/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /src/deepfence_server && make deepfence_server'
	docker build -f ./Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_server_ce:$(DF_IMG_TAG) ..

vendor: go.mod $(shell find ../deepfence_utils -path ../deepfence_utils/vendor -prune -o -name '*.go')
	go mod tidy -v
	go mod vendor

deepfence_server: vendor $(shell find . -path ./vendor -prune -o -name '*.go')
	go build -buildvcs=false -ldflags="-s -w -X main.Version=${VERSION} -X main.Commit=${GIT_COMMIT} -X main.BuildTime=${BUILD_TIME}"

clean:
	-rm deepfence_server
	-rm -rf ./vendor

.PHONY: all clean image local

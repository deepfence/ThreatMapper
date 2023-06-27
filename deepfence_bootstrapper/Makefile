VERSION=`git describe --tags`

all: deepfence_bootstrapper

local: deepfence_bootstrapper

prepare:
	docker run -v $(ROOT_MAKEFILE_DIR):/go:rw deepfenceio/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /go/deepfence_bootstrapper && make deepfence_bootstrapper'

vendor:
	go mod tidy -v
	go mod vendor

deepfence_bootstrapper: vendor $(shell find . -name '*.go')
	CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w -X main.Version=${VERSION} -extldflags=-static" -buildvcs=false
	-upx ./deepfence_bootstrapper

clean:
	rm deepfence_bootstrapper

.PHONY: clean image local all

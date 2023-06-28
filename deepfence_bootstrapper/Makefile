VERSION=`git describe --tags`

all: deepfence_bootstrapper

local: deepfence_bootstrapper

prepare:
	docker run --rm -i -v $(ROOT_MAKEFILE_DIR):/src:rw -v /tmp/go:/go:rw deepfenceio/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /src/deepfence_bootstrapper && make deepfence_bootstrapper'

tidy:
	go mod tidy -v

deepfence_bootstrapper: tidy $(shell find . -name '*.go')
	CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w -X main.Version=${VERSION} -extldflags=-static" -buildvcs=false
	-upx ./deepfence_bootstrapper

clean:
	rm deepfence_bootstrapper

.PHONY: clean image local all

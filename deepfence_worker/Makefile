VERSION?=`git describe --tags`
GIT_COMMIT=`git rev-parse HEAD`
BUILD_TIME=`date -u +%FT%TZ`

all: deepfence_worker

local: deepfence_worker

image:
	docker run --rm -i -v $(ROOT_MAKEFILE_DIR):/src:rw -v /tmp/go:/go:rw deepfenceio/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /src/deepfence_worker && make deepfence_worker'
	docker build -f ./Dockerfile --build-arg IMAGE_REPOSITORY=$(IMAGE_REPOSITORY) --build-arg DF_IMG_TAG=$(DF_IMG_TAG) -t $(IMAGE_REPOSITORY)/deepfence_worker_ce:$(DF_IMG_TAG) ..

vendor: go.mod $(shell find ../deepfence_utils -path ../deepfence_utils/vendor -prune -o -name '*.go')
	go mod tidy -v
	go mod vendor

deepfence_worker: vendor $(shell find . -path ./vendor -prune -o -name '*.go')
	CGO_LDFLAGS="-ljansson -lcrypto -lmagic" go build -buildvcs=false -ldflags="-s -w -X main.Version=${VERSION} -X cronjobs.ConsoleVersion=${VERSION} -X main.Commit=${GIT_COMMIT} -X main.BuildTime=${BUILD_TIME} -extldflags='-static'"

clean:
	-rm deepfence_worker
	-rm -rf ./vendor

.PHONY: all clean image local

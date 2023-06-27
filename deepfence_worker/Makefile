all: deepfence_worker

local: deepfence_worker

image:
	docker run -v $(ROOT_MAKEFILE_DIR):/go:rw deepfenceio/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /go/deepfence_worker && make deepfence_worker'
	docker build -f ./Dockerfile --build-arg IMAGE_REPOSITORY=$(IMAGE_REPOSITORY) --build-arg DF_IMG_TAG=$(DF_IMG_TAG) -t $(IMAGE_REPOSITORY)/deepfence_worker_ce:$(DF_IMG_TAG) ..

vendor:
	go mod tidy -v
	go mod vendor

deepfence_worker: vendor $(shell find . -name '*.go')
	go build -buildvcs=false

clean:
	rm deepfence_worker

.PHONY: all clean image local

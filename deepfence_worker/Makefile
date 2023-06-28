all: deepfence_worker

local: deepfence_worker

image:
	docker run --rm -i -v $(ROOT_MAKEFILE_DIR):/src:rw -v /tmp/go:/go:rw deepfenceio/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /src/deepfence_worker && make deepfence_worker'
	docker build -f ./Dockerfile --build-arg IMAGE_REPOSITORY=$(IMAGE_REPOSITORY) --build-arg DF_IMG_TAG=$(DF_IMG_TAG) -t $(IMAGE_REPOSITORY)/deepfence_worker_ce:$(DF_IMG_TAG) ..

tidy:
	go mod tidy -v

deepfence_worker: tidy $(shell find . -name '*.go')
	go build -buildvcs=false

clean:
	rm deepfence_worker

.PHONY: all clean image local

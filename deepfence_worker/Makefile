all: vendor build

local: build

image:
	docker run -i --rm -v $(ROOT_MAKEFILE_DIR):/go:rw deepfenceio/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /go/deepfence_worker && make build'
	docker build -f ./Dockerfile --build-arg IMAGE_REPOSITORY=$(IMAGE_REPOSITORY) --build-arg DF_IMG_TAG=$(DF_IMG_TAG) -t $(IMAGE_REPOSITORY)/deepfence_worker_ce:$(DF_IMG_TAG) ..


vendor:
	go mod tidy -v
	go mod vendor

build: ./*.go ./**/*.go
	go build -buildvcs=false

clean:
	rm deepfence_worker

.PHONY: build vendor clean

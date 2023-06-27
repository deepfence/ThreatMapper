all: vendor build

local: build

image:
	docker run -i --rm -v $(ROOT_MAKEFILE_DIR):/go:rw deepfenceio/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /go/deepfence_server && make build'
	docker build -f ./Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_server_ce:$(DF_IMG_TAG) ..

vendor:
	go mod tidy -v
	go mod vendor

build: ./*.go ./**/*.go
	go build -buildvcs=false

clean:
	rm deepfence_server

.PHONY: build vendor clean image

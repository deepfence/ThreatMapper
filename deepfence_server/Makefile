all: vendor deepfence_server

local: deepfence_server

image:
	docker run -v $(ROOT_MAKEFILE_DIR):/go:rw deepfenceio/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /go/deepfence_server && make deepfence_server'
	docker build -f ./Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_server_ce:$(DF_IMG_TAG) ..

vendor:
	go mod tidy -v
	go mod vendor

deepfence_server: ./*.go ./**/*.go
	go build -buildvcs=false

clean:
	rm deepfence_server

.PHONY: vendor clean image

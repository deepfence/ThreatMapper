all: deepfence_server

local: deepfence_server

image:
	docker run --rm -i -v $(ROOT_MAKEFILE_DIR):/src:rw -v /tmp/go:/go:rw deepfenceio/deepfence_builder_ce:$(DF_IMG_TAG) bash -c 'cd /src/deepfence_server && make deepfence_server'
	docker build -f ./Dockerfile -t $(IMAGE_REPOSITORY)/deepfence_server_ce:$(DF_IMG_TAG) ..

tidy:
	go mod tidy -v

deepfence_server: tidy $(shell find . -name '*.go')
	go build -buildvcs=false

clean:
	rm deepfence_server

.PHONY: all clean image local

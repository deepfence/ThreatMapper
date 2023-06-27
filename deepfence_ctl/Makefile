all: deepfencectl

vendor:
	go mod tidy -v
	go mod vendor

deepfencectl: vendor $(shell find . -name '*.go')
	CGO_ENABLED=0 go build -o deepfencectl

clean:
	rm -f deepfencectl

.PHONY: all clean

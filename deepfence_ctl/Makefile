all: deepfencectl

tidy:
	go mod tidy -v

deepfencectl: tidy $(shell find . -name '*.go')
	CGO_ENABLED=0 go build -o deepfencectl

clean:
	rm -f deepfencectl

.PHONY: all clean

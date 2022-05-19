FLUENT_BIT?=/opt/fluent-bit/bin/fluent-bit

all:
	go mod tidy && go build -buildmode=c-shared -o out_deepfence.so

clean:
	rm -rf *.so *.h *~

docker:
	docker build -t fluentbit:deepfence .

run: all
	TEST=abc $(FLUENT_BIT) -c local-fluent-bit.conf
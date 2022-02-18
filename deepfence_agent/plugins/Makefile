all: localinit proto bin/SecretScanner bin/open-tracer bin/package-scanner

localinit:
	$(PWD)/bootstrap.sh

bin/open-tracer: ./open-tracer/**/*.rs
	(cd open-tracer/open-tracer-ebpf && cargo build --release)
	(cd open-tracer/open-tracer-usr && OPEN_TRACER_EBPF_BIN_ABS_PATH=$(PWD)/open-tracer/target/bpfel-unknown-none/release/open-tracer-ebpf cargo build --release)
	cp $(PWD)/open-tracer/target/release/open-tracer $(PWD)/bin

bin/SecretScanner: ./SecretScanner/**/*.go
	(cd SecretScanner && make)
	cp $(PWD)/SecretScanner/SecretScanner $(PWD)/bin
	cp $(PWD)/SecretScanner/config.yaml $(PWD)/bin

bin/package-scanner:
	(cd package-scanner && make)
	cp $(PWD)/package-scanner/package-scanner $(PWD)/bin

proto: ./agent-plugins-grpc/proto/*.proto
	(cd agent-plugins-grpc && make go)
	cp agent-plugins-grpc/proto/*.go $(PWD)/proto

clean:
	-rm $(PWD)/bin/open-tracer
	-rm $(PWD)/bin/SecretScanner
	-rm $(PWD)/bin/package-scanner
	cargo clean --manifest-path=./open-tracer/Cargo.toml
	(cd agent-plugins-grpc && make clean)

.PHONY: clean localinit

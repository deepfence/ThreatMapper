all: localinit go bin/open_tracer bin/vulnerability_sbom_plugin bin/SecretScanner

localinit:
	$(PWD)/bootstrap.sh

bin/open-tracer: $(PWD)/open-tracer/**/*.rs
	(cd open-tracer/open-tracer-ebpf && cargo build --release)
	(cd open-tracer/open-tracer-usr && OPEN_TRACER_EBPF_BIN_ABS_PATH=$(PWD)/open-tracer/target/bpfel-unknown-none/release/open-tracer-ebpf cargo build --release)
	cp $(PWD)/open-tracer/target/release/open-tracer $(PWD)/bin

bin/SecretScanner: $(PWD)/SecretScanner/**/*.go
	(cd SecretScanner && go mod vendor && go build)
	cp $(PWD)/SecretScanner/SecretScanner $(PWD)/bin
	cp $(PWD)/SecretScanner/config.yaml $(PWD)/bin

bin/vulnerability_sbom_plugin:
	(cd vulnerability-sbom-plugin && make)
	cp $(PWD)/vulnerability-sbom-plugin/vulnerability-sbom-plugin $(PWD)/bin

proto/*.go: $(PWD)/agent-plugins-grpc/proto/*.proto
	(cd agent-plugins-grpc && make go)
	cp agent-plugins-grpc/proto/*.go $(PWD)/proto

clean:
	-rm $(PWD)/bin/open-tracer
	-rm $(PWD)/bin/SecretScanner
	cargo clean --manifest-path=./open-tracer/Cargo.toml
	(cd agent-plugins-grpc && make clean)

.PHONY: clean localinit

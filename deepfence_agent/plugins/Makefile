all: localinit proto bin/SecretScanner bin/package-scanner bin/YaraHunter
# bin/open-tracer

localinit:
	$(PWD)/bootstrap.sh

#bin/open-tracer: ./open-tracer/**/*.rs
#	(cd open-tracer/open-tracer-ebpf && cargo build --release)
#	(cd open-tracer/open-tracer-usr && OPEN_TRACER_EBPF_BIN_ABS_PATH=$(PWD)/open-tracer/target/bpfel-unknown-none/release/open-tracer-ebpf cargo build --release)
#	cp $(PWD)/open-tracer/target/release/open-tracer $(PWD)/bin

bin/SecretScanner: ./SecretScanner/**/*.go
	(cd SecretScanner && make)
	mkdir $(PWD)/bin/secret-scanner/
	cp $(PWD)/SecretScanner/SecretScanner $(PWD)/bin/secret-scanner/
	cp $(PWD)/SecretScanner/config.yaml $(PWD)/bin/secret-scanner/

bin/YaraHunter: ./YaraHunter/**/*.go
	(cd YaraHunter && make)
	mkdir $(PWD)/bin/yara-hunter/
	cp $(PWD)/YaraHunter $(PWD)/bin/yara-hunter/
	cp $(PWD)/YaraHunter/config.yaml $(PWD)/bin/yara-hunter/

bin/package-scanner:
	(cd package-scanner && make)
	cp $(PWD)/package-scanner/package-scanner $(PWD)/bin

bin/compliance:
	(cd compliance && make)
	cp $(PWD)/compliance/compliance $(PWD)/bin

proto: ./agent-plugins-grpc/proto/*.proto
	(cd agent-plugins-grpc && make go)
	cp agent-plugins-grpc/proto/*.go $(PWD)/proto

clean:
	-#rm $(PWD)/bin/open-tracer
	-rm -rf $(PWD)/bin/secret-scanner/
	-rm -rf $(PWD)/bin/YaraHunter/
	-rm $(PWD)/bin/package-scanner
	#cargo clean --manifest-path=./open-tracer/Cargo.toml
	(cd agent-plugins-grpc && make clean)

.PHONY: clean localinit

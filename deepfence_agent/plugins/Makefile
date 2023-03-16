all: localinit proto bin/SecretScanner bin/package-scanner bin/YaraHunter
# bin/open-tracer

localinit:
	$(PWD)/bootstrap.sh

bin/SecretScanner: ./SecretScanner/**/*.go
	(cd SecretScanner && make)
	-mkdir $(PWD)/bin/secret-scanner/
	cp $(PWD)/SecretScanner/SecretScanner $(PWD)/bin/secret-scanner/
	cp $(PWD)/SecretScanner/config.yaml $(PWD)/bin/secret-scanner/

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
	-rm -rf $(PWD)/bin/secret-scanner/
	-rm -rf $(PWD)/bin/YaraHunter/
	-rm $(PWD)/bin/package-scanner
	(cd agent-plugins-grpc && make clean)

.PHONY: clean localinit

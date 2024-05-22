all: localinit

localinit:

clean:
	-rm -rf $(PWD)/bin/secret-scanner/
	-rm -rf $(PWD)/bin/yara-hunter/
	-rm $(PWD)/bin/package-scanner
	-rm $(PWD)/bin/compliance
	-rm $(PWD)/bin/cloud-scanner
	-(cd agent-plugins-grpc && make clean)
	-(cd $(PWD)/deepfence_shipper && make clean)

.PHONY: clean localinit all

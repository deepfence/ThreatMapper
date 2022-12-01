module github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/compliance_check

go 1.19

replace github.com/deepfence/df-utils => ../deepfence/df-utils/

replace github.com/deepfence/df-utils/osrelease => ../deepfence/df-utils/osrelease

require github.com/deepfence/df-utils v0.0.0-00010101000000-000000000000

require (
	github.com/sirupsen/logrus v1.9.0 // indirect
	github.com/weaveworks/scope v1.13.2 // indirect
	golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
)

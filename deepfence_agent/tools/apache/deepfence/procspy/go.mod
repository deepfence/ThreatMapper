module github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/deepfence/procspy

go 1.20

replace github.com/deepfence/df-utils => ../df-utils/

replace github.com/deepfence/df-utils/osrelease => ../df-utils/osrelease

require (
	github.com/deepfence/df-utils v0.0.0-00010101000000-000000000000
	github.com/weaveworks/procspy v0.0.0-20150706124340-cb970aa190c3
)

require (
	github.com/sirupsen/logrus v1.9.3 // indirect
	github.com/weaveworks/scope v1.13.2 // indirect
	golang.org/x/sys v0.0.0-20220715151400-c0bba94af5f8 // indirect
)

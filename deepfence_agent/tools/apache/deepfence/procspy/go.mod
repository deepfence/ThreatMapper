module github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/deepfence/procspy

go 1.17

replace github.com/deepfence/df-utils => ../df-utils/

replace github.com/deepfence/df-utils/osrelease => ../df-utils/osrelease

require (
	github.com/deepfence/df-utils v0.0.0-00010101000000-000000000000
	github.com/weaveworks/procspy v0.0.0-20150706124340-cb970aa190c3
)

require (
	github.com/deepfence/df-utils/osrelease v0.0.0-00010101000000-000000000000 // indirect
	github.com/konsorten/go-windows-terminal-sequences v1.0.1 // indirect
	github.com/sirupsen/logrus v1.4.2 // indirect
	github.com/weaveworks/scope v1.13.2 // indirect
	golang.org/x/sys v0.0.0-20200122134326-e047566fdf82 // indirect
)

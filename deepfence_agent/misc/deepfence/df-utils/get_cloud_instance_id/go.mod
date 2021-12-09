module github.com/deepfence/ThreatMapper/deepfence_agent/misc/deepfence/df-utils/get_cloud_instance_id

go 1.17

replace github.com/deepfence/df-utils => ../../df-utils/

replace github.com/deepfence/df-utils/cloud_metadata => ../cloud_metadata

require github.com/deepfence/df-utils/cloud_metadata v0.0.0-00010101000000-000000000000

require (
	github.com/deepfence/df-utils v0.0.0-00010101000000-000000000000 // indirect
	github.com/weaveworks/scope v1.13.2 // indirect
)

package model

import "github.com/deepfence/ThreatMapper/deepfence_utils/controls"

type ScanTrigger struct {
	NodeId       string                `json:"node_id" required:"true"`
	ResourceId   string                `json:"resource_id" required:"true"`
	ResourceType controls.ScanResource `json:"resource_type" required:"true"`
}

type ScanTriggerResp struct {
	ScanId string `json:"scan_id" required:"true"`
}

type ScanStatusReq struct {
	ScanId string `json:"scan_id" required:"true"`
}

type ScanStatus struct {
	Status string `json:"status" required:"true"`
}

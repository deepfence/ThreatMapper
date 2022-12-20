package model

import (
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

type ScanTrigger struct {
	NodeId       string                `json:"node_id" required:"true"`
	ResourceId   string                `json:"resource_id" required:"true"`
	ResourceType controls.ScanResource `json:"resource_type" required:"true"`
}

type ScanStatus string

const (
	SCAN_STATUS_SUCCESS    = utils.SCAN_STATUS_SUCCESS
	SCAN_STATUS_STARTING   = utils.SCAN_STATUS_STARTING
	SCAN_STATUS_INPROGRESS = utils.SCAN_STATUS_INPROGRESS
)

type ScanTriggerResp struct {
	ScanId string `json:"scan_id" required:"true"`
}

type ScanStatusReq struct {
	ScanId string `json:"scan_id" required:"true"`
}

type ScanStatusResp struct {
	Status ScanStatus `json:"status" required:"true"`
}

package model

import (
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

type ScanTriggerReq struct {
	NodeId   string `json:"node_id" required:"true"`
	NodeType string `json:"node_type" required:"true" enum:"image,host,container"`
}

type ScanStatus string

type ScanInfo struct {
	ScanId    string `json:"scan_id" required:"true"`
	Status    string `json:"status" required:"true"`
	UpdatedAt int64  `json:"updated_at" required:"true" format:"int64"`
}

const (
	SCAN_STATUS_SUCCESS    = utils.SCAN_STATUS_SUCCESS
	SCAN_STATUS_STARTING   = utils.SCAN_STATUS_STARTING
	SCAN_STATUS_INPROGRESS = utils.SCAN_STATUS_INPROGRESS
)

type ScanTriggerResp struct {
	ScanId string `json:"scan_id" required:"true"`
}

type ScanStatusReq struct {
	ScanId string `query:"scan_id" form:"scan_id" required:"true"`
}

type ScanStatusResp struct {
	Status ScanStatus `json:"status" required:"true"`
}

type ScanListReq struct {
	NodeId   string      `json:"node_id" required:"true"`
	NodeType string      `json:"node_type" required:"true" enum:"image,host,container"`
	Window   FetchWindow `json:"window"  required:"true"`
}

type ScanListResp struct {
	ScansInfo []ScanInfo `json:"scans_info" required:"true"`
}

type ScanResultsReq struct {
	ScanId string      `json:"scan_id" required:"true"`
	Window FetchWindow `json:"window"  required:"true"`
}

type ScanResultsResp struct {
	Results []map[string]interface{} `json:"results" required:"true"`
}

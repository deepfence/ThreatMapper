package model

import (
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

type GenerateReportReq struct {
	ReportType    string              `json:"report_type" validate:"required" required:"true" enum:"pdf,xlsx,sbom"`
	FromTimestamp int64               `json:"from_timestamp"` // timestamp in milliseconds
	ToTimestamp   int64               `json:"to_timestamp"`   // timestamp in milliseconds
	Filters       utils.ReportFilters `json:"filters"`
	Options       utils.ReportOptions `json:"options" validate:"omitempty"`
}

type GenerateReportResp struct {
	ReportID string `json:"report_id"`
}

type ReportReq struct {
	ReportID string `json:"report_id" path:"report_id" validate:"required" required:"true"`
}

type BulkDeleteReportReq struct {
	ReportIDs []string `json:"report_ids" required:"true"`
}

type ExportReport struct {
	UpdatedAt     int64  `json:"updated_at"`
	ReportID      string `json:"report_id"`
	CreatedAt     int64  `json:"created_at"`
	Filters       string `json:"filters"`
	Type          string `json:"type"`
	URL           string `json:"url"`
	FileName      string `json:"-"`
	Status        string `json:"status"`
	StoragePath   string `json:"storage_path"`
	FromTimestamp int64  `json:"from_timestamp"` // timestamp in milliseconds
	ToTimestamp   int64  `json:"to_timestamp"`   // timestamp in milliseconds
}

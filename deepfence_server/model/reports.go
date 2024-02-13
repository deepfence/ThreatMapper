package model

import (
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

type GenerateReportReq struct {
	ReportType string              `json:"report_type" validate:"required" required:"true" enum:"pdf,xlsx,sbom"`
	Duration   int                 `json:"duration" enum:"0,1,7,30,60,90,180"`
	Filters    utils.ReportFilters `json:"filters"`
	Options    utils.ReportOptions `json:"options" validate:"omitempty"`
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
	Duration    int    `json:"duration"`
	UpdatedAt   int64  `json:"updated_at"`
	ReportID    string `json:"report_id"`
	CreatedAt   int64  `json:"created_at"`
	Filters     string `json:"filters"`
	Type        string `json:"type"`
	URL         string `json:"url"`
	Status      string `json:"status"`
	StoragePath string `json:"storage_path"`
}

package model

import (
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

type GenerateReportReq struct {
	ReportType string              `json:"report_type" validate:"required" required:"true"`
	Duration   int                 `json:"duration"`
	Filters    utils.ReportFilters `json:"filters"`
}

type GenerateReportResp struct {
	ReportID string `json:"report_id"`
}

type ReportReq struct {
	ReportID string `json:"report_id" path:"report_id" validate:"required" required:"true"`
}

type ExportReport struct {
	Duration  int    `json:"duration"`
	UpdatedAt int64  `json:"updated_at"`
	ReportID  string `json:"report_id"`
	CreatedAt int64  `json:"created_at"`
	Filters   string `json:"filters"`
	Type      string `json:"type"`
	URL       string `json:"url"`
	Status    string `json:"status"`
}

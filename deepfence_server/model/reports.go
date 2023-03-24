package model

import (
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

type GenerateReportReq struct {
	ReportType string              `json:"report_type"`
	Duration   int                 `json:"duration"`
	Filters    utils.ReportFilters `json:"filters"`
}

type GenerateReportResp struct {
	ReportID string `json:"report_id"`
}

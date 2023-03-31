package reports

import (
	"context"
	"sort"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	rptScans "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	rptSearch "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type Info struct {
	Title          string
	StartTime      string
	EndTime        string
	AppliedFilters utils.ReportFilters
	NodeWiseData   NodeWiseData
}

type NodeWiseData struct {
	SeverityCount       map[string]map[string]int32
	VulnerabilityData   map[string][]model.Vulnerability
	SecretData          map[string][]model.Secret
	MalwareData         map[string][]model.Malware
	ComplianceData      map[string][]model.Compliance
	CloudComplianceData map[string][]model.CloudCompliance
}

func nodeTypeFilter(nodeType string) rptSearch.SearchScanReq {
	return rptSearch.SearchScanReq{
		NodeFilter: rptSearch.SearchFilter{
			Filters: reporters.FieldsFilters{
				ContainsFilter: reporters.ContainsFilter{
					FieldsValues: map[string][]interface{}{
						"node_type": {nodeType},
					},
				},
			},
		},
	}
}

func levelFilter(key string, value []string) reporters.FieldsFilters {
	if len(value) > 0 {
		return reporters.FieldsFilters{
			MatchFilter: reporters.MatchFilter{
				FieldsValues: map[string][]interface{}{
					key: utils.StringArrayToInterfaceArray(value),
				},
			},
		}
	}
	return reporters.FieldsFilters{}
}

func timeNow() string {
	return time.Now().Format(time.RFC822)
}

func getVulnerabilityData(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*Info, error) {
	scans, err := rptSearch.SearchScansReport(ctx, nodeTypeFilter(params.Filters.NodeType), utils.NEO4J_VULNERABILITY_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("vulnerability scan info: %+v", scans)

	severityFilter := levelFilter("cve_severity", params.Filters.SeverityOrCheckType)

	nodeWiseData := NodeWiseData{
		SeverityCount:     make(map[string]map[string]int32),
		VulnerabilityData: make(map[string][]model.Vulnerability),
	}

	for _, s := range scans {
		result, _, err := rptScans.GetScanResults[model.Vulnerability](
			ctx, utils.NEO4J_VULNERABILITY_SCAN, s.ScanId, severityFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		sort.Slice(result[:], func(i, j int) bool {
			return result[i].Cve_severity < result[j].Cve_severity
		})
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.VulnerabilityData[s.NodeId] = result
	}

	data := Info{
		Title:          "Vulnerability Scan Report",
		StartTime:      timeNow(),
		EndTime:        timeNow(),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	return &data, nil
}

func getSecretData(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*Info, error) {
	scans, err := rptSearch.SearchScansReport(ctx, nodeTypeFilter(params.Filters.NodeType), utils.NEO4J_SECRET_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("secret scan info: %+v", scans)

	severityFilter := levelFilter("level", params.Filters.SeverityOrCheckType)

	nodeWiseData := NodeWiseData{
		SeverityCount: make(map[string]map[string]int32),
		SecretData:    make(map[string][]model.Secret),
	}

	for _, s := range scans {
		result, _, err := rptScans.GetScanResults[model.Secret](
			ctx, utils.NEO4J_SECRET_SCAN, s.ScanId, severityFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		sort.Slice(result[:], func(i, j int) bool {
			return result[i].Level < result[j].Level
		})
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.SecretData[s.NodeId] = result
	}

	data := Info{
		Title:          "Secrets Scan Report",
		StartTime:      timeNow(),
		EndTime:        timeNow(),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	return &data, nil
}

func getMalwareData(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*Info, error) {
	scans, err := rptSearch.SearchScansReport(ctx, nodeTypeFilter(params.Filters.NodeType), utils.NEO4J_MALWARE_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("malware scan info: %+v", scans)

	severityFilter := levelFilter("file_severity", params.Filters.SeverityOrCheckType)

	nodeWiseData := NodeWiseData{
		SeverityCount: make(map[string]map[string]int32),
		MalwareData:   make(map[string][]model.Malware),
	}

	for _, s := range scans {
		result, _, err := rptScans.GetScanResults[model.Malware](
			ctx, utils.NEO4J_MALWARE_SCAN, s.ScanId, severityFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		sort.Slice(result[:], func(i, j int) bool {
			return result[i].FileSeverity < result[j].FileSeverity
		})
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.MalwareData[s.NodeId] = result
	}

	data := Info{
		Title:          "Malware Scan Report",
		StartTime:      timeNow(),
		EndTime:        timeNow(),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	return &data, nil
}

func getComplianceData(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*Info, error) {
	scans, err := rptSearch.SearchScansReport(ctx, nodeTypeFilter(params.Filters.NodeType), utils.NEO4J_COMPLIANCE_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("compliance scan info: %+v", scans)

	severityFilter := levelFilter("file_severity", params.Filters.SeverityOrCheckType)

	nodeWiseData := NodeWiseData{
		SeverityCount:  make(map[string]map[string]int32),
		ComplianceData: make(map[string][]model.Compliance),
	}

	for _, s := range scans {
		result, _, err := rptScans.GetScanResults[model.Compliance](
			ctx, utils.NEO4J_COMPLIANCE_SCAN, s.ScanId, severityFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		sort.Slice(result[:], func(i, j int) bool {
			return result[i].ComplianceCheckType < result[j].ComplianceCheckType
		})
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.ComplianceData[s.NodeId] = result
	}

	data := Info{
		Title:          "Compliance Scan Report",
		StartTime:      timeNow(),
		EndTime:        timeNow(),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	return &data, nil
}

func getCloudComplianceData(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*Info, error) {
	scans, err := rptSearch.SearchScansReport(ctx, nodeTypeFilter(params.Filters.NodeType), utils.NEO4J_CLOUD_COMPLIANCE_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("cloud compliance scan info: %+v", scans)

	severityFilter := levelFilter("file_severity", params.Filters.SeverityOrCheckType)

	nodeWiseData := NodeWiseData{
		SeverityCount:       make(map[string]map[string]int32),
		CloudComplianceData: make(map[string][]model.CloudCompliance),
	}

	for _, s := range scans {
		result, _, err := rptScans.GetScanResults[model.CloudCompliance](
			ctx, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, s.ScanId, severityFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		sort.Slice(result[:], func(i, j int) bool {
			return result[i].ComplianceCheckType < result[j].ComplianceCheckType
		})
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.CloudComplianceData[s.NodeId] = result
	}

	data := Info{
		Title:          "Cloud Compliance Scan Report",
		StartTime:      timeNow(),
		EndTime:        timeNow(),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	return &data, nil
}

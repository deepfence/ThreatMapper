package reports

import (
	"context"
	"math"
	"sort"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	rptScans "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	rptSearch "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	sdkUtils "github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	VULNERABILITY    = "vulnerability"
	SECRET           = "secret"
	MALWARE          = "malware"
	COMPLIANCE       = "compliance"
	CLOUD_COMPLIANCE = "cloud_compliance"
)

type Info[T any] struct {
	ScanType       string
	Title          string
	StartTime      string
	EndTime        string
	AppliedFilters sdkUtils.ReportFilters
	NodeWiseData   NodeWiseData[T]
}

type ScanData[T any] struct {
	ScanInfo    model.ScanResultsCommon
	ScanResults []T
}

type NodeWiseData[T any] struct {
	SeverityCount map[string]map[string]int32
	ScanData      map[string]ScanData[T]
}

func searchScansFilter(params sdkUtils.ReportParams) rptSearch.SearchScanReq {
	filters := rptSearch.SearchScanReq{}

	filters.NodeFilter = rptSearch.SearchFilter{
		Filters: reporters.FieldsFilters{
			ContainsFilter: reporters.ContainsFilter{
				FieldsValues: map[string][]interface{}{
					"node_type": {params.Filters.NodeType},
				},
			},
		},
	}

	if len(params.Filters.AdvancedReportFilters.HostName) > 0 {
		filters.NodeFilter.Filters.ContainsFilter.FieldsValues["host_name"] = sdkUtils.StringArrayToInterfaceArray(params.Filters.AdvancedReportFilters.HostName)
	}

	if len(params.Filters.AdvancedReportFilters.KubernetesClusterName) > 0 {
		filters.NodeFilter.Filters.ContainsFilter.FieldsValues["kubernetes_cluster_name"] = sdkUtils.StringArrayToInterfaceArray(params.Filters.AdvancedReportFilters.KubernetesClusterName)
	}

	if len(params.Filters.AdvancedReportFilters.PodName) > 0 {
		filters.NodeFilter.Filters.ContainsFilter.FieldsValues["pod_name"] = sdkUtils.StringArrayToInterfaceArray(params.Filters.AdvancedReportFilters.PodName)
	}

	if len(params.Filters.AdvancedReportFilters.ContainerName) > 0 {
		filters.NodeFilter.Filters.ContainsFilter.FieldsValues["node_id"] = sdkUtils.StringArrayToInterfaceArray(params.Filters.AdvancedReportFilters.ContainerName)
	}

	if len(params.Filters.AdvancedReportFilters.ImageName) > 0 {
		filters.NodeFilter.Filters.ContainsFilter.FieldsValues["node_id"] = sdkUtils.StringArrayToInterfaceArray(params.Filters.AdvancedReportFilters.ImageName)
	}

	if len(params.Filters.AdvancedReportFilters.AccountId) > 0 {
		filters.NodeFilter.Filters.ContainsFilter.FieldsValues["account_id"] = sdkUtils.StringArrayToInterfaceArray(params.Filters.AdvancedReportFilters.AccountId)
	}

	if len(params.Filters.ScanId) > 0 {
		filters.ScanFilter = rptSearch.SearchFilter{
			Filters: reporters.FieldsFilters{
				ContainsFilter: reporters.ContainsFilter{
					FieldsValues: map[string][]interface{}{
						"node_id": {params.Filters.ScanId},
					},
				},
			},
		}
	}

	return filters
}

func levelFilter(key string, value []string) reporters.FieldsFilters {
	if len(value) > 0 {
		return reporters.FieldsFilters{
			MatchFilter: reporters.MatchFilter{
				FieldsValues: map[string][]interface{}{
					key: sdkUtils.StringArrayToInterfaceArray(value),
				},
			},
		}
	}
	return reporters.FieldsFilters{}
}

func getVulnerabilityData(ctx context.Context, session neo4j.Session, params sdkUtils.ReportParams) (*Info[model.Vulnerability], error) {

	searchFilter := searchScansFilter(params)

	var (
		end   time.Time
		start time.Time
	)

	if params.Duration > 0 && len(params.Filters.ScanId) == 0 {
		end := time.Now()
		start := end.AddDate(0, 0, int(math.Copysign(float64(params.Duration), -1)))
		searchFilter.ScanFilter = rptSearch.SearchFilter{
			Filters: reporters.FieldsFilters{
				CompareFilters: utils.TimeRangeFilter("updated_at", start, end),
			},
		}
	}

	scans, err := rptSearch.SearchScansReport(ctx, searchFilter, sdkUtils.NEO4J_VULNERABILITY_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("vulnerability scan info: %+v", scans)

	severityFilter := levelFilter("cve_severity", params.Filters.SeverityOrCheckType)

	nodeWiseData := NodeWiseData[model.Vulnerability]{
		SeverityCount: make(map[string]map[string]int32),
		ScanData:      make(map[string]ScanData[model.Vulnerability]),
	}

	for _, s := range scans {
		result, common, err := rptScans.GetScanResults[model.Vulnerability](
			ctx, sdkUtils.NEO4J_VULNERABILITY_SCAN, s.ScanId, severityFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		sort.Slice(result[:], func(i, j int) bool {
			return result[i].Cve_severity < result[j].Cve_severity
		})
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.ScanData[s.NodeId] = ScanData[model.Vulnerability]{
			ScanInfo:    common,
			ScanResults: result,
		}
	}

	data := Info[model.Vulnerability]{
		ScanType:       VULNERABILITY,
		Title:          "Vulnerability Scan Report",
		StartTime:      start.Format(time.RFC822Z),
		EndTime:        end.Format(time.RFC822Z),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	return &data, nil
}

func getSecretData(ctx context.Context, session neo4j.Session, params sdkUtils.ReportParams) (*Info[model.Secret], error) {

	searchFilter := searchScansFilter(params)

	var (
		end   time.Time
		start time.Time
	)

	if params.Duration > 0 && len(params.Filters.ScanId) == 0 {
		end = time.Now()
		start = end.AddDate(0, 0, int(math.Copysign(float64(params.Duration), -1)))
		searchFilter.ScanFilter = rptSearch.SearchFilter{
			Filters: reporters.FieldsFilters{
				CompareFilters: utils.TimeRangeFilter("updated_at", start, end),
			},
		}
	}
	scans, err := rptSearch.SearchScansReport(ctx, searchFilter, sdkUtils.NEO4J_SECRET_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("secret scan info: %+v", scans)

	severityFilter := levelFilter("level", params.Filters.SeverityOrCheckType)

	nodeWiseData := NodeWiseData[model.Secret]{
		SeverityCount: make(map[string]map[string]int32),
		ScanData:      make(map[string]ScanData[model.Secret]),
	}

	for _, s := range scans {
		result, common, err := rptScans.GetScanResults[model.Secret](
			ctx, sdkUtils.NEO4J_SECRET_SCAN, s.ScanId, severityFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		sort.Slice(result[:], func(i, j int) bool {
			return result[i].Level < result[j].Level
		})
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.ScanData[s.NodeId] = ScanData[model.Secret]{
			ScanInfo:    common,
			ScanResults: result,
		}
	}

	data := Info[model.Secret]{
		ScanType:       SECRET,
		Title:          "Secrets Scan Report",
		StartTime:      start.Format(time.RFC822Z),
		EndTime:        end.Format(time.RFC822Z),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	return &data, nil
}

func getMalwareData(ctx context.Context, session neo4j.Session, params sdkUtils.ReportParams) (*Info[model.Malware], error) {

	searchFilter := searchScansFilter(params)

	var (
		end   time.Time
		start time.Time
	)

	if params.Duration > 0 && len(params.Filters.ScanId) == 0 {
		end = time.Now()
		start = end.AddDate(0, 0, int(math.Copysign(float64(params.Duration), -1)))
		searchFilter.ScanFilter = rptSearch.SearchFilter{
			Filters: reporters.FieldsFilters{
				CompareFilters: utils.TimeRangeFilter("updated_at", start, end),
			},
		}
	}
	scans, err := rptSearch.SearchScansReport(ctx, searchFilter, sdkUtils.NEO4J_MALWARE_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("malware scan info: %+v", scans)

	severityFilter := levelFilter("file_severity", params.Filters.SeverityOrCheckType)

	nodeWiseData := NodeWiseData[model.Malware]{
		SeverityCount: make(map[string]map[string]int32),
		ScanData:      make(map[string]ScanData[model.Malware]),
	}

	for _, s := range scans {
		result, common, err := rptScans.GetScanResults[model.Malware](
			ctx, sdkUtils.NEO4J_MALWARE_SCAN, s.ScanId, severityFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		sort.Slice(result[:], func(i, j int) bool {
			return result[i].FileSeverity < result[j].FileSeverity
		})
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.ScanData[s.NodeId] = ScanData[model.Malware]{
			ScanInfo:    common,
			ScanResults: result,
		}
	}

	data := Info[model.Malware]{
		ScanType:       MALWARE,
		Title:          "Malware Scan Report",
		StartTime:      start.Format(time.RFC822Z),
		EndTime:        end.Format(time.RFC822Z),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	return &data, nil
}

func getComplianceData(ctx context.Context, session neo4j.Session, params sdkUtils.ReportParams) (*Info[model.Compliance], error) {

	searchFilter := searchScansFilter(params)

	var (
		end   time.Time
		start time.Time
	)

	if params.Duration > 0 && len(params.Filters.ScanId) == 0 {
		end = time.Now()
		start = end.AddDate(0, 0, int(math.Copysign(float64(params.Duration), -1)))
		searchFilter.ScanFilter = rptSearch.SearchFilter{
			Filters: reporters.FieldsFilters{
				CompareFilters: utils.TimeRangeFilter("updated_at", start, end),
			},
		}
	}
	scans, err := rptSearch.SearchScansReport(ctx, searchFilter, sdkUtils.NEO4J_COMPLIANCE_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("compliance scan info: %+v", scans)

	severityFilter := levelFilter("compliance_check_type", params.Filters.SeverityOrCheckType)

	nodeWiseData := NodeWiseData[model.Compliance]{
		SeverityCount: make(map[string]map[string]int32),
		ScanData:      make(map[string]ScanData[model.Compliance]),
	}

	for _, s := range scans {
		result, common, err := rptScans.GetScanResults[model.Compliance](
			ctx, sdkUtils.NEO4J_COMPLIANCE_SCAN, s.ScanId, severityFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		sort.Slice(result[:], func(i, j int) bool {
			return result[i].ComplianceCheckType < result[j].ComplianceCheckType
		})
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.ScanData[s.NodeId] = ScanData[model.Compliance]{
			ScanInfo:    common,
			ScanResults: result,
		}
	}

	data := Info[model.Compliance]{
		ScanType:       COMPLIANCE,
		Title:          "Compliance Scan Report",
		StartTime:      start.Format(time.RFC822Z),
		EndTime:        end.Format(time.RFC822Z),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	return &data, nil
}

func getCloudComplianceData(ctx context.Context, session neo4j.Session, params sdkUtils.ReportParams) (*Info[model.CloudCompliance], error) {

	searchFilter := searchScansFilter(params)

	var (
		end   time.Time
		start time.Time
	)

	if params.Duration > 0 && len(params.Filters.ScanId) == 0 {
		end = time.Now()
		start = end.AddDate(0, 0, int(math.Copysign(float64(params.Duration), -1)))
		searchFilter.ScanFilter = rptSearch.SearchFilter{
			Filters: reporters.FieldsFilters{
				CompareFilters: utils.TimeRangeFilter("updated_at", start, end),
			},
		}
	}

	scans, err := rptSearch.SearchScansReport(ctx, searchFilter, sdkUtils.NEO4J_CLOUD_COMPLIANCE_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("cloud compliance scan info: %+v", scans)

	severityFilter := levelFilter("compliance_check_type", params.Filters.SeverityOrCheckType)

	nodeWiseData := NodeWiseData[model.CloudCompliance]{
		SeverityCount: make(map[string]map[string]int32),
		ScanData:      make(map[string]ScanData[model.CloudCompliance]),
	}

	for _, s := range scans {
		result, common, err := rptScans.GetScanResults[model.CloudCompliance](
			ctx, sdkUtils.NEO4J_CLOUD_COMPLIANCE_SCAN, s.ScanId, severityFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		sort.Slice(result[:], func(i, j int) bool {
			return result[i].ComplianceCheckType < result[j].ComplianceCheckType
		})
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.ScanData[s.NodeId] = ScanData[model.CloudCompliance]{
			ScanInfo:    common,
			ScanResults: result,
		}
	}

	data := Info[model.CloudCompliance]{
		ScanType:       CLOUD_COMPLIANCE,
		Title:          "Cloud Compliance Scan Report",
		StartTime:      start.Format(time.RFC822Z),
		EndTime:        end.Format(time.RFC822Z),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	return &data, nil
}

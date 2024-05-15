package reports

import (
	"context"
	"os"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/xuri/excelize/v2"
)

var (
	vulnerabilityHeader = map[string]string{
		"A1": "@timestamp",
		"B1": "cve_attack_vector",
		"C1": "cve_caused_by_package",
		"D1": "cve_container_image",
		"E1": "scan_id",
		"F1": "cve_container_image_id",
		"G1": "cve_cvss_score",
		"H1": "cve_description",
		"I1": "cve_fixed_in",
		"J1": "cve_id",
		"K1": "cve_link",
		"L1": "cve_severity",
		"M1": "cve_overall_score",
		"N1": "cve_type",
		"O1": "host_name",
		"P1": "cloud_account_id",
		"Q1": "masked",
	}
	secretHeader = map[string]string{
		"A1": "Filename",
		"B1": "Content",
		"C1": "Name",
		"D1": "Rule",
		"E1": "Severity",
		"F1": "Node Name",
		"G1": "Container Name",
		"H1": "Kubernetes Cluster Name",
		"I1": "Signature",
	}
	malwareHeader = map[string]string{
		"A1": "Rule Name",
		"B1": "Class",
		"C1": "File Name",
		"D1": "Summary",
		"E1": "Severity",
		"F1": "Node Name",
		"G1": "NodeType",
		"H1": "Container Name",
		"I1": "Kubernetes Cluster Name",
	}
	complianceHeader = map[string]string{
		"A1": "@timestamp",
		"B1": "compliance_check_type",
		"C1": "count",
		"D1": "doc_id",
		"E1": "host_name",
		"F1": "cloud_account_id",
		"G1": "masked",
		"H1": "node_id",
		"I1": "node_name",
		"J1": "resource",
		"K1": "node_type",
		"L1": "status",
		"M1": "test_category",
		"N1": "test_desc",
		"O1": "test_info",
		"P1": "test_number",
	}
)

func generateXLSX(ctx context.Context, params utils.ReportParams) (string, error) {

	ctx, span := telemetry.NewSpan(ctx, "reports", "generate-xlsx-report")
	defer span.End()

	var (
		xlsxFile string
		err      error
	)

	switch params.Filters.ScanType {
	case VULNERABILITY:
		xlsxFile, err = vulnerabilityXLSX(ctx, params)
	case SECRET:
		xlsxFile, err = secretXLSX(ctx, params)
	case MALWARE:
		xlsxFile, err = malwareXLSX(ctx, params)
	case COMPLIANCE:
		xlsxFile, err = complianceXLSX(ctx, params)
	case CLOUD_COMPLIANCE:
		xlsxFile, err = cloudComplianceXLSX(ctx, params)
	default:
		return "", ErrUnknownScanType
	}

	if err != nil {
		return "", err
	}

	return xlsxFile, nil
}

func xlsxSave(xlsx *excelize.File, params utils.ReportParams) (string, error) {
	// create a temp file to hold xlsx report
	temp, err := os.CreateTemp("", "report-*-"+reportFileName(params))
	if err != nil {
		return "", err
	}
	defer temp.Close()

	// save spreadsheet by the given path.
	if err := xlsx.SaveAs(temp.Name()); err != nil {
		log.Error().Err(err).Msg("failed to save xlsx file")
		return "", err
	}
	return temp.Name(), nil
}

func xlsxSetHeader(xlsx *excelize.File, sheet string, headers map[string]string) {
	for k, v := range headers {
		err := xlsx.SetCellValue(sheet, k, v)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func vulnerabilityXLSX(ctx context.Context, params utils.ReportParams) (string, error) {
	data, err := getVulnerabilityData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get vulnerabilities info")
		return "", err
	}

	xlsx := excelize.NewFile()
	defer func() {
		if err := xlsx.Close(); err != nil {
			log.Error().Err(err).Msg("failed to close file")
		}
	}()

	xlsxSetHeader(xlsx, "Sheet1", vulnerabilityHeader)

	offset := 0
	for _, nodeScanData := range data.NodeWiseData.ScanData {
		updatedAt := time.UnixMilli(nodeScanData.ScanInfo.UpdatedAt).String()
		for i, v := range nodeScanData.ScanResults {
			cellName, err := excelize.CoordinatesToCellName(1, offset+i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				updatedAt,
				v.CveAttackVector,
				v.CveCausedByPackage,
				nodeScanData.ScanInfo.NodeName,
				nodeScanData.ScanInfo.ScanID,
				nodeScanData.ScanInfo.NodeID,
				v.CveCVSSScore,
				v.CveDescription,
				v.CveFixedIn,
				v.CveID,
				v.CveLink,
				v.CveSeverity,
				v.CveOverallScore,
				v.CveType,
				nodeScanData.ScanInfo.HostName,
				nodeScanData.ScanInfo.CloudAccountID,
				v.Masked,
			}
			err = xlsx.SetSheetRow("Sheet1", cellName, &value)
			if err != nil {
				log.Error().Msg(err.Error())
			}
		}
		offset = offset + len(nodeScanData.ScanResults)
	}

	return xlsxSave(xlsx, params)
}

func secretXLSX(ctx context.Context, params utils.ReportParams) (string, error) {
	data, err := getSecretData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get secrets info")
		return "", err
	}

	xlsx := excelize.NewFile()
	defer func() {
		if err := xlsx.Close(); err != nil {
			log.Error().Err(err).Msg("failed to close file")
		}
	}()

	xlsxSetHeader(xlsx, "Sheet1", secretHeader)

	offset := 0
	for _, nodeScanData := range data.NodeWiseData.ScanData {
		for i, s := range nodeScanData.ScanResults {
			cellName, err := excelize.CoordinatesToCellName(1, offset+i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				s.FullFilename,
				s.MatchedContent,
				s.Name,
				s.RuleID,
				s.Level,
				nodeScanData.ScanInfo.NodeName,
				nodeScanData.ScanInfo.ContainerName,
				nodeScanData.ScanInfo.KubernetesClusterName,
				s.SignatureToMatch,
			}
			err = xlsx.SetSheetRow("Sheet1", cellName, &value)
			if err != nil {
				log.Error().Msg(err.Error())
			}
		}
		offset = offset + len(nodeScanData.ScanResults)
	}

	return xlsxSave(xlsx, params)
}

func malwareXLSX(ctx context.Context, params utils.ReportParams) (string, error) {
	data, err := getMalwareData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get malwares info")
		return "", err
	}

	xlsx := excelize.NewFile()
	defer func() {
		if err := xlsx.Close(); err != nil {
			log.Error().Err(err).Msg("failed to close file")
		}
	}()

	xlsxSetHeader(xlsx, "Sheet1", malwareHeader)

	offset := 0
	for _, nodeScanData := range data.NodeWiseData.ScanData {
		for i, m := range nodeScanData.ScanResults {
			cellName, err := excelize.CoordinatesToCellName(1, offset+i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				m.RuleName,
				m.Class,
				m.CompleteFilename,
				m.Summary,
				m.FileSeverity,
				nodeScanData.ScanInfo.NodeName,
				nodeScanData.ScanInfo.NodeType,
				nodeScanData.ScanInfo.ContainerName,
				nodeScanData.ScanInfo.KubernetesClusterName,
			}
			err = xlsx.SetSheetRow("Sheet1", cellName, &value)
			if err != nil {
				log.Error().Msg(err.Error())
			}
		}
		offset = offset + len(nodeScanData.ScanResults)
	}

	return xlsxSave(xlsx, params)
}

func complianceXLSX(ctx context.Context, params utils.ReportParams) (string, error) {
	data, err := getComplianceData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get compliance info")
		return "", err
	}

	xlsx := excelize.NewFile()
	defer func() {
		if err := xlsx.Close(); err != nil {
			log.Error().Err(err).Msg("failed to close file")
		}
	}()

	xlsxSetHeader(xlsx, "Sheet1", complianceHeader)

	offset := 0
	for _, nodeScanData := range data.NodeWiseData.ScanData {
		updatedAt := time.UnixMilli(nodeScanData.ScanInfo.UpdatedAt).String()
		for i, c := range nodeScanData.ScanResults {
			cellName, err := excelize.CoordinatesToCellName(1, offset+i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				updatedAt,
				c.ComplianceCheckType,
				"",
				"",
				nodeScanData.ScanInfo.HostName,
				nodeScanData.ScanInfo.CloudAccountID,
				c.Masked,
				c.ComplianceNodeID,
				nodeScanData.ScanInfo.NodeName,
				c.Resource,
				c.ComplianceNodeType,
				c.Status,
				c.TestCategory,
				c.TestDesc,
				c.TestInfo,
				c.TestNumber,
			}
			err = xlsx.SetSheetRow("Sheet1", cellName, &value)
			if err != nil {
				log.Error().Msg(err.Error())
			}
		}
		offset = offset + len(nodeScanData.ScanResults)
	}

	return xlsxSave(xlsx, params)
}

func cloudComplianceXLSX(ctx context.Context, params utils.ReportParams) (string, error) {
	data, err := getCloudComplianceData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get cloud compliance info")
		return "", err
	}

	xlsx := excelize.NewFile()
	defer func() {
		if err := xlsx.Close(); err != nil {
			log.Error().Err(err).Msg("failed to close file")
		}
	}()

	xlsxSetHeader(xlsx, "Sheet1", complianceHeader)

	for _, data := range data.NodeWiseData.ScanData {
		updatedAt := time.UnixMilli(data.ScanInfo.UpdatedAt).String()
		for i, c := range data.ScanResults {
			cellName, err := excelize.CoordinatesToCellName(1, i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				updatedAt,
				c.ComplianceCheckType,
				"",
				"",
				data.ScanInfo.HostName,
				data.ScanInfo.CloudAccountID,
				c.Masked,
				c.NodeID,
				data.ScanInfo.NodeName,
				c.Resource,
				c.ComplianceCheckType,
				c.Status,
				c.Type,
				c.Description,
				c.Title,
				c.ControlID,
			}
			err = xlsx.SetSheetRow("Sheet1", cellName, &value)
			if err != nil {
				log.Error().Msg(err.Error())
			}
		}
	}

	return xlsxSave(xlsx, params)
}

package reports

import (
	"context"
	"os"

	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
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
		"O1": "host",
		"P1": "host_name",
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
		"B1": "Severity",
		"C1": "Meta",
		"D1": "Meta Rules",
		"E1": "File Severity Score",
		"F1": "File Severity",
		"G1": "Summary",
		"H1": "Node Name",
		"I1": "Container Name",
		"J1": "Kubernetes Cluster Name",
		"K1": "NodeType",
	}
	complianceHeader = map[string]string{
		"A1": "@timestamp",
		"B1": "compliance_check_type",
		"C1": "count",
		"D1": "doc_id",
		"E1": "host",
		"F1": "host_name",
		"G1": "masked",
		"H1": "node_id",
		"I1": "node_name",
		"J1": "node_type",
		"K1": "status",
		"L1": "test_category",
		"M1": "test_desc",
		"N1": "test_info",
		"O1": "test_number",
	}
)

func generateXLSX(ctx context.Context, session neo4j.Session, params utils.ReportParams) (string, error) {

	var (
		xlsxFile string
		err      error
	)

	switch params.Filters.ScanType {
	case "vulnerability":
		xlsxFile, err = vulnerabilityXLSX(ctx, session, params)
	case "secret":
		xlsxFile, err = secretXLSX(ctx, session, params)
	case "malware":
		xlsxFile, err = malwareXLSX(ctx, session, params)
	case "compliance":
		xlsxFile, err = complianceXLSX(ctx, session, params)
	case "cloud_compliance":
		xlsxFile, err = cloudComplianceXLSX(ctx, session, params)
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
	for k, v := range vulnerabilityHeader {
		xlsx.SetCellValue(sheet, k, v)
	}
}

func vulnerabilityXLSX(ctx context.Context, session neo4j.Session, params utils.ReportParams) (string, error) {
	data, err := getVulnerabilityData(ctx, session, params)
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

	for node, vulnerabilities := range data.NodeWiseData.VulnerabilityData {
		for i, v := range vulnerabilities {
			cellName, err := excelize.CoordinatesToCellName(1, i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				timeNow(),
				v.Cve_attack_vector,
				v.Cve_caused_by_package,
				"",
				"",
				"",
				v.Cve_cvss_score,
				v.Cve_description,
				v.Cve_fixed_in,
				v.Cve_id,
				v.Cve_link,
				v.Cve_severity,
				v.Cve_overall_score,
				v.Cve_type,
				node,
				"",
				v.Masked,
			}
			xlsx.SetSheetRow("Sheet1", cellName, &value)
		}
	}

	return xlsxSave(xlsx, params)
}

func secretXLSX(ctx context.Context, session neo4j.Session, params utils.ReportParams) (string, error) {
	data, err := getSecretData(ctx, session, params)
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

	for node, secrets := range data.NodeWiseData.SecretData {
		for i, s := range secrets {
			cellName, err := excelize.CoordinatesToCellName(1, i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				s.FullFilename,
				s.MatchedContent,
				s.Name,
				s.RuleID,
				s.Level,
				node,
				"",
				"",
				s.SignatureToMatch,
			}
			xlsx.SetSheetRow("Sheet1", cellName, &value)
		}
	}

	return xlsxSave(xlsx, params)
}

func malwareXLSX(ctx context.Context, session neo4j.Session, params utils.ReportParams) (string, error) {
	data, err := getMalwareData(ctx, session, params)
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

	for node, malwares := range data.NodeWiseData.MalwareData {
		for i, m := range malwares {
			cellName, err := excelize.CoordinatesToCellName(1, i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				m.RuleName,
				m.SeverityScore,
				"",
				m.RuleID,
				m.FileSevScore,
				m.FileSeverity,
				m.Summary,
				node,
				"",
				"",
				"",
			}
			xlsx.SetSheetRow("Sheet1", cellName, &value)
		}
	}

	return xlsxSave(xlsx, params)
}

func complianceXLSX(ctx context.Context, session neo4j.Session, params utils.ReportParams) (string, error) {
	data, err := getComplianceData(ctx, session, params)
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

	for node, compliances := range data.NodeWiseData.ComplianceData {
		for i, c := range compliances {
			cellName, err := excelize.CoordinatesToCellName(1, i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				timeNow(),
				c.ComplianceCheckType,
				"",
				"",
				node,
				"",
				c.Masked,
				c.ComplianceNodeId,
				"",
				c.ComplianceNodeType,
				c.Status,
				c.TestCategory,
				c.TestDesc,
				c.TestInfo,
				c.TestNumber,
			}
			xlsx.SetSheetRow("Sheet1", cellName, &value)
		}
	}

	return xlsxSave(xlsx, params)
}

func cloudComplianceXLSX(ctx context.Context, session neo4j.Session, params utils.ReportParams) (string, error) {
	data, err := getCloudComplianceData(ctx, session, params)
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

	for node, compliances := range data.NodeWiseData.CloudComplianceData {
		for i, c := range compliances {
			cellName, err := excelize.CoordinatesToCellName(1, i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				timeNow(),
				c.ComplianceCheckType,
				"",
				"",
				node,
				"",
				c.Masked,
				c.NodeID,
				"",
				c.ComplianceCheckType,
				c.Status,
				c.Type,
				c.Description,
				c.Title,
				c.ControlID,
			}
			xlsx.SetSheetRow("Sheet1", cellName, &value)
		}
	}

	return xlsxSave(xlsx, params)
}

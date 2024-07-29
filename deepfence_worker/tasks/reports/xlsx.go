package reports

import (
	"context"
	"os"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/xuri/excelize/v2"
)

var (
	vulnerabilityHeader = map[string]string{
		"A1": "CVE ID",
		"B1": "Severity",
		"C1": "Attack Vector",
		"D1": "Caused By Package",
		"E1": "Caused By Package Path",
		"F1": "CVSS Score",
		"G1": "Description",
		"H1": "Fixed In",
		"I1": "Link",
		"J1": "Overall Score",
		"K1": "Type",
		"L1": "Node Name",
		"M1": "Node Type",
		"N1": "Kubernetes Cluster Name",
		"O1": "Masked",
	}
	secretHeader = map[string]string{
		"A1": "Filename",
		"B1": "Content",
		"C1": "Rule",
		"D1": "Severity",
		"E1": "Content Starting Index",
		"F1": "Node Name",
		"G1": "Node Type",
		"H1": "Kubernetes Cluster Name",
		"I1": "Masked",
	}
	malwareHeader = map[string]string{
		"A1": "Rule Name",
		"B1": "File Name",
		"C1": "Summary",
		"D1": "Severity",
		"E1": "Node Name",
		"F1": "Node Type",
		"G1": "Kubernetes Cluster Name",
		"H1": "Masked",
	}
	complianceHeader = map[string]string{
		"A1": "Compliance Standard",
		"B1": "Status",
		"C1": "Category",
		"D1": "Description",
		"E1": "Info",
		"F1": "Control ID",
		"G1": "Node Name",
		"H1": "Node Type",
		"I1": "Masked",
	}
	cloudComplianceHeader = map[string]string{
		"A1": "Compliance Standard",
		"B1": "Status",
		"C1": "Title",
		"D1": "Description",
		"E1": "Control ID",
		"F1": "Account",
		"G1": "Cloud Provider",
		"H1": "Masked",
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
		for i, v := range nodeScanData.ScanResults {
			cellName, err := excelize.CoordinatesToCellName(1, offset+i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				v.CveID,
				v.CveSeverity,
				v.CveAttackVector,
				v.CveCausedByPackage,
				v.CveCausedByPackagePath,
				v.CveCVSSScore,
				v.CveDescription,
				v.CveFixedIn,
				v.CveLink,
				v.CveOverallScore,
				v.CveType,
				nodeScanData.ScanInfo.NodeName,
				nodeScanData.ScanInfo.NodeType,
				nodeScanData.ScanInfo.KubernetesClusterName,
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
				s.Level,
				s.StartingIndex,
				nodeScanData.ScanInfo.NodeName,
				nodeScanData.ScanInfo.NodeType,
				nodeScanData.ScanInfo.KubernetesClusterName,
				s.Masked,
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
				m.CompleteFilename,
				m.Summary,
				m.FileSeverity,
				nodeScanData.ScanInfo.NodeName,
				nodeScanData.ScanInfo.NodeType,
				nodeScanData.ScanInfo.KubernetesClusterName,
				m.Masked,
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
		for i, c := range nodeScanData.ScanResults {
			cellName, err := excelize.CoordinatesToCellName(1, offset+i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				c.ComplianceCheckType,
				c.Status,
				c.TestCategory,
				c.TestDesc,
				c.TestInfo,
				c.TestNumber,
				nodeScanData.ScanInfo.NodeName,
				nodeScanData.ScanInfo.NodeType,
				c.Masked,
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

	xlsxSetHeader(xlsx, "Sheet1", cloudComplianceHeader)

	for _, nodeScanData := range data.NodeWiseData.ScanData {
		for i, c := range nodeScanData.ScanResults {
			cellName, err := excelize.CoordinatesToCellName(1, i+2)
			if err != nil {
				log.Error().Err(err).Msg("error generating cell name")
			}
			value := []interface{}{
				c.ComplianceCheckType,
				c.Status,
				c.Title,
				c.Description,
				c.ControlID,
				nodeScanData.ScanInfo.NodeName,
				nodeScanData.ScanInfo.NodeType,
				c.Masked,
			}
			err = xlsx.SetSheetRow("Sheet1", cellName, &value)
			if err != nil {
				log.Error().Msg(err.Error())
			}
		}
	}

	return xlsxSave(xlsx, params)
}

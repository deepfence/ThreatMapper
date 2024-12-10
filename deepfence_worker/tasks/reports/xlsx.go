package reports

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	sdkUtils "github.com/deepfence/ThreatMapper/deepfence_utils/utils"
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
		"I1": "Remediation",
		"J1": "Masked",
	}
	cloudComplianceHeader = map[string]string{
		"A1": "Benchmark",
		"B1": "Status",
		"C1": "Title",
		"D1": "Description",
		"E1": "Control ID",
		"F1": "Account",
		"G1": "Cloud Provider",
		"H1": "Resource",
		"I1": "Region",
		"J1": "Reason",
		"K1": "Service",
		"L1": "Masked",
	}
)

func generateXLSX(ctx context.Context, params sdkUtils.ReportParams) (string, error) {

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

func xlsxSave(xlsx *excelize.File, dir, fileName string) (string, error) {

	// cleanup xlsx
	defer func() {
		if err := xlsx.Close(); err != nil {
			log.Error().Err(err).Msg("failed to close file")
		}
	}()

	// make sure directory exists
	os.MkdirAll(dir, os.ModePerm)

	out := filepath.Join(dir, fileName)

	log.Debug().Msgf("write xlsx report to path %s", out)

	// save spreadsheet to the given path.
	if err := xlsx.SaveAs(out); err != nil {
		log.Error().Err(err).Msg("failed to save xlsx file")
		return "", err
	}

	return out, nil
}

func xlsxSetHeader(xlsx *excelize.File, sheet string, headers map[string]string) {
	for k, v := range headers {
		err := xlsx.SetCellValue(sheet, k, v)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func vulnerabilityXLSX(ctx context.Context, params sdkUtils.ReportParams) (string, error) {
	data, err := getVulnerabilityData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get vulnerabilities info")
		return "", err
	}

	// single file
	if !params.ZippedReport {
		xlsx := excelize.NewFile()
		xlsxSetHeader(xlsx, "Sheet1", vulnerabilityHeader)
		// add results
		offset := 0
		for _, nodeScanData := range data.NodeWiseData.ScanData {
			xlsxAddVulnResults(xlsx, "Sheet1", offset, nodeScanData)
			offset = offset + len(nodeScanData.ScanResults)
		}

		return xlsxSave(xlsx, os.TempDir(), tempReportFile(params))
	}

	// zipped report
	// tmp dir to save generated reports
	tmpDir := filepath.Join(
		os.TempDir(),
		fmt.Sprintf("%d", time.Now().UnixMilli())+"-"+params.ReportID,
	)
	defer os.RemoveAll(tmpDir)

	for i, d := range data.NodeWiseData.ScanData {
		xlsx := excelize.NewFile()
		xlsxSetHeader(xlsx, "Sheet1", vulnerabilityHeader)
		xlsxAddVulnResults(xlsx, "Sheet1", 0, d)

		outputFile := sdkUtils.NodeNameReplacer.Replace(i) +
			fileExt(sdkUtils.ReportType(params.ReportType))

		xlsxSave(xlsx, tmpDir, outputFile)
	}

	outputZip := reportFileName(params)

	if err := sdkUtils.ZipDir(tmpDir, "reports", outputZip); err != nil {
		return "", err
	}

	return outputZip, nil

}

func xlsxAddVulnResults(xlsx *excelize.File, sheet string, offset int, data ScanData[model.Vulnerability]) {
	for i, v := range data.ScanResults {
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
			data.ScanInfo.NodeName,
			data.ScanInfo.NodeType,
			data.ScanInfo.KubernetesClusterName,
			v.Masked,
		}
		err = xlsx.SetSheetRow(sheet, cellName, &value)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func secretXLSX(ctx context.Context, params sdkUtils.ReportParams) (string, error) {
	data, err := getSecretData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get secrets info")
		return "", err
	}

	// single file
	if !params.ZippedReport {
		xlsx := excelize.NewFile()
		xlsxSetHeader(xlsx, "Sheet1", secretHeader)
		// add results
		offset := 0
		for _, nodeScanData := range data.NodeWiseData.ScanData {
			xlsxAddSecretResults(xlsx, "Sheet1", offset, nodeScanData)
			offset = offset + len(nodeScanData.ScanResults)
		}

		return xlsxSave(xlsx, os.TempDir(), tempReportFile(params))
	}

	// zipped report
	// tmp dir to save generated reports
	tmpDir := filepath.Join(
		os.TempDir(),
		fmt.Sprintf("%d", time.Now().UnixMilli())+"-"+params.ReportID,
	)
	defer os.RemoveAll(tmpDir)

	for i, d := range data.NodeWiseData.ScanData {
		xlsx := excelize.NewFile()
		xlsxSetHeader(xlsx, "Sheet1", secretHeader)
		xlsxAddSecretResults(xlsx, "Sheet1", 0, d)

		outputFile := sdkUtils.NodeNameReplacer.Replace(i) +
			fileExt(sdkUtils.ReportType(params.ReportType))

		xlsxSave(xlsx, tmpDir, outputFile)
	}

	outputZip := reportFileName(params)

	if err := sdkUtils.ZipDir(tmpDir, "reports", outputZip); err != nil {
		return "", err
	}

	return outputZip, nil

}

func xlsxAddSecretResults(xlsx *excelize.File, sheet string, offset int, data ScanData[model.Secret]) {
	for i, s := range data.ScanResults {
		cellName, err := excelize.CoordinatesToCellName(1, offset+i+2)
		if err != nil {
			log.Error().Err(err).Msg("error generating cell name")
		}
		value := []interface{}{
			s.FullFilename,
			s.MatchedContent,
			s.RuleID,
			s.Level,
			s.StartingIndex,
			data.ScanInfo.NodeName,
			data.ScanInfo.NodeType,
			data.ScanInfo.KubernetesClusterName,
			s.Masked,
		}
		err = xlsx.SetSheetRow(sheet, cellName, &value)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func malwareXLSX(ctx context.Context, params sdkUtils.ReportParams) (string, error) {
	data, err := getMalwareData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get malwares info")
		return "", err
	}

	// single file
	if !params.ZippedReport {
		xlsx := excelize.NewFile()
		xlsxSetHeader(xlsx, "Sheet1", malwareHeader)
		// add results
		offset := 0
		for _, nodeScanData := range data.NodeWiseData.ScanData {
			xlsxAddMalwareResults(xlsx, "Sheet1", offset, nodeScanData)
			offset = offset + len(nodeScanData.ScanResults)
		}

		return xlsxSave(xlsx, os.TempDir(), tempReportFile(params))
	}

	// zipped report
	// tmp dir to save generated reports
	tmpDir := filepath.Join(
		os.TempDir(),
		fmt.Sprintf("%d", time.Now().UnixMilli())+"-"+params.ReportID,
	)
	defer os.RemoveAll(tmpDir)

	for i, d := range data.NodeWiseData.ScanData {
		xlsx := excelize.NewFile()
		xlsxSetHeader(xlsx, "Sheet1", malwareHeader)
		xlsxAddMalwareResults(xlsx, "Sheet1", 0, d)

		outputFile := sdkUtils.NodeNameReplacer.Replace(i) +
			fileExt(sdkUtils.ReportType(params.ReportType))

		xlsxSave(xlsx, tmpDir, outputFile)
	}

	outputZip := reportFileName(params)

	if err := sdkUtils.ZipDir(tmpDir, "reports", outputZip); err != nil {
		return "", err
	}

	return outputZip, nil
}

func xlsxAddMalwareResults(xlsx *excelize.File, sheet string, offset int, data ScanData[model.Malware]) {
	for i, m := range data.ScanResults {
		cellName, err := excelize.CoordinatesToCellName(1, offset+i+2)
		if err != nil {
			log.Error().Err(err).Msg("error generating cell name")
		}
		value := []interface{}{
			m.RuleName,
			m.CompleteFilename,
			m.Summary,
			m.FileSeverity,
			data.ScanInfo.NodeName,
			data.ScanInfo.NodeType,
			data.ScanInfo.KubernetesClusterName,
			m.Masked,
		}
		err = xlsx.SetSheetRow(sheet, cellName, &value)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func complianceXLSX(ctx context.Context, params sdkUtils.ReportParams) (string, error) {
	data, err := getComplianceData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get compliance info")
		return "", err
	}

	// single file
	if !params.ZippedReport {
		xlsx := excelize.NewFile()
		xlsxSetHeader(xlsx, "Sheet1", complianceHeader)
		// add results
		offset := 0
		for _, nodeScanData := range data.NodeWiseData.ScanData {
			xlsxAddCompResults(xlsx, "Sheet1", offset, nodeScanData)
			offset = offset + len(nodeScanData.ScanResults)
		}

		return xlsxSave(xlsx, os.TempDir(), tempReportFile(params))
	}

	// zipped report
	// tmp dir to save generated reports
	tmpDir := filepath.Join(
		os.TempDir(),
		fmt.Sprintf("%d", time.Now().UnixMilli())+"-"+params.ReportID,
	)
	defer os.RemoveAll(tmpDir)

	for i, d := range data.NodeWiseData.ScanData {
		xlsx := excelize.NewFile()
		xlsxSetHeader(xlsx, "Sheet1", complianceHeader)
		xlsxAddCompResults(xlsx, "Sheet1", 0, d)

		outputFile := sdkUtils.NodeNameReplacer.Replace(i) +
			fileExt(sdkUtils.ReportType(params.ReportType))

		xlsxSave(xlsx, tmpDir, outputFile)
	}

	outputZip := reportFileName(params)

	if err := sdkUtils.ZipDir(tmpDir, "reports", outputZip); err != nil {
		return "", err
	}

	return outputZip, nil
}

func xlsxAddCompResults(xlsx *excelize.File, sheet string, offset int, data ScanData[model.Compliance]) {
	for i, c := range data.ScanResults {
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
			data.ScanInfo.NodeName,
			data.ScanInfo.NodeType,
			c.RemediationScript,
			c.Masked,
		}
		err = xlsx.SetSheetRow(sheet, cellName, &value)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

func cloudComplianceXLSX(ctx context.Context, params sdkUtils.ReportParams) (string, error) {
	data, err := getCloudComplianceData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get cloud compliance info")
		return "", err
	}

	// single file
	if !params.ZippedReport {
		xlsx := excelize.NewFile()
		xlsxSetHeader(xlsx, "Sheet1", cloudComplianceHeader)
		// add results
		for _, nodeScanData := range data.NodeWiseData.ScanData {
			xlsxAddCloudCompResults(xlsx, "Sheet1", nodeScanData)
		}

		return xlsxSave(xlsx, os.TempDir(), tempReportFile(params))
	}

	// zipped report
	// tmp dir to save generated reports
	tmpDir := filepath.Join(
		os.TempDir(),
		fmt.Sprintf("%d", time.Now().UnixMilli())+"-"+params.ReportID,
	)
	defer os.RemoveAll(tmpDir)

	for i, d := range data.NodeWiseData.ScanData {
		xlsx := excelize.NewFile()
		xlsxSetHeader(xlsx, "Sheet1", cloudComplianceHeader)
		xlsxAddCloudCompResults(xlsx, "Sheet1", d)

		outputFile := sdkUtils.NodeNameReplacer.Replace(i) +
			fileExt(sdkUtils.ReportType(params.ReportType))

		xlsxSave(xlsx, tmpDir, outputFile)
	}

	outputZip := reportFileName(params)

	if err := sdkUtils.ZipDir(tmpDir, "reports", outputZip); err != nil {
		return "", err
	}

	return outputZip, nil
}

func xlsxAddCloudCompResults(xlsx *excelize.File, sheet string, data ScanData[model.CloudCompliance]) {
	for i, c := range data.ScanResults {
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
			data.ScanInfo.NodeName,
			data.ScanInfo.NodeType,
			c.Resource,
			c.Region,
			c.Reason,
			c.Service,
			c.Masked,
		}
		err = xlsx.SetSheetRow(sheet, cellName, &value)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
}

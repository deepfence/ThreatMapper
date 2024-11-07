package reports

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	sdkUtils "github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/johnfercher/maroto/v2/pkg/components/page"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/border"
	"github.com/johnfercher/maroto/v2/pkg/consts/breakline"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

var (
	cloudCompResultCellStyle = &props.Cell{
		BackgroundColor: &props.Color{Red: 255, Green: 255, Blue: 255},
		BorderType:      border.Full,
		BorderColor:     &props.Color{Red: 0, Green: 0, Blue: 0},
		BorderThickness: 0.1,
	}

	cloudCompResultHeaderProps = props.Text{
		Size:  10,
		Left:  1,
		Top:   1,
		Align: align.Center,
		Style: fontstyle.Bold,
		Color: &props.Color{Red: 0, Green: 0, Blue: 200},
	}

	cloudCompSummaryCellStyle = &props.Cell{
		BackgroundColor: &props.Color{Red: 255, Green: 255, Blue: 255},
		BorderType:      border.Full,
		BorderColor:     &props.Color{Red: 0, Green: 0, Blue: 0},
		BorderThickness: 0.1,
	}

	cloudCompSummaryTableHeaderProps = props.Text{
		Size:  10,
		Top:   1,
		Align: align.Center,
		Style: fontstyle.Bold,
		Color: &props.Color{Red: 0, Green: 0, Blue: 200},
	}

	cloudCompSummaryRowsProps = props.Text{
		Size:  10,
		Top:   1,
		Align: align.Center,
		Style: fontstyle.Normal,
	}
)

func getCloudComplianceSummaryPage(data map[string]map[string]int32) core.Page {

	summaryPage := page.New()
	summaryPage.Add(text.NewRow(12, "Scans Summary",
		props.Text{Size: 10, Align: align.Center, Style: fontstyle.Bold}))

	summaryPage.Add(
		row.New(6).Add(
			text.NewCol(7, "Node Name", cloudCompSummaryTableHeaderProps).WithStyle(cloudCompSummaryCellStyle),
			text.NewCol(1, "Alarm", cloudCompSummaryTableHeaderProps).WithStyle(cloudCompSummaryCellStyle),
			text.NewCol(1, "Ok", cloudCompSummaryTableHeaderProps).WithStyle(cloudCompSummaryCellStyle),
			text.NewCol(1, "Skip", cloudCompSummaryTableHeaderProps).WithStyle(cloudCompSummaryCellStyle),
			text.NewCol(1, "Info", cloudCompSummaryTableHeaderProps).WithStyle(cloudCompSummaryCellStyle),
			text.NewCol(1, "Total", cloudCompSummaryTableHeaderProps).WithStyle(cloudCompSummaryCellStyle),
		),
	)

	summaryRows := []core.Row{}
	for k, v := range data {
		summaryRows = append(
			summaryRows,
			row.New(6).Add(
				text.NewCol(7, k, cloudCompSummaryRowsProps).WithStyle(cloudCompSummaryCellStyle),
				text.NewCol(1, strconv.Itoa(int(v["alarm"])), cloudCompSummaryRowsProps).WithStyle(cloudCompSummaryCellStyle),
				text.NewCol(1, strconv.Itoa(int(v["ok"])), cloudCompSummaryRowsProps).WithStyle(cloudCompSummaryCellStyle),
				text.NewCol(1, strconv.Itoa(int(v["skip"])), cloudCompSummaryRowsProps).WithStyle(cloudCompSummaryCellStyle),
				text.NewCol(1, strconv.Itoa(int(v["info"])), cloudCompSummaryRowsProps).WithStyle(cloudCompSummaryCellStyle),
				text.NewCol(1, strconv.Itoa(int(v["alarm"]+v["ok"]+v["skip"]+v["info"])), cloudCompSummaryRowsProps).WithStyle(cloudCompSummaryCellStyle),
			),
		)
	}

	summaryPage.Add(summaryRows...)

	return summaryPage
}

func cloudcompliancePDF(ctx context.Context, params sdkUtils.ReportParams) (string, error) {

	log := log.WithCtx(ctx)

	data, err := getCloudComplianceData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get compliance info")
		return "", err
	}

	log.Info().Msgf("report id %s has %d records",
		params.ReportID, data.NodeWiseData.RecordCount)

	if !params.ZippedReport {
		return createCloudCompSingleFile(data, params)
	}
	return createCloudCompZippedFile(data, params)
}

func createCloudCompSingleFile(data *Info[model.CloudCompliance], params sdkUtils.ReportParams) (string, error) {
	// get new instance of marato
	m := getMarato()

	// applied filter page
	filtersPage := getFiltersPage(
		data.Title,
		data.ScanType,
		data.AppliedFilters.NodeType,
		fmt.Sprintf("%s - %s", data.StartTime, data.EndTime),
		strings.Join(data.AppliedFilters.SeverityOrCheckType, ","),
		data.AppliedFilters.AdvancedReportFilters.String(),
	)

	// summary table
	summaryPage := getCloudComplianceSummaryPage(data.NodeWiseData.SeverityCount)

	// page per scan
	resultPages := []core.Page{}
	for i, d := range data.NodeWiseData.ScanData {

		// skip if there are no results
		if len(d.ScanResults) == 0 {
			continue
		}

		p := page.New()
		addCloudCompResultHeaders(p, i)
		p.Add(getCloudCompResultRows(d)...)
		resultPages = append(resultPages, p)
	}

	// add all pages
	m.AddPages(filtersPage)
	m.AddPages(summaryPage)
	m.AddPages(resultPages...)

	doc, err := m.Generate()
	if err != nil {
		return "", err
	}

	log.Info().Msgf("report id %s pdf generation metrics %s",
		params.ReportID, doc.GetReport())

	return writeReportToFile(os.TempDir(), tempReportFile(params), doc.GetBytes())
}

func createCloudCompZippedFile(data *Info[model.CloudCompliance], params sdkUtils.ReportParams) (string, error) {

	// tmp dir to save generated reports
	tmpDir := filepath.Join(
		os.TempDir(),
		fmt.Sprintf("%d", time.Now().UnixMilli())+"-"+params.ReportID,
	)
	defer os.RemoveAll(tmpDir)

	for i, d := range data.NodeWiseData.ScanData {
		// get new instance of marato
		m := getMarato()

		// applied filter page
		filtersPage := getFiltersPage(
			data.Title,
			data.ScanType,
			data.AppliedFilters.NodeType,
			fmt.Sprintf("%s - %s", data.StartTime, data.EndTime),
			strings.Join(data.AppliedFilters.SeverityOrCheckType, ","),
			data.AppliedFilters.AdvancedReportFilters.String(),
		)

		// summary tableparams sdkUtils.ReportParams
		singleSummary := map[string]map[string]int32{
			i: data.NodeWiseData.SeverityCount[i],
		}
		summaryPage := getCloudComplianceSummaryPage(singleSummary)

		// skip if there are no results
		if len(d.ScanResults) == 0 {
			continue
		}

		resultPage := page.New()
		addCloudCompResultHeaders(resultPage, i)
		resultPage.Add(getCloudCompResultRows(d)...)

		// add all pages
		m.AddPages(filtersPage)
		m.AddPages(summaryPage)
		m.AddPages(resultPage)

		doc, err := m.Generate()
		if err != nil {
			return "", err
		}

		outputFile := sdkUtils.NodeNameReplacer.Replace(i) +
			fileExt(sdkUtils.ReportType(params.ReportType))

		log.Info().Msgf("report id %s %s pdf generation metrics %s",
			params.ReportID, outputFile, doc.GetReport())

		if _, err := writeReportToFile(tmpDir, outputFile, doc.GetBytes()); err != nil {
			log.Error().Err(err).Msg("failed to write report to file")
		}
	}

	outputZip := reportFileName(params)

	if err := sdkUtils.ZipDir(tmpDir, "reports", outputZip); err != nil {
		return "", err
	}

	return outputZip, nil
}

func addCloudCompResultHeaders(p core.Page, nodeName string) {
	p.Add(text.NewRow(10, fmt.Sprintf("%s - Scan Details", nodeName), cloudCompResultHeaderProps))
	p.Add(row.New(10).Add(
		text.NewCol(1, "No.", cloudCompResultHeaderProps).WithStyle(cloudCompResultCellStyle),
		text.NewCol(5, "Resource", cloudCompResultHeaderProps).WithStyle(cloudCompResultCellStyle),
		text.NewCol(1, "Check Type", cloudCompResultHeaderProps).WithStyle(cloudCompResultCellStyle),
		text.NewCol(4, "Title", cloudCompResultHeaderProps).WithStyle(cloudCompResultCellStyle),
		text.NewCol(1, "Status", cloudCompResultHeaderProps).WithStyle(cloudCompResultCellStyle),
	))
}

func getCloudCompResultRows(d ScanData[model.CloudCompliance]) []core.Row {
	resultRows := []core.Row{}
	for k, v := range d.ScanResults {
		resultRows = append(
			resultRows,
			row.New(18).Add(
				text.NewCol(1, strconv.Itoa(k+1),
					props.Text{Size: 10, Top: 1, Align: align.Center}).
					WithStyle(cloudCompResultCellStyle),
				text.NewCol(5, v.Resource,
					props.Text{Size: 10, Left: 1, Top: 1, BreakLineStrategy: breakline.DashStrategy}).
					WithStyle(cloudCompResultCellStyle),
				text.NewCol(1, v.ComplianceCheckType,
					props.Text{Size: 10, Top: 1, Align: align.Center}).
					WithStyle(cloudCompResultCellStyle),
				text.NewCol(4, v.Title,
					props.Text{Size: 10, Left: 1, Top: 1, BreakLineStrategy: breakline.DashStrategy}).
					WithStyle(cloudCompResultCellStyle),
				text.NewCol(1, v.Status,
					props.Text{Size: 10, Top: 1, Align: align.Center, Style: fontstyle.Bold, Color: colors[v.Status]}).WithStyle(cloudCompResultCellStyle),
			),
		)
	}
	return resultRows
}

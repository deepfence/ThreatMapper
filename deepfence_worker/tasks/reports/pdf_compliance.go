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
	compResultCellStyle = &props.Cell{
		BackgroundColor: &props.Color{Red: 255, Green: 255, Blue: 255},
		BorderType:      border.Full,
		BorderColor:     &props.Color{Red: 0, Green: 0, Blue: 0},
		BorderThickness: 0.1,
	}

	compResultHeaderProps = props.Text{
		Size:  10,
		Left:  1,
		Top:   1,
		Align: align.Center,
		Style: fontstyle.Bold,
		Color: &props.Color{Red: 0, Green: 0, Blue: 200},
	}

	compSummaryCellStyle = &props.Cell{
		BackgroundColor: &props.Color{Red: 255, Green: 255, Blue: 255},
		BorderType:      border.Full,
		BorderColor:     &props.Color{Red: 0, Green: 0, Blue: 0},
		BorderThickness: 0.1,
	}

	compSummaryTableHeaderProps = props.Text{
		Size:  10,
		Top:   1,
		Align: align.Center,
		Style: fontstyle.Bold,
		Color: &props.Color{Red: 0, Green: 0, Blue: 200},
	}

	compSummaryProps = props.Text{
		Size:  10,
		Top:   1,
		Align: align.Center,
		Style: fontstyle.Normal,
	}
)

func getComplianceSummaryPage(data map[string]map[string]int32) core.Page {

	summaryPage := page.New()
	summaryPage.Add(text.NewRow(12, "Scans Summary",
		props.Text{Size: 10, Align: align.Center, Style: fontstyle.Bold}))

	summaryPage.Add(
		row.New(6).Add(
			text.NewCol(6, "Node Name", compSummaryTableHeaderProps).WithStyle(compSummaryCellStyle),
			text.NewCol(1, "Pass", compSummaryTableHeaderProps).WithStyle(compSummaryCellStyle),
			text.NewCol(1, "Fail", compSummaryTableHeaderProps).WithStyle(compSummaryCellStyle),
			text.NewCol(1, "Info", compSummaryTableHeaderProps).WithStyle(compSummaryCellStyle),
			text.NewCol(1, "Warn", compSummaryTableHeaderProps).WithStyle(compSummaryCellStyle),
			text.NewCol(1, "Note", compSummaryTableHeaderProps).WithStyle(compSummaryCellStyle),
			text.NewCol(1, "Total", compSummaryTableHeaderProps).WithStyle(compSummaryCellStyle),
		),
	)

	summaryRows := []core.Row{}
	for k, v := range data {
		summaryRows = append(
			summaryRows,
			row.New(6).Add(
				text.NewCol(6, k, compSummaryProps).WithStyle(compSummaryCellStyle),
				text.NewCol(1, strconv.Itoa(int(v["pass"])), compSummaryProps).WithStyle(compSummaryCellStyle),
				text.NewCol(1, strconv.Itoa(int(v["fail"])), compSummaryProps).WithStyle(compSummaryCellStyle),
				text.NewCol(1, strconv.Itoa(int(v["info"])), compSummaryProps).WithStyle(compSummaryCellStyle),
				text.NewCol(1, strconv.Itoa(int(v["warn"])), compSummaryProps).WithStyle(compSummaryCellStyle),
				text.NewCol(1, strconv.Itoa(int(v["note"])), compSummaryProps).WithStyle(compSummaryCellStyle),
				text.NewCol(1, strconv.Itoa(int(v["pass"]+v["fail"]+v["info"]+v["warn"]+v["note"])), compSummaryProps).WithStyle(compSummaryCellStyle),
			),
		)
	}

	summaryPage.Add(summaryRows...)

	return summaryPage
}

func compliancePDF(ctx context.Context, params sdkUtils.ReportParams) (string, error) {

	log := log.WithCtx(ctx)

	data, err := getComplianceData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get compliance info")
		return "", err
	}

	log.Info().Msgf("report id %s has %d records",
		params.ReportID, data.NodeWiseData.RecordCount)

	if !params.ZippedReport {
		return createCompSingleReport(data, params)
	}
	return createCompZippedReport(data, params)
}

func createCompSingleReport(data *Info[model.Compliance], params sdkUtils.ReportParams) (string, error) {
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
	var summaryPage core.Page
	if data.AppliedFilters.NodeType != "cluster" {
		summaryPage = getComplianceSummaryPage(data.NodeWiseData.SeverityCount)
	} else {
		summaryPage = getCloudComplianceSummaryPage(data.NodeWiseData.SeverityCount)
	}

	// page per scan
	resultPages := []core.Page{}
	for i, d := range data.NodeWiseData.ScanData {

		// skip if there are no results
		if len(d.ScanResults) == 0 {
			continue
		}

		// add result pages
		p := page.New()
		addCompResultHeaders(p, i, data.AppliedFilters.NodeType)
		p.Add(getCompResultRows(d, data.AppliedFilters.NodeType)...)
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

func createCompZippedReport(data *Info[model.Compliance], params sdkUtils.ReportParams) (string, error) {
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
		var summaryPage core.Page
		if data.AppliedFilters.NodeType != "cluster" {
			summaryPage = getComplianceSummaryPage(singleSummary)
		} else {
			summaryPage = getCloudComplianceSummaryPage(singleSummary)
		}

		// skip if there are no results
		if len(d.ScanResults) == 0 {
			continue
		}

		// add result pages
		resultPage := page.New()
		addCompResultHeaders(resultPage, i, data.AppliedFilters.NodeType)
		resultPage.Add(getCompResultRows(d, data.AppliedFilters.NodeType)...)

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

func addCompResultHeaders(p core.Page, nodeName string, nodeType string) {
	p.Add(text.NewRow(10, fmt.Sprintf("%s - Scan Details", nodeName), compResultHeaderProps))
	if nodeType != "cluster" {
		p.Add(row.New(10).Add(
			text.NewCol(1, "No.", compResultHeaderProps).WithStyle(compResultCellStyle),
			text.NewCol(1, "Status", compResultHeaderProps).WithStyle(compResultCellStyle),
			text.NewCol(2, "Category", compResultHeaderProps).WithStyle(compResultCellStyle),
			text.NewCol(2, "Test Number", compResultHeaderProps).WithStyle(compResultCellStyle),
			text.NewCol(5, "Description", compResultHeaderProps).WithStyle(compResultCellStyle),
			text.NewCol(1, "Check Type", compResultHeaderProps).WithStyle(compResultCellStyle),
		))
	} else {
		p.Add(row.New(10).Add(
			text.NewCol(1, "No.", compResultHeaderProps).WithStyle(compResultCellStyle),
			text.NewCol(1, "Status", compResultHeaderProps).WithStyle(compResultCellStyle),
			text.NewCol(1, "Check Type", compResultHeaderProps).WithStyle(compResultCellStyle),
			text.NewCol(2, "Category", compResultHeaderProps).WithStyle(compResultCellStyle),
			text.NewCol(2, "Test Number", compResultHeaderProps).WithStyle(compResultCellStyle),
			text.NewCol(3, "Description", compResultHeaderProps).WithStyle(compResultCellStyle),
			text.NewCol(2, "Resource", compResultHeaderProps).WithStyle(compResultCellStyle),
		))
	}
}

func getCompResultRows(d ScanData[model.Compliance], nodeType string) []core.Row {
	resultRows := []core.Row{}
	for k, v := range d.ScanResults {
		if nodeType != "cluster" {
			resultRows = append(
				resultRows,
				row.New(15).Add(
					text.NewCol(1, strconv.Itoa(k+1),
						props.Text{Size: 10, Top: 1, Align: align.Center}).
						WithStyle(compResultCellStyle),
					text.NewCol(1, v.Status,
						props.Text{Size: 10, Top: 1, Align: align.Center, Style: fontstyle.Bold, Color: colors[v.Status]}).WithStyle(compResultCellStyle),
					text.NewCol(2, v.TestCategory,
						props.Text{Size: 10, Top: 1, Align: align.Center, BreakLineStrategy: breakline.DashStrategy}).
						WithStyle(compResultCellStyle),
					text.NewCol(2, v.TestNumber,
						props.Text{Size: 10, Top: 1, Align: align.Center}).
						WithStyle(compResultCellStyle),
					text.NewCol(5, truncateText(v.TestInfo, 100),
						props.Text{Size: 10, Left: 1, Top: 1, BreakLineStrategy: breakline.EmptySpaceStrategy}).
						WithStyle(compResultCellStyle),
					text.NewCol(1, v.ComplianceCheckType,
						props.Text{Size: 10, Top: 1, Align: align.Center}).
						WithStyle(compResultCellStyle),
				),
			)
		} else {
			resultRows = append(
				resultRows,
				row.New(15).Add(
					text.NewCol(1, strconv.Itoa(k+1),
						props.Text{Size: 10, Top: 1, Align: align.Center}).
						WithStyle(compResultCellStyle),
					text.NewCol(1, v.Status,
						props.Text{Size: 10, Top: 1, Align: align.Center, Style: fontstyle.Bold, Color: colors[v.Status]}).WithStyle(compResultCellStyle),
					text.NewCol(1, v.ComplianceCheckType,
						props.Text{Size: 10, Top: 1, Align: align.Center}).
						WithStyle(compResultCellStyle),
					text.NewCol(2, v.TestCategory,
						props.Text{Size: 10, Top: 1, Align: align.Center, BreakLineStrategy: breakline.DashStrategy}).
						WithStyle(compResultCellStyle),
					text.NewCol(2, v.TestNumber,
						props.Text{Size: 10, Top: 1, Align: align.Center, BreakLineStrategy: breakline.DashStrategy}).
						WithStyle(compResultCellStyle),
					text.NewCol(3, truncateText(v.TestInfo, 100),
						props.Text{Size: 10, Left: 1, Top: 1, BreakLineStrategy: breakline.EmptySpaceStrategy}).
						WithStyle(compResultCellStyle),
					text.NewCol(2, v.Resource,
						props.Text{Size: 10, Top: 1, Align: align.Center, BreakLineStrategy: breakline.DashStrategy}).
						WithStyle(compResultCellStyle),
				),
			)
		}
	}
	return resultRows
}

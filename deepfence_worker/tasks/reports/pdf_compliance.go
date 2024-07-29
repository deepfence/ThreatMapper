package reports

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
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

func getComplianceSummaryPage(data map[string]map[string]int32) core.Page {

	cellStyle := &props.Cell{
		BackgroundColor: &props.Color{Red: 255, Green: 255, Blue: 255},
		BorderType:      border.Full,
		BorderColor:     &props.Color{Red: 0, Green: 0, Blue: 0},
		BorderThickness: 0.1,
	}

	summaryPage := page.New()
	summaryPage.Add(text.NewRow(12, "Scans Summary",
		props.Text{Size: 10, Align: align.Center, Style: fontstyle.Bold}))

	summaryTableHeaderProps := props.Text{
		Size:  10,
		Top:   1,
		Align: align.Center,
		Style: fontstyle.Bold,
		Color: &props.Color{Red: 0, Green: 0, Blue: 200},
	}

	summaryPage.Add(
		row.New(6).Add(
			text.NewCol(6, "Node Name", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Pass", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Fail", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Info", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Warn", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Note", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Total", summaryTableHeaderProps).WithStyle(cellStyle),
		),
	)

	summaryProps := props.Text{
		Size:  10,
		Top:   1,
		Align: align.Center,
		Style: fontstyle.Normal,
	}

	summaryRows := []core.Row{}
	for k, v := range data {
		summaryRows = append(
			summaryRows,
			row.New(6).Add(
				text.NewCol(6, k, summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["pass"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["fail"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["info"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["warn"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["note"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["pass"]+v["fail"]+v["info"]+v["warn"]+v["note"])), summaryProps).WithStyle(cellStyle),
			),
		)
	}

	summaryPage.Add(summaryRows...)

	return summaryPage
}

func compliancePDF(ctx context.Context, params utils.ReportParams) (core.Document, error) {

	log := log.WithCtx(ctx)

	data, err := getComplianceData(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get compliance info")
		return nil, err
	}

	log.Info().Msgf("report id %s has %d records",
		params.ReportID, data.NodeWiseData.RecordCount)

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

	cellStyle := &props.Cell{
		BackgroundColor: &props.Color{Red: 255, Green: 255, Blue: 255},
		BorderType:      border.Full,
		BorderColor:     &props.Color{Red: 0, Green: 0, Blue: 0},
		BorderThickness: 0.1,
	}

	resultHeaderProps := props.Text{
		Size:  10,
		Left:  1,
		Top:   1,
		Align: align.Center,
		Style: fontstyle.Bold,
		Color: &props.Color{Red: 0, Green: 0, Blue: 200},
	}

	// page per scan
	resultPages := []core.Page{}
	for i, d := range data.NodeWiseData.ScanData {

		// skip if there are no results
		if len(d.ScanResults) == 0 {
			continue
		}

		p := page.New()
		p.Add(text.NewRow(10, fmt.Sprintf("%s - Scan Details", i), resultHeaderProps))
		if data.AppliedFilters.NodeType != "cluster" {
			p.Add(row.New(10).Add(
				text.NewCol(1, "No.", resultHeaderProps).WithStyle(cellStyle),
				text.NewCol(1, "Status", resultHeaderProps).WithStyle(cellStyle),
				text.NewCol(2, "Category", resultHeaderProps).WithStyle(cellStyle),
				text.NewCol(2, "Test Number", resultHeaderProps).WithStyle(cellStyle),
				text.NewCol(5, "Description", resultHeaderProps).WithStyle(cellStyle),
				text.NewCol(1, "Check Type", resultHeaderProps).WithStyle(cellStyle),
			))
		} else {
			p.Add(row.New(10).Add(
				text.NewCol(1, "No.", resultHeaderProps).WithStyle(cellStyle),
				text.NewCol(1, "Status", resultHeaderProps).WithStyle(cellStyle),
				text.NewCol(1, "Check Type", resultHeaderProps).WithStyle(cellStyle),
				text.NewCol(2, "Category", resultHeaderProps).WithStyle(cellStyle),
				text.NewCol(2, "Test Number", resultHeaderProps).WithStyle(cellStyle),
				text.NewCol(3, "Description", resultHeaderProps).WithStyle(cellStyle),
				text.NewCol(2, "Resource", resultHeaderProps).WithStyle(cellStyle),
			))
		}

		resultRows := []core.Row{}
		for k, v := range d.ScanResults {
			if data.AppliedFilters.NodeType != "cluster" {
				resultRows = append(
					resultRows,
					row.New(15).Add(
						text.NewCol(1, strconv.Itoa(k+1),
							props.Text{Size: 10, Top: 1, Align: align.Center}).
							WithStyle(cellStyle),
						text.NewCol(1, v.Status,
							props.Text{Size: 10, Top: 1, Align: align.Center, Style: fontstyle.Bold, Color: colors[v.Status]}).WithStyle(cellStyle),
						text.NewCol(2, v.TestCategory,
							props.Text{Size: 10, Top: 1, Align: align.Center, BreakLineStrategy: breakline.DashStrategy}).
							WithStyle(cellStyle),
						text.NewCol(2, v.TestNumber,
							props.Text{Size: 10, Top: 1, Align: align.Center}).
							WithStyle(cellStyle),
						text.NewCol(5, truncateText(v.TestInfo, 100),
							props.Text{Size: 10, Left: 1, Top: 1, BreakLineStrategy: breakline.EmptySpaceStrategy}).
							WithStyle(cellStyle),
						text.NewCol(1, v.ComplianceCheckType,
							props.Text{Size: 10, Top: 1, Align: align.Center}).
							WithStyle(cellStyle),
					),
				)
			} else {
				resultRows = append(
					resultRows,
					row.New(15).Add(
						text.NewCol(1, strconv.Itoa(k+1),
							props.Text{Size: 10, Top: 1, Align: align.Center}).
							WithStyle(cellStyle),
						text.NewCol(1, v.Status,
							props.Text{Size: 10, Top: 1, Align: align.Center, Style: fontstyle.Bold, Color: colors[v.Status]}).WithStyle(cellStyle),
						text.NewCol(1, v.ComplianceCheckType,
							props.Text{Size: 10, Top: 1, Align: align.Center}).
							WithStyle(cellStyle),
						text.NewCol(2, v.TestCategory,
							props.Text{Size: 10, Top: 1, Align: align.Center, BreakLineStrategy: breakline.DashStrategy}).
							WithStyle(cellStyle),
						text.NewCol(2, v.TestNumber,
							props.Text{Size: 10, Top: 1, Align: align.Center, BreakLineStrategy: breakline.DashStrategy}).
							WithStyle(cellStyle),
						text.NewCol(3, truncateText(v.TestInfo, 100),
							props.Text{Size: 10, Left: 1, Top: 1, BreakLineStrategy: breakline.EmptySpaceStrategy}).
							WithStyle(cellStyle),
						text.NewCol(2, v.Resource,
							props.Text{Size: 10, Top: 1, Align: align.Center, BreakLineStrategy: breakline.DashStrategy}).
							WithStyle(cellStyle),
					),
				)
			}
		}
		p.Add(resultRows...)
		resultPages = append(resultPages, p)
	}

	// add all pages
	m.AddPages(filtersPage)
	m.AddPages(summaryPage)
	m.AddPages(resultPages...)

	return m.Generate()
}

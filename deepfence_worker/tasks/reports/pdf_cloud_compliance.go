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

func getCloudComplianceSummaryPage(data map[string]map[string]int32) core.Page {

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
			text.NewCol(7, "Node Name", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Alarm", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Ok", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Skip", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Info", summaryTableHeaderProps).WithStyle(cellStyle),
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
				text.NewCol(7, k, summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["alarm"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["ok"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["skip"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["info"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["alarm"]+v["ok"]+v["skip"]+v["info"])), summaryProps).WithStyle(cellStyle),
			),
		)
	}

	summaryPage.Add(summaryRows...)

	return summaryPage
}

func cloudcompliancePDF(ctx context.Context, params utils.ReportParams) (core.Document, error) {

	log := log.WithCtx(ctx)

	data, err := getCloudComplianceData(ctx, params)
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
	summaryPage := getCloudComplianceSummaryPage(data.NodeWiseData.SeverityCount)

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
		p.Add(row.New(10).Add(
			text.NewCol(1, "No.", resultHeaderProps).WithStyle(cellStyle),
			text.NewCol(5, "Resource", resultHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Check Type", resultHeaderProps).WithStyle(cellStyle),
			text.NewCol(4, "Title", resultHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Status", resultHeaderProps).WithStyle(cellStyle),
		))

		resultRows := []core.Row{}
		for k, v := range d.ScanResults {
			resultRows = append(
				resultRows,
				row.New(18).Add(
					text.NewCol(1, strconv.Itoa(k+1),
						props.Text{Size: 10, Top: 1, Align: align.Center}).
						WithStyle(cellStyle),
					text.NewCol(5, v.Resource,
						props.Text{Size: 10, Left: 1, Top: 1, BreakLineStrategy: breakline.DashStrategy}).
						WithStyle(cellStyle),
					text.NewCol(1, v.ComplianceCheckType,
						props.Text{Size: 10, Top: 1, Align: align.Center}).
						WithStyle(cellStyle),
					text.NewCol(4, v.Title,
						props.Text{Size: 10, Left: 1, Top: 1, BreakLineStrategy: breakline.DashStrategy}).
						WithStyle(cellStyle),
					text.NewCol(1, v.Status,
						props.Text{Size: 10, Top: 1, Align: align.Center, Style: fontstyle.Bold, Color: colors[v.Status]}).WithStyle(cellStyle),
				),
			)
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

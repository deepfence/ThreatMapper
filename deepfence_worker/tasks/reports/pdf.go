package reports

import (
	"context"
	"os"
	"strconv"
	"time"

	_ "embed"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/image"
	"github.com/johnfercher/maroto/v2/pkg/components/page"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/border"
	"github.com/johnfercher/maroto/v2/pkg/consts/extension"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

var (
	//go:embed assets/df-logo.png
	DeepfenceLogo []byte
)

var colors = map[string]*props.Color{
	"alarm":    {Red: 228, Green: 29, Blue: 75},
	"info":     {Red: 29, Green: 142, Blue: 230},
	"ok":       {Red: 21, Green: 183, Blue: 126},
	"skip":     {Red: 156, Green: 163, Blue: 175},
	"pass":     {Red: 21, Green: 183, Blue: 126},
	"warn":     {Red: 255, Green: 156, Blue: 50},
	"note":     {Red: 156, Green: 163, Blue: 175},
	"delete":   {Red: 224, Green: 81, Blue: 109},
	"critical": {Red: 245, Green: 102, Blue: 130},
	"high":     {Red: 255, Green: 124, Blue: 2},
	"medium":   {Red: 255, Green: 156, Blue: 50},
	"low":      {Red: 229, Green: 195, Blue: 84},
	"":         {Red: 156, Green: 163, Blue: 175},
}

func truncateText(s string, max int) string {
	if max > len(s) {
		return s
	}
	// return s[:strings.LastIndex(s[:max], " ")]
	return s[:max]
}

func getMarato() core.Maroto {
	cfg := config.NewBuilder().
		WithWorkerPoolSize(2).
		WithPageNumber("Page {current}/{total}", props.RightBottom).
		WithMargins(10, 15, 10).
		Build()

	mrt := maroto.New(cfg)
	m := maroto.NewMetricsDecorator(mrt)

	m.RegisterHeader(text.NewRow(5, time.Now().Format(time.RFC1123Z),
		props.Text{Size: 5, Style: fontstyle.Bold, Align: align.Right}))
	// m.RegisterFooter(text.NewRow(5, time.Now().Format(time.RFC1123Z),
	// props.Text{Size: 5, Style: fontstyle.Bold, Align: align.Left}))

	return m
}

func getFiltersPage(title, scanType, nodeType, timeRange, severity, advFilters string) core.Page {

	cellStyle := &props.Cell{
		BackgroundColor: &props.Color{Red: 255, Green: 255, Blue: 255},
		BorderType:      border.Full,
		BorderColor:     &props.Color{Red: 0, Green: 0, Blue: 0},
		BorderThickness: 0.1,
	}

	filtersPage := page.New()

	filtersPage.Add(
		row.New(15).Add(
			image.NewFromBytesCol(4, DeepfenceLogo, extension.Png,
				props.Rect{Center: true, Percent: 100}),
			text.NewCol(8, title,
				props.Text{Size: 16, Top: 4, Align: align.Center, Style: fontstyle.Bold}),
		))

	filtersPage.Add(text.NewRow(12, "Applied Filters",
		props.Text{Size: 10, Top: 4, Align: align.Center, Style: fontstyle.Bold}))

	filtersTextProps := props.Text{Size: 10, Left: 1, Top: 1}
	filtersPage.Add(
		row.New(6).Add(
			text.NewCol(6, "Scan Type", filtersTextProps).WithStyle(cellStyle),
			text.NewCol(6, scanType, filtersTextProps).WithStyle(cellStyle),
		),
		row.New(6).Add(
			text.NewCol(6, "Node Type", filtersTextProps).WithStyle(cellStyle),
			text.NewCol(6, nodeType, filtersTextProps).WithStyle(cellStyle),
		),
		row.New(6).Add(
			text.NewCol(6, "Time Range", filtersTextProps).WithStyle(cellStyle),
			text.NewCol(6, timeRange, filtersTextProps).WithStyle(cellStyle),
		),
		row.New(6).Add(
			text.NewCol(6, "Severity", filtersTextProps).WithStyle(cellStyle),
			text.NewCol(6, severity, filtersTextProps).WithStyle(cellStyle),
		),
		row.New(6).Add(
			text.NewCol(6, "Advanced Filters", filtersTextProps).WithStyle(cellStyle),
			text.NewCol(6, advFilters, filtersTextProps).WithStyle(cellStyle),
		),
	)

	return filtersPage
}

func getSummaryPage(data *map[string]map[string]int32) core.Page {

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
			text.NewCol(1, "Critical", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "High", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Medium", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(1, "Low", summaryTableHeaderProps).WithStyle(cellStyle),
			text.NewCol(2, "Total", summaryTableHeaderProps).WithStyle(cellStyle),
		),
	)

	summaryProps := props.Text{
		Size:  10,
		Top:   1,
		Align: align.Center,
		Style: fontstyle.Normal,
	}

	summaryRows := []core.Row{}
	for k, v := range *data {
		summaryRows = append(
			summaryRows,
			row.New(6).Add(
				text.NewCol(6, k, summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["critical"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["high"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["medium"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(1, strconv.Itoa(int(v["low"])), summaryProps).WithStyle(cellStyle),
				text.NewCol(2, strconv.Itoa(int(v["low"]+v["medium"]+v["high"]+v["critical"])), summaryProps).WithStyle(cellStyle),
			),
		)
	}

	summaryPage.Add(summaryRows...)

	return summaryPage
}

func generatePDF(ctx context.Context, params utils.ReportParams) (string, error) {

	ctx, span := telemetry.NewSpan(ctx, "reports", "generate-pdf-report")
	defer span.End()

	log := log.WithCtx(ctx)

	var (
		document core.Document
		err      error
	)

	switch params.Filters.ScanType {
	case VULNERABILITY:
		document, err = vulnerabilityPDF(ctx, params)
	case SECRET:
		document, err = secretPDF(ctx, params)
	case MALWARE:
		document, err = malwarePDF(ctx, params)
	case COMPLIANCE:
		document, err = compliancePDF(ctx, params)
	case CLOUD_COMPLIANCE:
		document, err = cloudcompliancePDF(ctx, params)
	default:
		return "", ErrUnknownScanType
	}

	if err != nil {
		log.Error().Err(err).Msg("failed to generate pdf report")
		return "", err
	}

	// create a temp file to hold pdf report
	temp, err := os.CreateTemp("", "report-*-"+reportFileName(params))
	if err != nil {
		return "", err
	}
	defer temp.Close()

	if _, err := temp.Write(document.GetBytes()); err != nil {
		return "", err
	}

	log.Info().Msgf("report id %s pdf generation metrics %s",
		params.ReportID, document.GetReport())

	return temp.Name(), nil
}

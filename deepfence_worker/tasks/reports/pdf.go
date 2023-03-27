package reports

import (
	"bytes"
	"context"
	"embed"
	"html/template"
	"os"

	wkhtmltopdf "github.com/SebastiaanKlippert/go-wkhtmltopdf"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	rptScans "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	rptSearch "github.com/deepfence/ThreatMapper/deepfence_server/reporters/search"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

var (
	//go:embed templates/*.gohtml
	content embed.FS

	templateFiles = []string{
		"templates/base.gohtml",
		"templates/header.gohtml",
		"templates/applied_filters.gohtml",
		"templates/vulnerabilities_summary.gohtml",
	}

	templates = template.Must(template.ParseFS(content, templateFiles...))
)

type Info struct {
	Title                     string
	StartTime                 string
	EndTime                   string
	AppliedFilters            utils.ReportFilters
	OverallSeveritySummary    string
	NodeWiseSeverityCountData NodeWiseSeverityCounts
}

type NodeWiseSeverityCounts struct {
	NodeSeverityCount     map[string]map[string]int32
	NodeVulnerabilityData map[string][]model.Vulnerability
}

func generatePDF(ctx context.Context, session neo4j.Session, params utils.ReportParams) (string, error) {

	nodeFilters := rptSearch.SearchFilter{
		Filters: reporters.FieldsFilters{
			ContainsFilter: reporters.ContainsFilter{
				FieldsValues: map[string][]interface{}{
					"node_type": {params.Filters.NodeType},
				},
			},
		},
	}

	filters := rptSearch.SearchScanReq{NodeFilter: nodeFilters}
	scan_type := utils.NEO4J_VULNERABILITY_SCAN
	scans, err := rptSearch.SearchScansReport(ctx, filters, scan_type)
	if err != nil {
		return "", err
	}

	log.Info().Msgf("scan info: %+v", scans)

	levelFilter := reporters.FieldsFilters{
		MatchFilter: reporters.MatchFilter{
			FieldsValues: map[string][]interface{}{
				"cve_severity": utils.StringArrayToInterfaceArray(params.Filters.SeverityOrCheckType),
			},
		},
	}

	nodeWiseData := NodeWiseSeverityCounts{
		NodeSeverityCount:     make(map[string]map[string]int32),
		NodeVulnerabilityData: make(map[string][]model.Vulnerability),
	}

	for _, s := range scans {
		result, common, err := rptScans.GetScanResults[model.Vulnerability](
			ctx, scan_type, s.ScanId, levelFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		log.Info().Msgf("scan common: %v", common)
		log.Info().Msgf("scan result: %d", len(result))
		nodeWiseData.NodeSeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.NodeVulnerabilityData[s.NodeId] = result
	}

	data := Info{
		Title:                     "Deepfence",
		StartTime:                 "2-7-2023",
		EndTime:                   "2-7-2023",
		AppliedFilters:            params.Filters,
		OverallSeveritySummary:    "Total Count Severity-Wise",
		NodeWiseSeverityCountData: nodeWiseData,
	}

	// render html
	var rendered bytes.Buffer
	err = templates.ExecuteTemplate(&rendered, "base.gohtml", data)
	if err != nil {
		log.Error().Err(err)
		return "", err
	}

	pdfGen, err := wkhtmltopdf.NewPDFGenerator()
	if err != nil {
		log.Error().Err(err).Msg("failed to create new pdf generator")
		return "", err
	}
	pdfGen.Grayscale.Set(false)

	// new page
	page := wkhtmltopdf.NewPageReader(bytes.NewReader(rendered.Bytes()))
	page.FooterRight.Set("[page]")

	pdfGen.AddPage(page)
	err = pdfGen.Create()
	if err != nil {
		log.Error().Err(err).Msg("failed to create new pdf")
		return "", err
	}

	// create a temp file to hold pdf report
	temp, err := os.CreateTemp("", reportFileName(params))
	if err != nil {
		return "", err
	}
	defer temp.Close()

	err = pdfGen.WriteFile(temp.Name())
	if err != nil {
		log.Error().Err(err).Msg("failed write new pdf")
		return "", err
	}

	return temp.Name(), nil
}

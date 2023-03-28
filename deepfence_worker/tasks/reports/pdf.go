package reports

import (
	"bytes"
	"context"
	"embed"
	"html/template"
	"os"
	"time"

	"github.com/Masterminds/sprig/v3"
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

	templateFiles = []string{"templates/*.gohtml"}

	templates = template.Must(
		template.New("").Funcs(sprig.FuncMap()).ParseFS(content, templateFiles...))
)

type Info struct {
	Title          string
	StartTime      string
	EndTime        string
	AppliedFilters utils.ReportFilters
	NodeWiseData   NodeWiseData
}

type NodeWiseData struct {
	SeverityCount     map[string]map[string]int32
	VulnerabilityData map[string][]model.Vulnerability
	SecretData        map[string][]model.Secret
	MalwareData       map[string][]model.Malware
}

func generatePDF(ctx context.Context, session neo4j.Session, params utils.ReportParams) (string, error) {

	var (
		buffer *bytes.Buffer
		err    error
	)

	switch params.Filters.ScanType {
	case "vulnerability":
		buffer, err = vulnerability(ctx, session, params)
	case "secret":
		buffer, err = secret(ctx, session, params)
	case "malware":
		buffer, err = malware(ctx, session, params)
	case "compliance":
		return "", ErrNotImplemented
	default:
		return "", ErrUnknownScanType
	}

	if err != nil {
		return "", err
	}

	pdfGen, err := wkhtmltopdf.NewPDFGenerator()
	if err != nil {
		log.Error().Err(err).Msg("failed to create new pdf generator")
		return "", err
	}
	pdfGen.Grayscale.Set(false)

	// new page
	page := wkhtmltopdf.NewPageReader(bytes.NewReader(buffer.Bytes()))
	page.FooterRight.Set("[page]")

	pdfGen.AddPage(page)
	err = pdfGen.Create()
	if err != nil {
		log.Error().Err(err).Msg("failed to create new pdf")
		return "", err
	}

	// create a temp file to hold pdf report
	temp, err := os.CreateTemp("", "report-*"+reportFileName(params))
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

func vulnerability(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*bytes.Buffer, error) {

	filters := rptSearch.SearchScanReq{
		NodeFilter: rptSearch.SearchFilter{
			Filters: reporters.FieldsFilters{
				ContainsFilter: reporters.ContainsFilter{
					FieldsValues: map[string][]interface{}{
						"node_type": {params.Filters.NodeType},
					},
				},
			},
		},
	}

	scans, err := rptSearch.SearchScansReport(ctx, filters, utils.NEO4J_VULNERABILITY_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("vulnerability scan info: %+v", scans)

	levelFilter := reporters.FieldsFilters{}

	if len(params.Filters.SeverityOrCheckType) > 0 {
		levelFilter = reporters.FieldsFilters{
			MatchFilter: reporters.MatchFilter{
				FieldsValues: map[string][]interface{}{
					"cve_severity": utils.StringArrayToInterfaceArray(params.Filters.SeverityOrCheckType),
				},
			},
		}
	}

	nodeWiseData := NodeWiseData{
		SeverityCount:     make(map[string]map[string]int32),
		VulnerabilityData: make(map[string][]model.Vulnerability),
	}

	for _, s := range scans {
		result, _, err := rptScans.GetScanResults[model.Vulnerability](
			ctx, utils.NEO4J_VULNERABILITY_SCAN, s.ScanId, levelFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.VulnerabilityData[s.NodeId] = result
	}

	data := Info{
		Title:          "Deepfence",
		StartTime:      time.Now().Format("09-07-2017"),
		EndTime:        time.Now().Format("09-07-2017"),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	// render html
	var rendered bytes.Buffer
	err = templates.ExecuteTemplate(&rendered, "base.gohtml", data)
	if err != nil {
		log.Error().Err(err)
		return nil, err
	}

	return &rendered, nil
}

func secret(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*bytes.Buffer, error) {

	filters := rptSearch.SearchScanReq{
		NodeFilter: rptSearch.SearchFilter{
			Filters: reporters.FieldsFilters{
				ContainsFilter: reporters.ContainsFilter{
					FieldsValues: map[string][]interface{}{
						"node_type": {params.Filters.NodeType},
					},
				},
			},
		},
	}

	scans, err := rptSearch.SearchScansReport(ctx, filters, utils.NEO4J_SECRET_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("secret scan info: %+v", scans)

	levelFilter := reporters.FieldsFilters{}

	if len(params.Filters.SeverityOrCheckType) > 0 {
		levelFilter = reporters.FieldsFilters{
			MatchFilter: reporters.MatchFilter{
				FieldsValues: map[string][]interface{}{
					"level": utils.StringArrayToInterfaceArray(params.Filters.SeverityOrCheckType),
				},
			},
		}
	}

	nodeWiseData := NodeWiseData{
		SeverityCount: make(map[string]map[string]int32),
		SecretData:    make(map[string][]model.Secret),
	}

	for _, s := range scans {
		result, _, err := rptScans.GetScanResults[model.Secret](
			ctx, utils.NEO4J_SECRET_SCAN, s.ScanId, levelFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.SecretData[s.NodeId] = result
	}

	data := Info{
		Title:          "Deepfence",
		StartTime:      time.Now().Format("09-07-2017"),
		EndTime:        time.Now().Format("09-07-2017"),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	// render html
	var rendered bytes.Buffer
	err = templates.ExecuteTemplate(&rendered, "base.gohtml", data)
	if err != nil {
		log.Error().Err(err)
		return nil, err
	}

	return &rendered, nil
}

func malware(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*bytes.Buffer, error) {

	filters := rptSearch.SearchScanReq{
		NodeFilter: rptSearch.SearchFilter{
			Filters: reporters.FieldsFilters{
				ContainsFilter: reporters.ContainsFilter{
					FieldsValues: map[string][]interface{}{
						"node_type": {params.Filters.NodeType},
					},
				},
			},
		},
	}

	scans, err := rptSearch.SearchScansReport(ctx, filters, utils.NEO4J_MALWARE_SCAN)
	if err != nil {
		return nil, err
	}

	log.Info().Msgf("malware scan info: %+v", scans)

	levelFilter := reporters.FieldsFilters{}

	if len(params.Filters.SeverityOrCheckType) > 0 {
		levelFilter = reporters.FieldsFilters{
			MatchFilter: reporters.MatchFilter{
				FieldsValues: map[string][]interface{}{
					"file_severity": utils.StringArrayToInterfaceArray(params.Filters.SeverityOrCheckType),
				},
			},
		}
	}

	nodeWiseData := NodeWiseData{
		SeverityCount: make(map[string]map[string]int32),
		MalwareData:   make(map[string][]model.Malware),
	}

	for _, s := range scans {
		result, _, err := rptScans.GetScanResults[model.Malware](
			ctx, utils.NEO4J_MALWARE_SCAN, s.ScanId, levelFilter, model.FetchWindow{})
		if err != nil {
			log.Error().Err(err).Msgf("failed to get results for %s", s.ScanId)
			continue
		}
		nodeWiseData.SeverityCount[s.NodeId] = s.SeverityCounts
		nodeWiseData.MalwareData[s.NodeId] = result
	}

	data := Info{
		Title:          "Deepfence",
		StartTime:      time.Now().Format("09-07-2017"),
		EndTime:        time.Now().Format("09-07-2017"),
		AppliedFilters: params.Filters,
		NodeWiseData:   nodeWiseData,
	}

	// render html
	var rendered bytes.Buffer
	err = templates.ExecuteTemplate(&rendered, "base.gohtml", data)
	if err != nil {
		log.Error().Err(err)
		return nil, err
	}

	return &rendered, nil
}

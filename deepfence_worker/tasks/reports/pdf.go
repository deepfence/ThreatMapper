package reports

import (
	"bytes"
	"context"
	"embed"
	"html/template"
	"os"

	"github.com/Masterminds/sprig/v3"
	wkhtmltopdf "github.com/SebastiaanKlippert/go-wkhtmltopdf"
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

func generatePDF(ctx context.Context, session neo4j.Session, params utils.ReportParams) (string, error) {

	var (
		buffer *bytes.Buffer
		err    error
	)

	switch params.Filters.ScanType {
	case VULNERABILITY:
		buffer, err = vulnerabilityPDF(ctx, session, params)
	case SECRET:
		buffer, err = secretPDF(ctx, session, params)
	case MALWARE:
		buffer, err = malwarePDF(ctx, session, params)
	case COMPLIANCE:
		buffer, err = compliancePDF(ctx, session, params)
	case CLOUD_COMPLIANCE:
		buffer, err = cloudCompliancePDF(ctx, session, params)
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
	temp, err := os.CreateTemp("", "report-*-"+reportFileName(params))
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

func vulnerabilityPDF(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*bytes.Buffer, error) {

	data, err := getVulnerabilityData(ctx, session, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get vulnerabilities info")
		return nil, err
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

func secretPDF(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*bytes.Buffer, error) {

	data, err := getSecretData(ctx, session, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get secret info")
		return nil, err
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

func malwarePDF(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*bytes.Buffer, error) {

	data, err := getMalwareData(ctx, session, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get malware info")
		return nil, err
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

func compliancePDF(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*bytes.Buffer, error) {

	data, err := getComplianceData(ctx, session, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get compliance info")
		return nil, err
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

func cloudCompliancePDF(ctx context.Context, session neo4j.Session, params utils.ReportParams) (*bytes.Buffer, error) {

	data, err := getCloudComplianceData(ctx, session, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to get cloud compliance info")
		return nil, err
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

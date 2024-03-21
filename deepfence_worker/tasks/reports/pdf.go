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
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
)

var (
	//go:embed templates/*.gohtml
	content embed.FS

	templateFiles = []string{"templates/*.gohtml"}

	templates = template.Must(
		template.New("").Funcs(sprig.FuncMap()).ParseFS(content, templateFiles...))
)

func generatePDF(ctx context.Context, params utils.ReportParams) (string, error) {

	ctx, span := telemetry.NewSpan(ctx, "reports", "generate-pdf-report")
	defer span.End()

	log := log.WithCtx(ctx)

	var (
		buffer *bytes.Buffer
		err    error
	)

	switch params.Filters.ScanType {
	case VULNERABILITY:
		buffer, err = vulnerabilityPDF(ctx, params)
	case SECRET:
		buffer, err = secretPDF(ctx, params)
	case MALWARE:
		buffer, err = malwarePDF(ctx, params)
	case COMPLIANCE:
		buffer, err = compliancePDF(ctx, params)
	case CLOUD_COMPLIANCE:
		buffer, err = cloudCompliancePDF(ctx, params)
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
	page.HeaderRight.Set(time.Now().Format(time.RFC3339))

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

func vulnerabilityPDF(ctx context.Context, params utils.ReportParams) (*bytes.Buffer, error) {

	log := log.WithCtx(ctx)

	data, err := getVulnerabilityData(ctx, params)
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

func secretPDF(ctx context.Context, params utils.ReportParams) (*bytes.Buffer, error) {

	log := log.WithCtx(ctx)

	data, err := getSecretData(ctx, params)
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

func malwarePDF(ctx context.Context, params utils.ReportParams) (*bytes.Buffer, error) {

	log := log.WithCtx(ctx)

	data, err := getMalwareData(ctx, params)
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

func compliancePDF(ctx context.Context, params utils.ReportParams) (*bytes.Buffer, error) {

	log := log.WithCtx(ctx)

	data, err := getComplianceData(ctx, params)
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

func cloudCompliancePDF(ctx context.Context, params utils.ReportParams) (*bytes.Buffer, error) {

	log := log.WithCtx(ctx)

	data, err := getCloudComplianceData(ctx, params)
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

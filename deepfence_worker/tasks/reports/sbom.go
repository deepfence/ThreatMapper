package reports

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path"
	"strings"

	"github.com/anchore/syft/syft/formats"
	"github.com/anchore/syft/syft/formats/cyclonedxjson"
	"github.com/anchore/syft/syft/formats/spdxjson"
	"github.com/anchore/syft/syft/formats/syftjson"
	"github.com/anchore/syft/syft/sbom"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/minio/minio-go/v7"
	"github.com/spdx/tools-golang/spdx"
)

var (
	sbomFormatMap = map[string]sbom.Format{
		// syft-json@11.0.1
		syftjson.Format().String(): syftjson.Format(),
		// spdx-json@2.2
		spdxjson.Format2_2().String(): spdxjson.Format2_2(),
		// spdx-json@2.3
		spdxjson.Format2_3().String(): spdxjson.Format2_3(),
		// cyclonedx-json@1.5
		cyclonedxjson.Format1_5().String(): cyclonedxjson.Format1_5(),
	}

	ErrUnknownSbomFormat = errors.New("unknown sbom format")
)

func generateSBOM(ctx context.Context, params utils.ReportParams) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "reports", "generate-sbom-report")
	defer span.End()

	fileName, err := sbomReport(ctx, params)
	if err != nil {
		return "", err
	}
	return fileName, nil
}

func sbomReport(ctx context.Context, params utils.ReportParams) (string, error) {
	var ok bool
	var sbomFormat sbom.Format
	if sbomFormat, ok = sbomFormatMap[params.Options.SBOMFormat]; !ok {
		return "", ErrUnknownSbomFormat
	}

	sbomFilePath := path.Join("/sbom", utils.ScanIDReplacer.Replace(params.Filters.ScanID)+".json.gz")
	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		return "", err
	}
	buff, err := mc.DownloadFileContexts(ctx, sbomFilePath, minio.GetObjectOptions{})
	if err != nil {
		return "", err
	}

	if sbomFormat.String() == syftjson.Format().String() {
		// SBOM already in syft-json format
		return saveSbomToFile(buff, params)
	}

	gzReader, err := gzip.NewReader(bytes.NewBuffer(buff))
	if err != nil {
		return "", err
	}
	var sbomContent bytes.Buffer
	_, err = io.Copy(&sbomContent, gzReader)
	readerCloseErr := gzReader.Close()
	if err != nil {
		return "", err
	}
	if readerCloseErr != nil {
		return "", readerCloseErr
	}

	newSBOMContent, err := convertSBOMFormat(&sbomContent, sbomFormat)
	if err != nil {
		return "", err
	}

	// compress sbom
	var out bytes.Buffer
	gzWriter := gzip.NewWriter(&out)
	_, err = gzWriter.Write(newSBOMContent)
	writerCloseErr := gzWriter.Close()
	if err != nil {
		return "", err
	}
	if writerCloseErr != nil {
		return "", writerCloseErr
	}

	return saveSbomToFile(out.Bytes(), params)
}

func saveSbomToFile(sbomContent []byte, params utils.ReportParams) (string, error) {
	temp, err := os.CreateTemp("", "sbom-*-"+reportFileName(params))
	if err != nil {
		return "", err
	}
	defer temp.Close()

	_, err = temp.Write(sbomContent)
	if err != nil {
		return "", err
	}

	return temp.Name(), nil
}

func convertSBOMFormat(oldFormatSBOMReader io.Reader, newFormat sbom.Format) ([]byte, error) {
	oldFormatSBOM, _, err := formats.Decode(oldFormatSBOMReader)
	if err != nil {
		return nil, err
	}

	newFormatSBOM, err := formats.Encode(*oldFormatSBOM, newFormat)
	if err != nil {
		return nil, err
	}

	if newFormat.String() == spdxjson.Format2_2().String() || newFormat.String() == spdxjson.Format2_3().String() {
		// https://tools.spdx.org/app/validate/
		// spdx validator expects package file name to be relative path (should not start with /)
		var spdxDoc spdx.Document
		err = json.Unmarshal(newFormatSBOM, &spdxDoc)
		if err != nil {
			return nil, err
		}

		licenseIDCaseInsensitive := make(map[string]string)
		for i := len(spdxDoc.OtherLicenses) - 1; i >= 0; i-- {
			_, found := licenseIDCaseInsensitive[strings.ToLower(spdxDoc.OtherLicenses[i].LicenseIdentifier)]
			if found {
				// Delete this entry since same license ID already exists (case-insensitive match)
				spdxDoc.OtherLicenses = append(spdxDoc.OtherLicenses[:i], spdxDoc.OtherLicenses[i+1:]...)
			} else {
				licenseIDCaseInsensitive[strings.ToLower(spdxDoc.OtherLicenses[i].LicenseIdentifier)] = spdxDoc.OtherLicenses[i].LicenseIdentifier
			}
		}
		for i, pkg := range spdxDoc.Packages {
			spdxDoc.Packages[i].PackageLicenseDeclared = licenseIDCaseInsensitive[strings.ToLower(pkg.PackageLicenseDeclared)]
		}

		for i, packageFile := range spdxDoc.Files {
			if !strings.HasPrefix(packageFile.FileName, ".") {
				spdxDoc.Files[i].FileName = "." + packageFile.FileName
			}
		}

		newFormatSBOM, err = json.MarshalIndent(spdxDoc, "", "\t")
		if err != nil {
			return nil, err
		}
	}

	return newFormatSBOM, nil
}

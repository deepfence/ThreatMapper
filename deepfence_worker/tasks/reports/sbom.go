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

	"github.com/anchore/syft/syft/format"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/minio/minio-go/v7"
	"github.com/rs/zerolog/log"
	"github.com/spdx/tools-golang/spdx"
)

const (
	SYFT_JSON          = "syft-json"
	SPDX_JSON_2_2      = "spdx-json@2.2"
	SPDX_JSON_2_3      = "spdx-json@2.3"
	CYCLONEDX_JSON_1_5 = "cyclonedx-json@1.5"
)

var (
	ErrUnknownSbomFormat = errors.New("unknown sbom format")
)

func isSupportedFormat(format string) bool {
	return format == SYFT_JSON ||
		format == SPDX_JSON_2_2 ||
		format == SPDX_JSON_2_3 ||
		format == CYCLONEDX_JSON_1_5
}

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
	sbomFormat := params.Options.SBOMFormat

	if !isSupportedFormat(sbomFormat) {
		log.Error().Msgf("unsupported format %s", sbomFormat)
		return "", ErrUnknownSbomFormat
	}

	scanID := utils.ScanIDReplacer.Replace(params.Filters.ScanID)

	sbomFilePath := path.Join("/sbom", scanID+".json.gz")
	mc, err := directory.FileServerClient(ctx)
	if err != nil {
		return "", err
	}

	tmpsbomFilePath := path.Join("/tmp", scanID+".json")
	f, err := os.Create(tmpsbomFilePath)
	if err != nil {
		return "", err
	}
	defer os.Remove(f.Name())

	// need to decompress
	sbomFile := utils.NewUnzippedFile(f)

	err = mc.DownloadFileTo(ctx, sbomFilePath, sbomFile, minio.GetObjectOptions{})
	if err != nil {
		log.Error().Msg(err.Error())
		return "", err
	}

	sbomContent, err := os.ReadFile(tmpsbomFilePath)
	if err != nil {
		log.Error().Msg(err.Error())
		return "", err
	}

	// check if conversion in required
	var newSBOMContent []byte
	if strings.HasPrefix(sbomFormat, "syft-json") {
		// SBOM already in syft-json format
		newSBOMContent = sbomContent
	} else {
		newSBOMContent, err = convertSBOMFormat(bytes.NewReader(sbomContent), sbomFormat)
		if err != nil {
			log.Error().Err(err).Msgf("error converting sbom to %s", sbomFormat)
			return "", err
		}
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

func convertSBOMFormat(oldFormatSBOMReader io.Reader, newFormat string) ([]byte, error) {
	oldFormatSBOM, formatID, schema, err := format.Decode(oldFormatSBOMReader)
	if err != nil {
		log.Error().Err(err).Msg("error decoding sbom")
		return nil, err
	}

	encoders, err := format.DefaultEncodersConfig().Encoders()
	if err != nil {
		log.Error().Err(err).Msg("error getting default encoders")
		return nil, err
	}

	ec := format.NewEncoderCollection(encoders...)
	encoder := ec.GetByString(newFormat)

	newFormatSBOM, err := format.Encode(*oldFormatSBOM, encoder)
	if err != nil {
		log.Error().Err(err).Msgf("error converting sbom from %s %s to %s",
			formatID, schema, newFormat)
		return nil, err
	}

	if newFormat == SPDX_JSON_2_2 || newFormat == SPDX_JSON_2_3 {
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

package threatintel

import (
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"os"
	"path"
	"sort"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/minio/minio-go/v7"
)

const (
	Version3 = "3"
	Version5 = "5"
)

var (
	ListingJSON          = "listing.json"
	VulnerabilityDBStore = "vulnerability"
	ListingPath          = path.Join(VulnerabilityDBStore, ListingJSON)
	// DeepfenceVulnDBURL   = "https://threat-intel.deepfence.io/vulnerability-db/listing.json"
)

type DBUploadRequest struct {
	Database multipart.File `formData:"database" json:"database" validate:"required" required:"true"`
}

type VulnerabilityDBListing struct {
	Available map[string][]Database `json:"available"`
}

type Database struct {
	Built    time.Time `json:"built"`
	Version  int       `json:"version"`
	URL      string    `json:"url"`
	Checksum string    `json:"checksum"`
}

func NewVulnerabilityDBListing() *VulnerabilityDBListing {
	return &VulnerabilityDBListing{
		Available: map[string][]Database{
			Version3: make([]Database, 0),
			Version5: make([]Database, 0),
		},
	}
}

func LoadListing(d []byte) (*VulnerabilityDBListing, error) {
	var v VulnerabilityDBListing
	if err := json.Unmarshal(d, &v); err != nil {
		return nil, err
	}
	return &v, nil
}

func (v *VulnerabilityDBListing) Bytes() ([]byte, error) {
	return json.Marshal(v)
}

func (v *VulnerabilityDBListing) Append(db Database, version string) {
	v.Available[version] = append(v.Available[version], db)
}

func (v *VulnerabilityDBListing) Sort(version string) {
	if len(v.Available[version]) <= 1 {
		return
	}

	dbs := v.Available[version]
	sort.Slice(dbs, func(i, j int) bool {
		return dbs[i].Built.Before(dbs[j].Built)
	})
	v.Available[version] = dbs
}

func (v *VulnerabilityDBListing) Latest(version string) *Database {
	// sort, get last element
	v.Sort(version)

	dbs, ok := v.Available[version]
	if !ok {
		return nil

	}
	if len(dbs) >= 1 {
		return &dbs[len(dbs)-1]
	}
	return nil
}

func VulnDBUpdateListing(ctx context.Context, newFile, newFileCheckSum string, buildTime time.Time) error {
	log.Info().Msg("update vulnerability database listing")

	mc, err := directory.MinioClient(directory.WithDatabaseContext(ctx))
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	// if err ignore, listing file is missing
	data, err := mc.DownloadFileContexts(ctx, ListingPath, minio.GetObjectOptions{})
	if err != nil {
		log.Error().Err(err).Msg("failed to load listing file might be missing")
	}

	listing, err := LoadListing(data)
	if err != nil {
		log.Warn().Msg("failed to load listing file create new listing")
		listing = NewVulnerabilityDBListing()
	}

	minioHost := utils.GetEnvOrDefault("DEEPFENCE_MINIO_HOST", "deepfence-file-server")
	minioPort := utils.GetEnvOrDefault("DEEPFENCE_MINIO_PORT", "9000")
	minioRegion := os.Getenv("DEEPFENCE_MINIO_REGION")
	minioBucket := os.Getenv("DEEPFENCE_MINIO_DB_BUCKET")

	// for aws s3
	fileURL := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s",
		minioBucket, minioRegion, newFile)
	if minioHost != "s3.amazonaws.com" {
		fileURL = fmt.Sprintf("http://%s:%s/%s",
			minioHost, minioPort, path.Join(string(directory.DatabaseDirKey), newFile))
	}

	listing.Append(
		Database{
			Built:    buildTime,
			Version:  5,
			URL:      fileURL,
			Checksum: newFileCheckSum,
		},
		Version5,
	)

	lb, err := listing.Bytes()
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	_, err = mc.UploadFile(ctx, ListingPath, lb, true,
		minio.PutObjectOptions{ContentType: "application/json"})
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	log.Info().Msgf("vulnerability db listing updated with file %s checksum %s",
		newFile, newFileCheckSum)

	return nil

}

func DownloadVulnerabilityDB(ctx context.Context, info Entry) error {

	log.Info().Msg("download latest vulnerability database")

	ctx, span := telemetry.NewSpan(ctx, "threatintel", "download-vulnerability-db")
	defer span.End()

	data, err := downloadFile(ctx, info.URL)
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	path, _, err := UploadToMinio(ctx, data.Bytes(), VulnerabilityDBStore,
		fmt.Sprintf("vuln-db-%d.tar.gz", info.Built.Unix()))
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	// update listing.json file
	return VulnDBUpdateListing(ctx, path, info.Checksum, info.Built)

}

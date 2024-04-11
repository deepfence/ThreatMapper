package threatintel

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path"
	"path/filepath"
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

func (v *VulnerabilityDBListing) Set(dbs []Database, version string) {
	v.Available[version] = dbs
}

func (v *VulnerabilityDBListing) Append(db Database, version string) {
	exists := false
	index := 0

	for i, d := range v.Available[version] {
		if d.URL == db.URL {
			exists = true
			index = i
		}
	}

	if !exists {
		v.Available[version] = append(v.Available[version], db)
	} else {
		v.Available[version][index] = db
	}
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

func (v *VulnerabilityDBListing) LatestN(version string, num int) (latest []Database, oldest []Database) {
	// sort
	v.Sort(version)

	dbs, ok := v.Available[version]
	if !ok {
		return latest, oldest
	}

	if len(dbs) <= num {
		latest = dbs
	} else {
		latest = dbs[len(dbs)-num:]
	}
	if len(dbs) > num {
		oldest = dbs[:len(dbs)-num]
	}

	return latest, oldest
}

func VulnDBUpdateListing(ctx context.Context, newFile, newFileCheckSum string, buildTime time.Time) error {
	log.Info().Msg("update vulnerability database listing")

	mc, err := directory.FileServerClient(directory.WithDatabaseContext(ctx))
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

	minioHost := utils.GetEnvOrDefault("DEEPFENCE_FILE_SERVER_HOST", "deepfence-file-server")
	minioPort := utils.GetEnvOrDefault("DEEPFENCE_FILE_SERVER_PORT", "9000")
	minioRegion := os.Getenv("DEEPFENCE_FILE_SERVER_REGION")
	minioBucket := os.Getenv("DEEPFENCE_FILE_SERVER_DB_BUCKET")

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

	latest, oldest := listing.LatestN(Version5, 3)

	// keep only latest 3 databases
	listing.Set(latest, Version5)

	// delete old database
	for _, d := range oldest {
		fname := path.Join(VulnerabilityDBStore, filepath.Base(d.URL))
		log.Info().Msgf("remove old vuln db file %s", fname)
		if err := mc.DeleteFile(ctx, fname, true, minio.RemoveObjectOptions{ForceDelete: true}); err != nil {
			log.Error().Err(err).Msg("failed to remove old ")
		}
	}

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

	path, checksum, err := UploadToMinio(ctx, data.Bytes(), VulnerabilityDBStore,
		fmt.Sprintf("vuln-db-%d.tar.gz", info.Built.Unix()))
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	// update listing.json file
	return VulnDBUpdateListing(ctx, path, checksum, info.Built)

}

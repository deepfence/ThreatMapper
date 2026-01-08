package threatintel

import (
	"context"
	"encoding/json"
	"fmt"
	"path"
	"path/filepath"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/minio/minio-go/v7"
)

const (
	// GrypeV6ModelVersion is the grype database schema model version
	GrypeV6ModelVersion = 6
)

var (
	LatestJSON           = "latest.json"
	VulnerabilityDBStore = "vulnerability"
	// GrypeV6DBDir is the directory path for grype v6 format database files
	// Grype constructs URL as: {base_url}/v{ModelVersion}/latest.json
	GrypeV6DBDir = path.Join(VulnerabilityDBStore, fmt.Sprintf("v%d", GrypeV6ModelVersion))
	// GrypeV6LatestPath is the path to grype v6 format latest.json
	GrypeV6LatestPath = path.Join(GrypeV6DBDir, LatestJSON)
)

// GrypeStatus represents the lifecycle status of a vulnerability database
type GrypeStatus string

const (
	GrypeStatusActive     GrypeStatus = "active"
	GrypeStatusDeprecated GrypeStatus = "deprecated"
	GrypeStatusEndOfLife  GrypeStatus = "end-of-life"
)

// GrypeSchemaVersion represents the schema version in grype v6 format (e.g., "6.0.0")
type GrypeSchemaVersion struct {
	Model    int `json:"-"`
	Revision int `json:"-"`
	Addition int `json:"-"`
}

func (v GrypeSchemaVersion) MarshalJSON() ([]byte, error) {
	return json.Marshal(fmt.Sprintf("%d.%d.%d", v.Model, v.Revision, v.Addition))
}

func (v *GrypeSchemaVersion) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	_, err := fmt.Sscanf(s, "%d.%d.%d", &v.Model, &v.Revision, &v.Addition)
	return err
}

// GrypeLatestDocument represents the grype v6 latest.json format
type GrypeLatestDocument struct {
	Status        GrypeStatus        `json:"status"`
	SchemaVersion GrypeSchemaVersion `json:"schemaVersion"`
	Built         time.Time          `json:"built"`
	Path          string             `json:"path"`
	Checksum      string             `json:"checksum"`
}

// NewGrypeLatestDocument creates a new GrypeLatestDocument
func NewGrypeLatestDocument(archivePath string, checksum string, buildTime time.Time) *GrypeLatestDocument {
	return &GrypeLatestDocument{
		Status: GrypeStatusActive,
		SchemaVersion: GrypeSchemaVersion{
			Model:    GrypeV6ModelVersion,
			Revision: 0,
			Addition: 0,
		},
		Built:    buildTime,
		Path:     filepath.Base(archivePath),
		Checksum: checksum,
	}
}

func (g *GrypeLatestDocument) Bytes() ([]byte, error) {
	return json.MarshalIndent(g, "", " ")
}

// LoadLatestDocument loads a GrypeLatestDocument from bytes
func LoadLatestDocument(data []byte) (*GrypeLatestDocument, error) {
	var doc GrypeLatestDocument
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, err
	}
	return &doc, nil
}

// VulnDBUpdateLatest updates the grype v6 latest.json file
func VulnDBUpdateLatest(ctx context.Context, newFile, newFileCheckSum string, buildTime time.Time) error {
	log.Info().Msg("update vulnerability database latest.json")

	mc, err := directory.FileServerClient(directory.WithDatabaseContext(ctx))
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	// Load existing latest.json to get old database filename for cleanup
	oldData, err := mc.DownloadFileContexts(ctx, GrypeV6LatestPath, minio.GetObjectOptions{})
	if err == nil {
		oldDoc, err := LoadLatestDocument(oldData)
		if err == nil && oldDoc.Path != "" && oldDoc.Path != filepath.Base(newFile) {
			// Delete old database file
			oldFilePath := path.Join(GrypeV6DBDir, oldDoc.Path)
			log.Info().Msgf("remove old vuln db file %s", oldFilePath)
			if err := mc.DeleteFile(ctx, oldFilePath, true, minio.RemoveObjectOptions{ForceDelete: true}); err != nil {
				log.Error().Err(err).Msg("failed to remove old vuln db")
			}
		}
	}

	// Generate and upload grype v6 format latest.json
	grypeLatest := NewGrypeLatestDocument(newFile, newFileCheckSum, buildTime)
	grypeLatestBytes, err := grypeLatest.Bytes()
	if err != nil {
		log.Error().Err(err).Msg("failed to marshal grype v6 latest.json")
		return err
	}

	_, err = mc.UploadFile(ctx, GrypeV6LatestPath, grypeLatestBytes, true,
		minio.PutObjectOptions{ContentType: "application/json"})
	if err != nil {
		log.Error().Err(err).Msg("failed to upload grype v6 latest.json")
		return err
	}

	log.Info().Msgf("grype v6 latest.json updated at %s with file %s checksum %s",
		GrypeV6LatestPath, newFile, newFileCheckSum)

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

	// Upload to the v6 directory so it's alongside latest.json
	// Grype expects the database tarball to be relative to latest.json
	dbFileName := fmt.Sprintf("vulnerability.db-%d.tar.gz", info.Built.Unix())
	fileServerPath, checksum, err := UploadToMinio(ctx, data.Bytes(), GrypeV6DBDir, dbFileName)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	// update latest.json file
	return VulnDBUpdateLatest(ctx, fileServerPath, checksum, info.Built)
}

// GetLatestVulnerabilityDB returns the current latest vulnerability database info
func GetLatestVulnerabilityDB(ctx context.Context) (*GrypeLatestDocument, error) {
	mc, err := directory.FileServerClient(directory.WithDatabaseContext(ctx))
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	data, err := mc.DownloadFileContexts(ctx, GrypeV6LatestPath, minio.GetObjectOptions{})
	if err != nil {
		log.Error().Err(err).Msg("failed to load latest.json file")
		return nil, err
	}

	return LoadLatestDocument(data)
}

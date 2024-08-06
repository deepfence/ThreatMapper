package threatintel

import (
	"archive/tar"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/threatintel/vulnerabilitydatabase"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/glebarez/sqlite"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"gorm.io/gorm"
)

const (
	Version3 = "3"
	Version5 = "5"

	threatIntelDBFileName = "vulnerability.db"
	sqliteWriteBatchSize  = 1
)

const (
	ScanTypeBase       = "base"
	ScanTypeRuby       = "ruby"
	ScanTypePython     = "python"
	ScanTypeJavaScript = "javascript"
	ScanTypePhp        = "php"
	ScanTypeGolang     = "golang"
	ScanTypeJava       = "java"
	ScanTypeRust       = "rust"
)

var (
	ListingJSON          = "listing.json"
	VulnerabilityDBStore = "vulnerability"
	ListingPath          = path.Join(VulnerabilityDBStore, ListingJSON)

	attackVectorRegex = regexp.MustCompile(`.*av:n.*`)

	namespaceToLanguage = map[string]string{
		"github:language:go":         ScanTypeGolang,
		"github:language:java":       ScanTypeJava,
		"github:language:javascript": ScanTypeJavaScript,
		"github:language:php":        ScanTypePhp,
		"github:language:python":     ScanTypePython,
		"github:language:ruby":       ScanTypeRuby,
		"github:language:rust":       ScanTypeRust,
	}
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

	// for aws s3
	fileURL := fmt.Sprintf("%s://%s.s3.%s.amazonaws.com/%s",
		directory.FileServerProtocol, directory.FileServerDatabaseBucket, directory.FileServerRegion, newFile)
	if directory.FileServerHost != "s3.amazonaws.com" {
		fileURL = fmt.Sprintf("%s://%s:%s/%s",
			directory.FileServerProtocol, directory.FileServerHost, directory.FileServerPort,
			path.Join(string(directory.DatabaseDirKey), newFile))
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

	fileServerPath, checksum, err := IngestVulnerabilityRules(ctx, data.Bytes(), info.Built)
	if err != nil {
		return err
	}

	// update listing.json file
	return VulnDBUpdateListing(ctx, fileServerPath, checksum, info.Built)

}

func IngestVulnerabilityRules(ctx context.Context, content []byte, builtDate time.Time) (string, string, error) {
	var fileServerPath, checksum string
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return fileServerPath, checksum, err
	}
	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	err = ProcessTarGz(content, func(header *tar.Header, reader io.Reader) error {
		var feeds FeedsBundle
		if header.FileInfo().IsDir() {
			return nil
		}
		if header.Name != VulnerabilityRuleJSONFileName {
			return nil
		}
		jdec := json.NewDecoder(reader)
		err = jdec.Decode(&feeds)
		if err != nil {
			log.Error().Msg(err.Error())
			return err
		}

		if len(feeds.ScannerFeeds.VulnerabilityRules) != 1 {
			log.Error().Err(err).Msg("deepfence vulnerability rule not found")
			return nil
		}

		var vulnerabilityDBModel vulnerabilitydatabase.VulnerabilityDBModel
		payload, err := base64.StdEncoding.DecodeString(feeds.ScannerFeeds.VulnerabilityRules[0].Payload)
		if err != nil {
			log.Error().Msg(err.Error())
			return err
		}
		err = json.Unmarshal(payload, &vulnerabilityDBModel)
		if err != nil {
			log.Error().Err(err).Msg("deepfence rule unmarshal error")
			return err
		}

		dbTmpDir, err := os.MkdirTemp("", "vulnerability-db-*")
		if err != nil {
			log.Error().Msg(err.Error())
			return err
		}
		defer os.RemoveAll(dbTmpDir)
		dbFileName := path.Join(dbTmpDir, threatIntelDBFileName)
		tarFileName := fmt.Sprintf("vuln-db-%d.tar.gz", builtDate.Unix())
		tarFilePath := path.Join(dbTmpDir, tarFileName)

		err = deepfenceRuleToSqliteDatabase(vulnerabilityDBModel, dbFileName)
		if err != nil {
			log.Error().Err(err).Msg("converting vulnerability db json to sqlite failed")
			return err
		}

		err = ingestVulnerabilityRules(ctx, vulnerabilityDBModel)
		if err != nil {
			log.Error().Msg(err.Error())
			return err
		}

		err = compressVulnerabilityDB(dbFileName, tarFilePath)
		if err != nil {
			log.Error().Msg(err.Error())
			return err
		}

		tarFileContent, err := openFile(tarFilePath)
		if err != nil {
			log.Error().Msg(err.Error())
			return err
		}

		fileServerPath, checksum, err = UploadToMinio(ctx, tarFileContent, VulnerabilityDBStore, tarFileName)
		if err != nil {
			log.Error().Msg(err.Error())
			return err
		}

		return nil
	})
	if err != nil {
		return fileServerPath, checksum, err
	}

	return fileServerPath, checksum, err
}

func deepfenceRuleToSqliteDatabase(vulnerabilityDBModel vulnerabilitydatabase.VulnerabilityDBModel, dbFileName string) error {
	db, err := gorm.Open(sqlite.Open(dbFileName), &gorm.Config{})
	if err != nil {
		return err
	}

	err = db.AutoMigrate(&vulnerabilitydatabase.VulnerabilityModel{})
	if err != nil {
		return err
	}
	err = db.AutoMigrate(&vulnerabilitydatabase.VulnerabilityMetadataModel{})
	if err != nil {
		return err
	}
	err = db.AutoMigrate(&vulnerabilitydatabase.IDModel{})
	if err != nil {
		return err
	}
	err = db.AutoMigrate(&vulnerabilitydatabase.VulnerabilityMatchExclusionModel{})
	if err != nil {
		return err
	}

	// insert into db
	err = db.CreateInBatches(&vulnerabilityDBModel.VulnerabilityModel, sqliteWriteBatchSize).Error
	if err != nil {
		return err
	}
	err = db.CreateInBatches(&vulnerabilityDBModel.VulnerabilityMetadataModel, sqliteWriteBatchSize).Error
	if err != nil {
		return err
	}
	err = db.Create(&vulnerabilityDBModel.IDModel).Error
	if err != nil {
		return err
	}

	return nil
}

func ingestVulnerabilityRules(ctx context.Context, vulnerabilityDBModel vulnerabilitydatabase.VulnerabilityDBModel) error {
	vulnerabilityMetadataMap := make(map[string]vulnerabilitydatabase.VulnerabilityMetadata, len(vulnerabilityDBModel.VulnerabilityMetadataModel))
	for _, v := range vulnerabilityDBModel.VulnerabilityMetadataModel {
		meta, err := v.Inflate()
		if err != nil {
			log.Error().Msg(err.Error())
			continue
		}
		vulnerabilityMetadataMap[v.ID+":"+v.Namespace] = meta
	}
	vulnerabilityRules := make([]map[string]interface{}, 0)
	for _, v := range vulnerabilityDBModel.VulnerabilityModel {
		vulnerabilityMetadata, ok := vulnerabilityMetadataMap[v.ID+":"+v.Namespace]
		if !ok {
			log.Debug().Msgf("No vulnerability metadata found for %s in namespace %s", v.ID, v.Namespace)
			continue
		}

		vulnerability, err := v.Inflate()
		if err != nil {
			log.Error().Msg(err.Error())
			continue
		}
		cveFixedInVersion := ""
		if len(vulnerability.Fix.Versions) > 0 {
			cveFixedInVersion = vulnerability.Fix.Versions[0]
		}
		cveCVSSScoreList := vulnerabilityMetadata.Cvss
		var cvssScore float64
		var overallScore float64
		var attackVector string

		if len(cveCVSSScoreList) == 0 {
			if len(vulnerability.RelatedVulnerabilities) > 0 {
				relatedVulnerability := vulnerability.RelatedVulnerabilities[0]
				relatedVulnerabilityMetadata, ok := vulnerabilityMetadataMap[relatedVulnerability.ID+":"+relatedVulnerability.Namespace]
				if ok {
					cvssScore, overallScore, attackVector = vulnerabilitydatabase.GetCvss(relatedVulnerabilityMetadata.Cvss)
				}
			}
		} else {
			cvssScore, overallScore, attackVector = vulnerabilitydatabase.GetCvss(vulnerabilityMetadata.Cvss)
		}

		if cvssScore == 0.0 {
			switch strings.ToLower(vulnerabilityMetadata.Severity) {
			case "critical":
				cvssScore = vulnerabilitydatabase.DefaultCVSSCritical
			case "high":
				cvssScore = vulnerabilitydatabase.DefaultCVSSHigh
			case "medium":
				cvssScore = vulnerabilitydatabase.DefaultCVSSMedium
			case "low":
				cvssScore = vulnerabilitydatabase.DefaultCVSSLow
			}
		}

		metasploitURL, urls := vulnerabilitydatabase.ExtractExploitPocURL(vulnerabilityMetadata.URLs)
		var parsedAttackVector string
		if attackVectorRegex.MatchString(attackVector) || attackVector == "network" || attackVector == "n" {
			parsedAttackVector = "network"
		} else {
			parsedAttackVector = "local"
		}

		var cveType string
		if cveType, ok = namespaceToLanguage[vulnerabilityMetadata.Namespace]; !ok {
			cveType = ScanTypeBase
		}

		vulnerabilityRule := ingesters.VulnerabilityRule{
			CveID:              vulnerability.ID,
			CveType:            cveType,
			CveSeverity:        strings.ToLower(vulnerabilityMetadata.Severity),
			CveFixedIn:         cveFixedInVersion,
			CveLink:            vulnerabilityMetadata.DataSource,
			CveDescription:     vulnerabilityMetadata.Description,
			CveCvssScore:       cvssScore,
			CveOverallScore:    overallScore,
			CveAttackVector:    attackVector,
			URLs:               urls,
			ExploitPOC:         metasploitURL,
			ParsedAttackVector: parsedAttackVector,
			CISAKEV:            vulnerabilityMetadata.CISAKEV,
			EPSSScore:          vulnerabilityMetadata.EPSSScore,
			Namespace:          vulnerability.Namespace,
			NodeID:             fmt.Sprintf("%s-%s", vulnerability.ID, vulnerability.Namespace),
		}
		vulnerabilityRules = append(vulnerabilityRules, vulnerabilityRule.ToMap())

		if len(vulnerabilityRules) == 1000 {
			_ = saveVulnerabilityRulesInNeo4j(ctx, vulnerabilityRules)
			vulnerabilityRules = make([]map[string]interface{}, 0)
		}
	}

	if len(vulnerabilityRules) > 0 {
		_ = saveVulnerabilityRulesInNeo4j(ctx, vulnerabilityRules)
	}
	return nil
}

func saveVulnerabilityRulesInNeo4j(ctx context.Context, vulnerabilityRules []map[string]interface{}) error {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	defer tx.Close(ctx)

	if _, err = tx.Run(ctx, `
		UNWIND $batch as rule
		MERGE (v:VulnerabilityStub{node_id:rule.node_id})
		SET v += rule,
		    v.masked = COALESCE(v.masked, false),
		    v.updated_at = TIMESTAMP()`,
		map[string]interface{}{"batch": vulnerabilityRules}); err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	return nil
}

func compressVulnerabilityDB(dbFileName string, tarFileName string) error {
	out, err := os.Create(tarFileName)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}
	defer out.Close()

	err = createArchive([]string{dbFileName}, out)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	}

	return nil
}

func openFile(fileName string) ([]byte, error) {
	content, err := os.ReadFile(fileName)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	return content, nil
}

package cronjobs

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	url2 "net/url"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
	m "github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"golang.org/x/mod/semver"
)

var (
	listing_url = "https://threat-intel.deepfence.io/release/threatmapper/listing.json"
)

type ListingFormat struct {
	Available []struct {
		Built    time.Time `json:"built"`
		Version  string    `json:"version"`
		URL      string    `json:"url"`
		Checksum string    `json:"checksum"`
	} `json:"available"`
}

func CheckAgentUpgrade(ctx context.Context, task *asynq.Task) error {
	log.Info().Msg("Start agent version check")

	resp, err := http.Get(listing_url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	var listing ListingFormat
	json.Unmarshal(body, &listing)

	versioned_tarball := map[string]*bytes.Buffer{}
	for _, version := range listing.Available {
		tar_resp, err := http.Get(version.URL)
		if err != nil {
			log.Error().Msgf("Skipping %v, %v", version, err)
			continue
		}
		defer tar_resp.Body.Close()
		tarball, err := io.ReadAll(tar_resp.Body)
		if err != nil {
			log.Error().Msgf("Skipping %v, err: %v", version, err)
			continue
		}

		versioned_tarball[version.Version] = bytes.NewBuffer(tarball)
	}

	tags_with_urls, err := prepareAgentBinariesReleases(ctx, versioned_tarball)
	if err != nil {
		return err
	}

	err = ingestAgentVersion(ctx, tags_with_urls)
	if err != nil {
		return err
	}
	return scheduleAutoUpgradeForPatchChanges(ctx, getLatestVersionByMajorMinor(versioned_tarball))
}

func prepareAgentBinariesReleases(ctx context.Context, versioned_tarball map[string]*bytes.Buffer) (map[string]string, error) {
	processed_tags := map[string]string{}
	minio, err := directory.MinioClient(ctx)
	if err != nil {
		return processed_tags, err
	}

	for version, b := range versioned_tarball {
		res, err := minio.UploadFile(ctx,
			version,
			b.Bytes(),
			false,
			m.PutObjectOptions{ContentType: "application/gzip"})
		key := ""
		if err != nil {
			ape, ok := err.(directory.AlreadyPresentError)
			if ok {
				log.Warn().Err(err).Msg("Skip upload")
				key = ape.Path
			} else {
				log.Error().Err(err).Msg("Upload")
				continue
			}
		} else {
			key = res.Key
		}

		url, err := minio.ExposeFile(ctx, key, false, 10*time.Hour, url2.Values{})
		if err != nil {
			log.Error().Err(err)
			continue
		}
		log.Debug().Msgf("Exposed URL: %v", url)
		processed_tags[version] = url
	}
	return processed_tags, nil
}

func ingestAgentVersion(ctx context.Context, tags_to_url map[string]string) error {
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(15 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	tags_to_ingest := []map[string]string{}
	for k, v := range tags_to_url {
		tags_to_ingest = append(tags_to_ingest, map[string]string{"tag": k, "url": v})
	}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MERGE (n:AgentVersion{node_id: row.tag})
		SET n.url = row.url`,
		map[string]interface{}{"batch": tags_to_ingest}); err != nil {
		return err
	}

	return tx.Commit()
}

func scheduleAutoUpgradeForPatchChanges(ctx context.Context, latest map[string]string) error {
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(15 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	tags_to_ingest := []map[string]string{}
	for k, v := range latest {
		action, err := controls.PrepareAgentUpgradeAction(ctx, v)
		if err != nil {
			log.Error().Msg(err.Error())
			continue
		}

		action_str, err := json.Marshal(action)
		if err != nil {
			return err
		}
		tags_to_ingest = append(tags_to_ingest,
			map[string]string{
				"major_minor": k,
				"latest":      v,
				"action":      string(action_str)})
	}

	if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (vnew:AgentVersion{node_id: row.latest})
		MATCH (v:AgentVersion) <-[:VERSIONED]- (n:Node)
		WHERE v.node_id STARTS WITH row.major_minor
		AND v.node_id <> row.latest
		MERGE (vnew) -[:SCHEDULED{status: $status, retries: 0, trigger_action: row.action, updated_at: TIMESTAMP()}]-> (n)`,
		map[string]interface{}{
			"status": utils.SCAN_STATUS_STARTING,
			"batch":  tags_to_ingest}); err != nil {
		return err
	}

	return tx.Commit()
}

func getLatestVersionByMajorMinor(versions map[string]*bytes.Buffer) map[string]string {
	latest_patches := map[string]string{}
	all_versions := map[string][]string{}

	for k := range versions {
		all_versions[semver.MajorMinor(k)] =
			append(all_versions[semver.MajorMinor(k)],
				k)
	}
	for k, v := range all_versions {
		semver.Sort(v)
		latest_patches[k] = v[len(v)-1]
	}
	return latest_patches
}

package threatintel

import (
	"context"
	"fmt"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/jellydator/ttlcache/v3"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const (
	SecretsRulesStore = "secrets"
)

func DownloadSecretsRules(ctx context.Context, entry Entry) error {

	log.Info().Msg("download latest secrets rules")

	ctx, span := telemetry.NewSpan(ctx, "threatintel", "download-secrets-rules")
	defer span.End()

	// remove old rule file
	existing, _, err := FetchSecretsRulesInfo(ctx)
	if err != nil {
		log.Error().Err(err).Msg("no existing secret rules info found")
	} else {
		if err := DeleteFileMinio(ctx, existing); err != nil {
			log.Error().Err(err).Msgf("failed to delete file %s", existing)
		}
	}

	// download latest rules and uplaod to minio
	content, err := downloadFile(ctx, entry.URL)
	if err != nil {
		log.Error().Err(err).Msg("failed to download secrets rules")
		return err
	}

	path, sha, err := UploadToMinio(ctx, content.Bytes(),
		SecretsRulesStore, fmt.Sprintf("secrets-rules-%d.tar.gz", entry.Built.Unix()))
	if err != nil {
		log.Error().Err(err).Msg("failed to uplaod secrets rules to fileserver")
		return err
	}

	// create node in neo4j
	return UpdateSecretsRulesInfo(ctx, sha, strings.TrimPrefix(path, "database/"))
}

func UpdateSecretsRulesInfo(ctx context.Context, hash, path string) error {
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err = session.Run(ctx, `
		MERGE (n:SecretsRules{node_id: "latest"})
		SET n.rules_hash=$hash,
			n.path=$path,
			n.updated_at=TIMESTAMP()`,
		map[string]interface{}{
			"hash": hash,
			"path": path,
		})
	if err != nil {
		log.Error().Err(err).Msg("failed to update SecretsRules on neo4j")
		return err
	}

	return nil
}

func FetchSecretsRulesURL(ctx context.Context, consoleURL string, ttlCache *ttlcache.Cache[string, string]) (string, string, error) {
	path, hash, err := FetchSecretsRulesInfo(ctx)
	if err != nil {
		return "", "", err
	}
	exposedURL, err := ExposeFile(ctx, path, consoleURL, ttlCache)
	if err != nil {
		log.Error().Err(err).Msg("failed to expose secrets rules on fileserver")
		return "", "", err
	}
	return exposedURL, hash, nil
}

func FetchSecretsRulesInfo(ctx context.Context) (path, hash string, err error) {
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return "", "", err
	}
	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx)
	if err != nil {
		return "", "", err
	}
	defer tx.Close(ctx)

	querySecretsRules := `
	MATCH (s:SecretsRules{node_id: "latest"})
	RETURN s.path, s.rules_hash`

	r, err := tx.Run(ctx, querySecretsRules, map[string]interface{}{})
	if err != nil {
		return "", "", err
	}
	rec, err := r.Single(ctx)
	if err != nil {
		return "", "", err
	}

	return rec.Values[0].(string), rec.Values[1].(string), nil
}

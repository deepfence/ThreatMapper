package threatintel

import (
	"context"
	"fmt"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var (
	PostureControlsStore = "posture"
)

func DownloadAndPopulateCloudControls(ctx context.Context, entry Entry) error {

	log.Info().Msg("download latest cloud controls")

	ctx, span := telemetry.NewSpan(ctx, "threatintel", "download-and-populate-cloud-controls")
	defer span.End()

	// remove old rule file
	existing, _, err := FetchPostureControlsInfo(ctx)
	if err != nil {
		log.Error().Err(err).Msg("no existing posture control info found")
	} else {
		if err := DeleteFileMinio(ctx, existing); err != nil {
			log.Error().Err(err).Msgf("failed to delete file %s", existing)
		}
	}

	// download latest rules and upload to file server
	content, err := downloadFile(ctx, entry.URL)
	if err != nil {
		log.Error().Err(err).Msg("failed to download posture controls")
		return err
	}

	path, sha, err := UploadToMinio(ctx, content.Bytes(),
		PostureControlsStore, fmt.Sprintf("posture-controls-%d.tar.gz", entry.Built.Unix()))
	if err != nil {
		log.Error().Err(err).Msg("failed to uplaod posture controls to fileserver")
		return err
	}

	if err := UpdatePostureControlsInfo(ctx, sha, strings.TrimPrefix(path, "database/")); err != nil {
		return err
	}

	// trigger job to load cloud controls

	return TriggerLoadCloudControls(ctx)
}

func TriggerLoadCloudControls(ctx context.Context) error {
	worker, err := directory.Worker(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get worker instance")
		return err
	}
	err = worker.Enqueue(utils.CloudComplianceControlsTask, []byte{}, utils.CritialTaskOpts()...)
	if err != nil && err != asynq.ErrTaskIDConflict {
		log.Error().Err(err).Msgf("failed to enqueue %s", utils.CloudComplianceControlsTask)
		return err
	}
	return nil
}

func UpdatePostureControlsInfo(ctx context.Context, hash, path string) error {
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err = session.Run(ctx, `
	MERGE (n:PostureControls{node_id: "latest"})
	SET n.rules_hash=$hash,
		n.path=$path,
		n.updated_at=TIMESTAMP()`,
		map[string]interface{}{
			"hash": hash,
			"path": path,
		})
	if err != nil {
		log.Error().Err(err).Msg("failed to update PostureControls on neo4j")
		return err
	}

	return nil
}

func FetchPostureControlsInfo(ctx context.Context) (path, hash string, err error) {
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

	queryPostureControls := `
	MATCH (s:PostureControls{node_id: "latest"})
	RETURN s.path, s.rules_hash`

	r, err := tx.Run(ctx, queryPostureControls, map[string]interface{}{})
	if err != nil {
		return "", "", err
	}
	rec, err := r.Single(ctx)
	if err != nil {
		return "", "", err
	}

	return rec.Values[0].(string), rec.Values[1].(string), nil

}

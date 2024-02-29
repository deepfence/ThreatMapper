package threatintel

import (
	"context"
	"os"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
)

const (
	cloudControlsBasePath = "/cloud_controls"
)

func DownloadAndPopulateCloudControls(ctx context.Context, entries []Entry) error {

	log.Info().Msg("download latest cloud controls")

	ctx, span := telemetry.NewSpan(ctx, "threatintel", "download-and-populate-cloud-controls")
	defer span.End()

	// cleanup old controls
	os.RemoveAll(cloudControlsBasePath)
	os.MkdirAll(cloudControlsBasePath, 0755)

	// download cloud controls
	for _, e := range entries {
		content, err := downloadFile(ctx, e.URL)
		if err != nil {
			log.Error().Err(err).Msgf("failed to download controls type %s", e.Type)
			return err
		}

		if err := utils.ExtractTarGz(content, cloudControlsBasePath); err != nil {
			log.Error().Err(err).Msgf("failed to exract the cloud controls file type %s", e.Type)
			return err
		}
	}

	// trigger job to load cloud controls
	worker, err := directory.Worker(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get worker instance")
		return err
	}
	err = worker.EnqueueUnique(utils.CloudComplianceControlsTask, []byte{}, utils.CritialTaskOpts()...)
	if err != nil && err != asynq.ErrTaskIDConflict {
		log.Error().Err(err).Msgf("failed to enqueue %s", utils.CloudComplianceControlsTask)
		return err
	}
	return nil
}

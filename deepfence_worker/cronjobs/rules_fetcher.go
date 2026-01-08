package cronjobs

import (
	"context"
	"errors"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/threatintel"
	wutils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/hibiken/asynq"
	"github.com/sourcegraph/conc"
)

func FetchThreatIntel(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	log.Info().Msgf("Fetch threat intel")
	defer log.Info().Msgf("Fetch threat intel done")

	version := wutils.Version

	// download rules/db in parallel
	var wg conc.WaitGroup
	var errs []error

	// Create entries with direct download URLs
	vulnEntry := threatintel.Entry{
		Built:   time.Now(),
		Version: version,
		Type:    threatintel.DBTypeVulnerability,
		URL:     threatintel.GetThreatIntelURL(threatintel.DBTypeVulnerability, version),
	}

	secretsEntry := threatintel.Entry{
		Built:   time.Now(),
		Version: version,
		Type:    threatintel.DBTypeSecrets,
		URL:     threatintel.GetThreatIntelURL(threatintel.DBTypeSecrets, version),
	}

	malwareEntry := threatintel.Entry{
		Built:   time.Now(),
		Version: version,
		Type:    threatintel.DBTypeMalware,
		URL:     threatintel.GetThreatIntelURL(threatintel.DBTypeMalware, version),
	}

	postureEntry := threatintel.Entry{
		Built:   time.Now(),
		Version: version,
		Type:    threatintel.DBTypePosture,
		URL:     threatintel.GetThreatIntelURL(threatintel.DBTypePosture, version),
	}

	// download vulnerability db
	wg.Go(func() {
		if err := threatintel.DownloadVulnerabilityDB(ctx, vulnEntry); err != nil {
			log.Error().Err(err).Msg("failed to download vuln db")
			errs = append(errs, err)
		}
	})

	// download rules for secret scanner
	wg.Go(func() {
		if err := threatintel.DownloadSecretsRules(ctx, secretsEntry); err != nil {
			log.Error().Err(err).Msg("failed to download secrets rules")
			errs = append(errs, err)
		}
	})

	// download rules for malware scanner
	wg.Go(func() {
		if err := threatintel.DownloadMalwareRules(ctx, malwareEntry); err != nil {
			log.Error().Err(err).Msg("failed to download malware rules")
			errs = append(errs, err)
		}
	})

	// download cloud controls and populate them
	wg.Go(func() {
		if err := threatintel.DownloadAndPopulateCloudControls(ctx, postureEntry); err != nil {
			log.Error().Err(err).Msg("failed to download cloud controls")
			errs = append(errs, err)
		}
	})

	wg.Wait()

	// check if there were any errors
	if len(errs) > 0 {
		return errors.Join(errs...)
	}

	return nil
}

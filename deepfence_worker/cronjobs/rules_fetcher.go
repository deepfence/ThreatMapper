package cronjobs

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/threatintel"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
	"golang.org/x/sync/errgroup"
)

var (
	threatIntelURL = "http://threat-intel.deepfence.space/threat-intel/listing.json"
)

// FetchLicense gets license key from database
func FetchLicense(ctx context.Context) (string, error) {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return "", err
	}
	license, err := model.GetLicense(ctx, pgClient)
	if err != nil {
		return "", err
	}
	return license.LicenseKey, nil
}

func FetchThreatIntelListing(ctx context.Context, token string) (threatintel.Listing, error) {

	ctx, span := telemetry.NewSpan(ctx, "cronjobs", "fetch-threat-intel-listing")
	defer span.End()

	var listing threatintel.Listing

	tr := http.DefaultTransport.(*http.Transport).Clone()
	tr.TLSClientConfig = &tls.Config{
		InsecureSkipVerify: true,
	}
	hc := http.Client{
		Timeout:   10 * time.Second,
		Transport: tr,
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, threatIntelURL, nil)
	if err != nil {
		log.Error().Err(err).Msg("failed to construct new http request")
		return listing, err
	}

	req.Header.Set("x-license-key", token)

	q := req.URL.Query()
	q.Add("version", ConsoleVersion)
	q.Add("product", utils.Project)
	req.URL.RawQuery = q.Encode()

	log.Info().Msgf("query threatintel at %s", req.URL.String())

	resp, err := hc.Do(req)
	if err != nil {
		log.Error().Err(err).Msg("failed http request")
		return listing, err
	}

	if resp.StatusCode != http.StatusOK {
		return listing, fmt.Errorf("%d invaid response code", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Err(err).Msg("failed read response body")
		return listing, err
	}
	defer resp.Body.Close()

	if err := json.Unmarshal(body, &listing); err != nil {
		log.Error().Err(err).Msg("failed to decode response body")
		return listing, err
	}

	return listing, nil

}

func FetchThreatIntel(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	log.Info().Msgf("Fetch threat intel")
	defer log.Info().Msgf("Fetch threat intel done")

	_, err := directory.GetManagementHost(ctx)
	if err != nil {
		log.Warn().Msg("FetchThreatIntel Management console URL not configured yet")
		return nil
	}

	// check if token is present
	token, err := FetchLicense(ctx)
	if err != nil || token == "" {
		log.Error().Err(err).Msg("token is required to access threat intel")
		return err
	}

	listing, err := FetchThreatIntelListing(ctx, token)
	if err != nil {
		// renew rules url expiry
		if err := UpdateRulesUrlExpiry(ctx); err != nil {
			log.Err(err).Msgf("failed to renew url rules expiry")
		}
		log.Error().Err(err).Msg("failed to load latest listing")
		return err
	}

	// download rules/db in parallel
	g, ctx := errgroup.WithContext(ctx)

	// download vulnerability db
	vulnDBInfo, err := listing.GetLatest(ConsoleVersion, threatintel.DBTypeVulnerability)
	if err != nil {
		log.Error().Err(err).Msg("failed to get vuln db info")
		return err
	}

	g.Go(func() error {
		if err := threatintel.DownloadVulnerabilityDB(ctx, vulnDBInfo); err != nil {
			log.Error().Err(err).Msg("failed to download vuln db")
			return err
		}
		return nil
	})

	// download rules for secret scanner
	secretsRulesInfo, err := listing.GetLatest(ConsoleVersion, threatintel.DBTypeSecrets)
	if err != nil {
		log.Error().Err(err).Msg("failed to get secrets rules db info")
		return err
	}

	g.Go(func() error {
		if err := threatintel.DownloadSecretsRules(ctx, secretsRulesInfo); err != nil {
			log.Error().Err(err).Msg("failed to download secrets rules")
			return err
		}
		return nil
	})

	// download rules for malware scanner
	malwareRulesInfo, err := listing.GetLatest(ConsoleVersion, threatintel.DBTypeMalware)
	if err != nil {
		log.Error().Err(err).Msg("failed to get malware rules info")
		return err
	}

	g.Go(func() error {
		if err := threatintel.DownloadMalwareRules(ctx, malwareRulesInfo); err != nil {
			log.Error().Err(err).Msg("failed to download malware rules")
			return err
		}
		return nil
	})

	// download cloud controls and populate them
	postureInfo, err := listing.GetLatest(ConsoleVersion, threatintel.DBTypePosture)
	if err != nil {
		log.Error().Err(err).Msg("failed to get compliance controls info")
		return err
	}

	g.Go(func() error {
		if err := threatintel.DownloadAndPopulateCloudControls(ctx, postureInfo); err != nil {
			log.Error().Err(err).Msg("failed to download cloud controls")
			return err
		}
		return nil
	})

	return g.Wait()
}

func UpdateRulesUrlExpiry(ctx context.Context) error {

	// renew secrets rules
	_, shash, spath, err := threatintel.FetchSecretsRulesInfo(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get secrets rules info")
		return err
	}

	surl, err := threatintel.ExposeFile(ctx, path.Join("database", spath))
	if err != nil {
		log.Error().Err(err).Msg("failed to expose secrets rule file")
		return err
	}

	if err := threatintel.UpdateSecretsRulesInfo(ctx, surl, shash, spath); err != nil {
		log.Error().Err(err).Msg("failed to update secrets rule file")
		return err
	}

	// renew malware rules
	_, mhash, mpath, err := threatintel.FetchMalwareRulesInfo(ctx)
	if err != nil {
		log.Error().Err(err).Msg("failed to get malware rules info")
		return err
	}

	url, err := threatintel.ExposeFile(ctx, path.Join("database", mpath))
	if err != nil {
		log.Error().Err(err).Msg("failed to expose malware rule file")
		return err
	}

	if err := threatintel.UpdateMalwareRulesInfo(ctx, url, mhash, mpath); err != nil {
		log.Error().Err(err).Msg("failed to update malware rule file")
		return err
	}

	return nil
}

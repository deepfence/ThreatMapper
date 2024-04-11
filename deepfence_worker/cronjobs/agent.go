package cronjobs

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/handler"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/hibiken/asynq"
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

	log := log.WithCtx(ctx)

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
	tags := []string{}
	for _, version := range listing.Available {
		tar_resp, err := http.Get(version.URL)
		if err != nil {
			log.Error().Msgf("Skipping %v, %v", version, err)
			continue
		}
		defer tar_resp.Body.Close()

		if semver.Major(version.Version) != semver.Major(utils.Version) {
			continue
		}

		tags = append(tags, version.Version)

		tarball, err := io.ReadAll(tar_resp.Body)
		if err != nil {
			log.Error().Msgf("Skipping %v, err: %v", version, err)
			continue
		}

		versioned_tarball[version.Version] = bytes.NewBuffer(tarball)
	}

	tagsWithFileServerKeys, err := handler.PrepareAgentBinariesReleases(ctx, versioned_tarball)
	if err != nil {
		return err
	}

	err = handler.IngestAgentVersion(ctx, tagsWithFileServerKeys, false)
	if err != nil {
		return err
	}

	err = handler.CleanUpAgentVersion(ctx, tags)
	if err != nil {
		return err
	}

	return handler.ScheduleAutoUpgradeForPatchChanges(ctx, handler.GetLatestVersionByMajorMinor(versioned_tarball))
}

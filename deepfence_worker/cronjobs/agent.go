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
	listing_url    = "https://threat-intel.deepfence.io/release/threatmapper/listing.json"
	cs_listing_url = "http://206.189.137.58/release/cloudscanner/listing.json"
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
	//CheckCloudScannerAgentUpgrade(ctx, task)

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
		log.Info().Msgf("version: %v", version)
		tar_resp, err := http.Get(version.URL)
		if err != nil {
			log.Error().Msgf("Skipping %v, %v", version, err)
			continue
		}
		defer tar_resp.Body.Close()

		if semver.MajorMinor(version.Version) != semver.MajorMinor(utils.Version) {
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

	tags_with_urls, err := handler.PrepareAgentBinariesReleases(ctx, versioned_tarball)
	if err != nil {
		return err
	}

	err = handler.IngestAgentVersion(ctx, tags_with_urls, false)
	if err != nil {
		return err
	}

	err = handler.CleanUpAgentVersion(ctx, tags)
	if err != nil {
		return err
	}

	return handler.ScheduleAutoUpgradeForPatchChanges(ctx, handler.GetLatestVersionByMajorMinor(versioned_tarball))
}

func CheckCloudScannerAgentUpgrade(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	log.Info().Msg("Start CloudScanner agent version check")

	resp, err := http.Get(cs_listing_url)
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Msgf(err.Error())
		return err
	}

	var listing ListingFormat
	json.Unmarshal(body, &listing)

	versioned_tarball := map[string]*bytes.Buffer{}
	tags := []string{}
	for _, version := range listing.Available {
		{
			b, err := json.Marshal(version)
			if err == nil {
				log.Info().Msgf("version: %s", string(b))
			}
		}
		tar_resp, err := http.Get(version.URL)
		if err != nil {
			log.Error().Msgf("Skipping %v, %v", version, err)
			continue
		}
		defer tar_resp.Body.Close()

		log.Info().Msgf("semver.MajorMinor(version.Version): %s, semver.MajorMinor(utils.Version): %s",
			semver.MajorMinor(version.Version), semver.MajorMinor(utils.Version))

		if semver.MajorMinor(version.Version) != semver.MajorMinor(utils.Version) {
			log.Info().Msgf("Skipping version:%s", version.Version)
			continue
		} else {
			log.Info().Msgf("Processing version:%s", version.Version)
		}

		tags = append(tags, version.Version)

		tarball, err := io.ReadAll(tar_resp.Body)
		if err != nil {
			log.Error().Msgf("Skipping %v, err: %v", version, err)
			continue
		}

		log.Info().Msgf("Adding version: %s, size:%d", version.Version, len(tarball))
		versioned_tarball[version.Version] = bytes.NewBuffer(tarball)
		/*{
			dir, err := filepath.Abs(filepath.Dir(os.Args[0]))
			if err != nil {
				log.Error().Msgf(err.Error())
			} else {
				log.Info().Msgf(dir)
			}

			log.Info().Msgf("Creating file:%s", version.Version)
			fo, err := os.Create(version.Version)
			if err != nil {
				log.Error().Msgf(err.Error())
			} else {
				if _, err := fo.Write(tarball); err != nil {
					log.Error().Msgf(err.Error())
				}
				fo.Close()
			}
		}*/
	}

	tags_with_urls, err := handler.PrepareAgentBinariesReleases(ctx, versioned_tarball)
	if err != nil {
		return err
	}

	err = handler.IngestAgentVersion(ctx, tags_with_urls, false)
	if err != nil {
		return err
	}

	err = handler.CleanUpAgentVersion(ctx, tags)
	if err != nil {
		return err
	}

	{
		temp := handler.GetLatestVersionByMajorMinor(versioned_tarball)
		b, err := json.Marshal(temp)
		if err == nil {
			log.Info().Msgf("handler.GetLatestVersionByMajorMinor: %s", string(b))
		}
	}

	err = handler.ScheduleAutoUpgradeForPatchChanges(ctx, handler.GetLatestVersionByMajorMinor(versioned_tarball))
	if err != nil {
		log.Error().Msgf("Error in ScheduleAutoUpgradeForPatchChanges: %s", err.Error())
	}
	return err
}

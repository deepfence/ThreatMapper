package constants

import (
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"golang.org/x/mod/semver"
)

var (
	Version   string
	Commit    string
	BuildTime string
)

func init() {
	if !semver.IsValid(Version) {
		log.Fatal().Msgf("Provided console version %s is not valid", Version)
	}
}

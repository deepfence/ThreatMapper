package output

import (
	"os"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

var format string

func Out[T any](t T) {
	var err error
	switch format {
	case "json":
		err = out_json(t)
	default:
		log.Error().Msgf("Output format %s not supported", format)
	}
	if err != nil {
		log.Error().Msgf("Could not marshal %v into %v format: %v", t, format, err)
	}
}

func init() {
	format = os.Getenv("DEEPFENCE_CTL_OUT_FORMAT")
	if format == "" {
		format = "json"
		log.Warn().Msgf("Using default output format %s", format)
	}
}

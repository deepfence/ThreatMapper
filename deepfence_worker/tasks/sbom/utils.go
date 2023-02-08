package sbom

import (
	"encoding/json"

	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/twmb/franz-go/pkg/kgo"
)

type SbomScanStatus struct {
	utils.SbomParameters
	ScanStatus string `json:"scan_status,omitempty"`
}

func NewSbomScanStatus(params utils.SbomParameters, Status string) SbomScanStatus {
	return SbomScanStatus{SbomParameters: params, ScanStatus: Status}
}

func SendScanStatus(ingestC chan *kgo.Record, status SbomScanStatus, rh []kgo.RecordHeader) error {
	sb, err := json.Marshal(status)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	} else {
		ingestC <- &kgo.Record{
			Topic:   utils.VULNERABILITY_SCAN_STATUS,
			Value:   sb,
			Headers: rh,
		}
	}
	return nil
}

package secretscan

import (
	"encoding/json"

	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/twmb/franz-go/pkg/kgo"
)

type SecretScanStatus struct {
	utils.SecretScanParameters
	ScanStatus  string `json:"scan_status,omitempty"`
	ScanMessage string `json:"scan_message,omitempty"`
}

func NewSecretScanStatus(params utils.SecretScanParameters, Status string, msg string) SecretScanStatus {
	return SecretScanStatus{SecretScanParameters: params, ScanStatus: Status, ScanMessage: msg}
}

func SendScanStatus(ingestC chan *kgo.Record, status SecretScanStatus, rh []kgo.RecordHeader) error {
	sb, err := json.Marshal(status)
	if err != nil {
		log.Error().Msg(err.Error())
		return err
	} else {
		ingestC <- &kgo.Record{
			Topic:   utils.SECRET_SCAN_STATUS,
			Value:   sb,
			Headers: rh,
		}
	}
	return nil
}

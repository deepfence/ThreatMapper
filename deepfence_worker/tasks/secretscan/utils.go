package secretscan

import (
	"encoding/json"
	"time"

	"github.com/deepfence/SecretScanner/scan"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
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

func StartStatusReporter(scanCtx *scan.ScanContext,
	params utils.SecretScanParameters, ingestC chan *kgo.Record,
	rh []kgo.RecordHeader) chan error {

	res := make(chan error)
	scan_id := scanCtx.ScanID

	//If we don't get any active status back within threshold,
	//we consider the scan job as dead
	threshold := 1200
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		var err error
		ts := time.Now()
		log.Info().Msgf("StatusReporter started, scan_id: %s", scan_id)
	loop:
		for {
			select {
			case err = <-res:
				break loop
			case <-scanCtx.ScanStatusChan:
				ts = time.Now()
			case <-ticker.C:
				if scanCtx.Stopped.Load() || scanCtx.Aborted.Load() {
					continue loop
				}

				elapsed := int(time.Since(ts).Seconds())
				if elapsed > threshold {
					scanCtx.Aborted.Store(true)
				} else {
					SendScanStatus(ingestC, NewSecretScanStatus(params,
						utils.SCAN_STATUS_INPROGRESS, ""), rh)

				}
			}
		}

		if scanCtx.Aborted.Load() == true {
			SendScanStatus(ingestC, NewSecretScanStatus(params,
				utils.SCAN_STATUS_FAILED, scan.AbortError.Error()), rh)
		} else if scanCtx.Stopped.Load() == true {
			SendScanStatus(ingestC, NewSecretScanStatus(params,
				utils.SCAN_STATUS_CANCELLED, "Scan stopped by user"), rh)
		} else if err != nil {
			SendScanStatus(ingestC, NewSecretScanStatus(params,
				utils.SCAN_STATUS_FAILED, err.Error()), rh)
		} else {
			SendScanStatus(ingestC, NewSecretScanStatus(params,
				utils.SCAN_STATUS_SUCCESS, ""), rh)
		}

		log.Info().Msgf("StatusReporter finished, scan_id: %s", scan_id)
	}()
	return res
}

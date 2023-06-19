package sbom

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/twmb/franz-go/pkg/kgo"
)

const SBOM_GENERATED = "SBOM_GENERATED"

type SbomScanStatus struct {
	utils.SbomParameters
	ScanStatus  string          `json:"scan_status,omitempty"`
	ScanMessage string          `json:"scan_message,omitempty"`
	ScanInfo    *model.ScanInfo `json:"scan_info,omitempty"`
}

func NewSbomScanStatus(params utils.SbomParameters, status string, msg string, info *model.ScanInfo) SbomScanStatus {
	return SbomScanStatus{SbomParameters: params, ScanStatus: status, ScanMessage: msg, ScanInfo: info}
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

func StartStatusReporter(title string, statusChan chan SbomScanStatus, ingestC chan *kgo.Record,
	rh []kgo.RecordHeader, params utils.SbomParameters, wg *sync.WaitGroup) {

	go func() {
		log.Info().Msgf("StatusReporter(%s) started, scanid: %s", title, params.ScanId)
		defer wg.Done()

		ticker := time.NewTicker(30 * time.Second)
		InProgressStatus := NewSbomScanStatus(params, utils.SCAN_STATUS_INPROGRESS, "", nil)
	loop:
		for {
			select {
			case statusIn := <-statusChan:
				status := statusIn.ScanStatus

				if status == SBOM_GENERATED {
					break loop
				}

				err := SendScanStatus(ingestC, statusIn, rh)
				if err != nil {
					log.Error().Msgf("error sending scan status: %s, scanid: %s",
						err.Error(), params.ScanId)
				}
				if status == utils.SCAN_STATUS_SUCCESS || status == utils.SCAN_STATUS_FAILED {
					break loop
				}
			case <-ticker.C:
				err := SendScanStatus(ingestC, InProgressStatus, rh)
				if err != nil {
					log.Error().Msgf("error sending periodic In_PROGRESS scan status: %s, scanid: %s",
						err.Error(), params.ScanId)
				}
			}
		}

		log.Info().Msgf("StatusReporter(%s) exited, scanid: %s", title, params.ScanId)
	}()
}

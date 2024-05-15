package scans

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/hibiken/asynq"
)

func BulkDeleteScans(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	var err error
	var req model.BulkDeleteScansRequest

	err = json.Unmarshal(task.Payload(), &req)
	if err != nil {
		return err
	}

	log.Info().Msgf("bulk delete scans payload: %v", req)

	scanType := utils.DetectedNodeScanType[req.ScanType]
	scansList, err := reporters_scan.GetScansList(ctx, scanType, nil, req.Filters, model.FetchWindow{})
	if err != nil {
		return err
	}

	for _, s := range scansList.ScansInfo {
		log.Info().Msgf("delete scan %s %s", req.ScanType, s.ScanID)
		err = reporters_scan.DeleteScan(ctx, scanType, s.ScanID)
		if err != nil {
			log.Error().Err(err).Msgf("failed to delete scan id %s", s.ScanID)
			continue
		}
	}

	if len(scansList.ScansInfo) > 0 && (scanType == utils.NEO4JComplianceScan || scanType == utils.NEO4JCloudComplianceScan) {
		worker, err := directory.Worker(ctx)
		if err != nil {
			return err
		}
		return worker.Enqueue(utils.CachePostureProviders, []byte{}, utils.CritialTaskOpts()...)
	}

	return nil
}

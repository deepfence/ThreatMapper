package processors

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_worker/ingesters"
	"github.com/twmb/franz-go/pkg/kgo"
)

type Mappable interface {
	ToMap() map[string]interface{}
}

func Process(s *BulkProcessor, tenantID string, b []byte) error {
	s.Add(NewBulkRequest(tenantID, b))
	return nil
}

func desWrapper[T any](commit func(ctx context.Context, ns string, des []T) error) func(ctx context.Context, ns string, b [][]byte) error {
	return func(ctx context.Context, ns string, b [][]byte) error {
		ss := []T{}
		for i := range b {
			var s T
			err := json.Unmarshal(b[i], &s)
			if err != nil {
				return err
			}
			ss = append(ss, s)
		}

		return commit(ctx, ns, ss)
	}
}

func telemetryWrapper(task string, cf commitFn) commitFn {
	return func(ctx context.Context, ns string, data [][]byte) error {
		ctx, span := telemetry.NewSpan(context.Background(), "kafka-jobs", task)
		defer span.End()
		err := cf(ctx, ns, data)
		if err != nil {
			span.EndWithErr(err)
		}
		return err
	}
}

func NewKafkaProcessors(namespace string) map[string]*BulkProcessor {
	processors := map[string]*BulkProcessor{}

	processors[utils.TopicWithNamespace(utils.VulnerabilityScan, namespace)] = NewBulkProcessor(
		utils.VulnerabilityScan, namespace,
		telemetryWrapper(utils.VulnerabilityScan,
			desWrapper(ingesters.CommitFuncVulnerabilities)),
	)

	processors[utils.TopicWithNamespace(utils.ComplianceScan, namespace)] = NewBulkProcessor(
		utils.ComplianceScan, namespace,
		telemetryWrapper(utils.ComplianceScan,
			desWrapper(ingesters.CommitFuncCompliance)),
	)

	processors[utils.TopicWithNamespace(utils.CloudComplianceScan, namespace)] = NewBulkProcessor(
		utils.CloudComplianceScan, namespace,
		telemetryWrapper(utils.CloudComplianceScan,
			desWrapper(ingesters.CommitFuncCloudCompliance)),
	)

	processors[utils.TopicWithNamespace(utils.SecretScan, namespace)] = NewBulkProcessor(
		utils.SecretScan, namespace,
		telemetryWrapper(utils.SecretScan,
			desWrapper(ingesters.CommitFuncSecrets)),
	)

	processors[utils.TopicWithNamespace(utils.MalwareScan, namespace)] = NewBulkProcessor(
		utils.MalwareScan, namespace,
		telemetryWrapper(utils.MalwareScan,
			desWrapper(ingesters.CommitFuncMalware)),
	)

	processors[utils.TopicWithNamespace(utils.VulnerabilityScanStatus, namespace)] = NewBulkProcessor(
		utils.VulnerabilityScanStatus, namespace,
		telemetryWrapper(utils.VulnerabilityScanStatus,
			desWrapper(ingesters.CommitFuncStatus[ingestersUtil.VulnerabilityScanStatus](utils.NEO4JVulnerabilityScan))),
	)

	processors[utils.TopicWithNamespace(utils.ComplianceScanStatus, namespace)] = NewBulkProcessor(
		utils.ComplianceScanStatus, namespace,
		telemetryWrapper(utils.ComplianceScanStatus,
			desWrapper(ingesters.CommitFuncStatus[ingestersUtil.ComplianceScanStatus](utils.NEO4JComplianceScan))),
	)

	processors[utils.TopicWithNamespace(utils.SecretScanStatus, namespace)] = NewBulkProcessor(
		utils.SecretScanStatus, namespace,
		telemetryWrapper(utils.SecretScanStatus,
			desWrapper(ingesters.CommitFuncStatus[ingestersUtil.SecretScanStatus](utils.NEO4JSecretScan))),
	)

	processors[utils.TopicWithNamespace(utils.MalwareScanStatus, namespace)] = NewBulkProcessor(
		utils.MalwareScanStatus, namespace,
		telemetryWrapper(utils.MalwareScanStatus,
			desWrapper(ingesters.CommitFuncStatus[ingestersUtil.MalwareScanStatus](utils.NEO4JMalwareScan))),
	)

	processors[utils.TopicWithNamespace(utils.CloudComplianceScanStatus, namespace)] = NewBulkProcessor(
		utils.CloudComplianceScanStatus, namespace,
		telemetryWrapper(utils.CloudComplianceScanStatus,
			desWrapper(ingesters.CommitFuncStatus[ingestersUtil.CloudComplianceScanStatus](utils.NEO4JCloudComplianceScan))),
	)

	processors[utils.TopicWithNamespace(utils.CloudResourceRefreshStatus, namespace)] = NewBulkProcessor(
		utils.CloudResourceRefreshStatus, namespace,
		telemetryWrapper(utils.CloudResourceRefreshStatus,
			desWrapper(ingesters.CommitFuncCloudResourceRefreshStatus)),
	)

	processors[utils.TopicWithNamespace(utils.CloudResource, namespace)] = NewBulkProcessorWithSize(
		utils.CloudResource, namespace,
		telemetryWrapper(utils.CloudResource,
			desWrapper(ingesters.CommitFuncCloudResource)), 1_000)

	return processors
}

func getNamespace(rh []kgo.RecordHeader) string {
	for _, h := range rh {
		if h.Key == "namespace" {
			return string(h.Value)
		}
	}
	return ""
}

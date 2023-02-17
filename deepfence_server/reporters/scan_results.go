package reporters

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
)

func SearchHostsReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Host, error) {
	hosts, err := searchGenericDirectNodeReport[model.Host](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchContainersReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Container, error) {
	hosts, err := searchGenericDirectNodeReport[model.Container](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchContainerImagesReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.ContainerImage, error) {
	hosts, err := searchGenericDirectNodeReport[model.ContainerImage](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchVulnerabilitiesReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Vulnerability, error) {
	hosts, err := searchGenericDirectNodeReport[model.Vulnerability](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchSecretsReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Secret, error) {
	hosts, err := searchGenericDirectNodeReport[model.Secret](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchMalwaresReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Malware, error) {
	hosts, err := searchGenericDirectNodeReport[model.Malware](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchCloudCompliancesReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.CloudCompliance, error) {
	hosts, err := searchGenericDirectNodeReport[model.CloudCompliance](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchCompliancesReport(ctx context.Context, filter SearchFilter, fw model.FetchWindow) ([]model.Compliance, error) {
	hosts, err := searchGenericDirectNodeReport[model.Compliance](ctx, filter, fw)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchVulnerabilityScansReport(ctx context.Context, filter SearchScanReq) ([]model.ScanInfo, error) {
	hosts, err := searchGenericScanInfoReport(ctx, utils.NEO4J_VULNERABILITY_SCAN, filter.ScanFilter, filter.NodeFilter, filter.Window)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchSecretScansReport(ctx context.Context, filter SearchScanReq) ([]model.ScanInfo, error) {
	hosts, err := searchGenericScanInfoReport(ctx, utils.NEO4J_SECRET_SCAN, filter.ScanFilter, filter.NodeFilter, filter.Window)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchMalwareScansReport(ctx context.Context, filter SearchScanReq) ([]model.ScanInfo, error) {
	hosts, err := searchGenericScanInfoReport(ctx, utils.NEO4J_MALWARE_SCAN, filter.ScanFilter, filter.NodeFilter, filter.Window)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchComplianceScansReport(ctx context.Context, filter SearchScanReq) ([]model.ScanInfo, error) {
	hosts, err := searchGenericScanInfoReport(ctx, utils.NEO4J_COMPLIANCE_SCAN, filter.ScanFilter, filter.NodeFilter, filter.Window)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchCloudComplianceScansReport(ctx context.Context, filter SearchScanReq) ([]model.ScanInfo, error) {
	hosts, err := searchGenericScanInfoReport(ctx, utils.NEO4J_CLOUD_COMPLIANCE_SCAN, filter.ScanFilter, filter.NodeFilter, filter.Window)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

package reporters

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

func SearchHostsReport(ctx context.Context, filter SearchFilter) ([]model.Host, error) {
	hosts, err := searchGenericDirectNodeReport[model.Host](ctx, filter)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchContainersReport(ctx context.Context, filter SearchFilter) ([]model.Container, error) {
	hosts, err := searchGenericDirectNodeReport[model.Container](ctx, filter)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchContainerImagesReport(ctx context.Context, filter SearchFilter) ([]model.ContainerImage, error) {
	hosts, err := searchGenericDirectNodeReport[model.ContainerImage](ctx, filter)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchVulnerabilitiesReport(ctx context.Context, filter SearchFilter) ([]model.Vulnerability, error) {
	hosts, err := searchGenericDirectNodeReport[model.Vulnerability](ctx, filter)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchSecretsReport(ctx context.Context, filter SearchFilter) ([]model.Secret, error) {
	hosts, err := searchGenericDirectNodeReport[model.Secret](ctx, filter)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchMalwaresReport(ctx context.Context, filter SearchFilter) ([]model.Malware, error) {
	hosts, err := searchGenericDirectNodeReport[model.Malware](ctx, filter)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchCloudCompliancesReport(ctx context.Context, filter SearchFilter) ([]model.CloudCompliance, error) {
	hosts, err := searchGenericDirectNodeReport[model.CloudCompliance](ctx, filter)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

func SearchCompliancesReport(ctx context.Context, filter SearchFilter) ([]model.Compliance, error) {
	hosts, err := searchGenericDirectNodeReport[model.Compliance](ctx, filter)
	if err != nil {
		return nil, err
	}
	return hosts, nil
}

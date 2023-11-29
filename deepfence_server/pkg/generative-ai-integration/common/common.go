package common

import (
	"fmt"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

type GenerativeAiIntegrationCommon struct{}

func (g *GenerativeAiIntegrationCommon) GenerateCloudPostureQuery(request model.GenerativeAiIntegrationRequest) (string, error) {
	var query string
	if request.GetQueryType() == model.QueryTypeRemediation {
		req := request.GetFields().(model.GenerativeAiIntegrationCloudPostureRequest)
		query = fmt.Sprintf(cloudPostureRemediationQuery, GetRemediationFormat(req.RemediationFormat), req.CloudProvider, req.ComplianceCheckType, req.Title)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (g *GenerativeAiIntegrationCommon) GenerateLinuxPostureQuery(request model.GenerativeAiIntegrationRequest) (string, error) {
	var query string
	if request.GetQueryType() == model.QueryTypeRemediation {
		req := request.GetFields().(model.GenerativeAiIntegrationLinuxPostureRequest)
		query = fmt.Sprintf(linuxPostureRemediationQuery, GetRemediationFormat(req.RemediationFormat), req.ComplianceCheckType, req.TestNumber, req.Description)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (g *GenerativeAiIntegrationCommon) GenerateKubernetesPostureQuery(request model.GenerativeAiIntegrationRequest) (string, error) {
	var query string
	if request.GetQueryType() == model.QueryTypeRemediation {
		req := request.GetFields().(model.GenerativeAiIntegrationKubernetesPostureRequest)
		query = fmt.Sprintf(kubernetesPostureRemediationQuery, GetRemediationFormat(req.RemediationFormat), req.ComplianceCheckType, req.Description)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (g *GenerativeAiIntegrationCommon) GenerateVulnerabilityQuery(request model.GenerativeAiIntegrationRequest) (string, error) {
	var query string
	if request.GetQueryType() == model.QueryTypeRemediation {
		req := request.GetFields().(model.GenerativeAiIntegrationVulnerabilityRequest)
		packageName := ""
		if req.CveCausedByPackage != "" {
			packageName = "in package " + req.CveCausedByPackage
		}
		query = fmt.Sprintf(vulnerabilityRemediationQuery, GetRemediationFormat(req.RemediationFormat), req.CveID, packageName)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (g *GenerativeAiIntegrationCommon) GenerateSecretQuery(request model.GenerativeAiIntegrationRequest) (string, error) {
	var query string
	if request.GetQueryType() == model.QueryTypeRemediation {
		req := request.GetFields().(model.GenerativeAiIntegrationSecretRequest)
		query = fmt.Sprintf(secretRemediationQuery, req.Name)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

func (g *GenerativeAiIntegrationCommon) GenerateMalwareQuery(request model.GenerativeAiIntegrationRequest) (string, error) {
	var query string
	if request.GetQueryType() == model.QueryTypeRemediation {
		req := request.GetFields().(model.GenerativeAiIntegrationMalwareRequest)
		query = fmt.Sprintf(malwareRemediationQuery, req.RuleName, req.Info)
		query = strings.TrimSpace(query)
	}
	return query, nil
}

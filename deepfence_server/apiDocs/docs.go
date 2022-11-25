package apiDocs

import (
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/swaggest/openapi-go/openapi3"
	"net/http"
)

const (
	tagAuthentication = "Authentication"
	tagCommon         = "Common"
	tagCompliance     = "Compliance"
	tagTopology       = "Topology"
	tagSecretScan     = "Secret Scan"
	tagVulnerability  = "Vulnerability"
)

type UnauthorizedResponse struct {
	ID string `json:"id"`
}

type OpenApiDocs struct {
	reflector            *openapi3.Reflector
	unauthorizedResponse *UnauthorizedResponse
}

func InitializeOpenAPIReflector() *OpenApiDocs {
	// OpenAPI generation
	description := "Deepfence Runtime API provides programmatic control over Deepfence microservice securing your container, kubernetes and cloud deployments. The API abstracts away underlying infrastructure details like cloud provider, \ncontainer distros, container orchestrator and type of deployment. This is one uniform API to manage and control security alerts, policies and response to alerts for microservices running anywhere i.e. managed pure greenfield container deployments or a mix of containers, VMs and serverless paradigms like AWS Fargate."
	tos := "/tos"
	contactName := "Deepfence Support"
	contactUrl := "https://deepfence.io"
	contactEmail := "community@deepfence.io"
	licenseUrl := "https://www.apache.org/licenses/LICENSE-2.0"
	externalDocsDesc := "Deepfence Community"

	reflector := &openapi3.Reflector{
		Spec: &openapi3.Spec{
			Openapi: "3.0.3",
			Info: openapi3.Info{
				Title:          "Deepfence ThreatMapper",
				Description:    &description,
				TermsOfService: &tos,
				Contact: &openapi3.Contact{
					Name:  &contactName,
					URL:   &contactUrl,
					Email: &contactEmail,
				},
				License: &openapi3.License{
					Name: "Apache 2.0",
					URL:  &licenseUrl,
				},
				Version: "2.0.0",
			},
			ExternalDocs: &openapi3.ExternalDocumentation{
				Description: &externalDocsDesc,
				URL:         "https://community.deepfence.io",
			},
			Security: nil,
			Tags:     []openapi3.Tag{{Name: tagAuthentication}, {Name: tagCommon}, {Name: tagCompliance}, {Name: tagTopology}, {Name: tagSecretScan}, {Name: tagVulnerability}},
		},
	}

	return &OpenApiDocs{reflector: reflector, unauthorizedResponse: &UnauthorizedResponse{}}
}

func (d *OpenApiDocs) Json() ([]byte, error) {
	return d.reflector.Spec.MarshalJSON()
}

func (d *OpenApiDocs) Yaml() ([]byte, error) {
	return d.reflector.Spec.MarshalYAML()
}

func (d *OpenApiDocs) AddOperation(method string, path string, request interface{}, response interface{}) {
	operation := openapi3.Operation{}
	err := d.reflector.SetRequest(&operation, request, method)
	if err != nil {
		log.Error().Msgf("Docs SetRequest %s %s: %s", method, path, err.Error())
	}
	err = d.reflector.SetJSONResponse(&operation, response, http.StatusOK)
	if err != nil {
		log.Error().Msgf("Docs - ok response %s %s: %s", method, path, err.Error())
	}
	err = d.reflector.SetJSONResponse(&operation, d.unauthorizedResponse, http.StatusUnauthorized)
	if err != nil {
		log.Error().Msgf("Docs - unauthorized %s %s: %s", method, path, err.Error())
	}
	err = d.reflector.Spec.AddOperation(method, path, operation)
	if err != nil {
		log.Error().Msgf("Docs AddOperation %s %s: %s", method, path, err.Error())
	}
}

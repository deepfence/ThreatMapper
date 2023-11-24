package apiDocs

import (
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/swaggest/openapi-go/openapi3"
)

const (
	tagAuthentication    = "Authentication"
	tagUser              = "User"
	tagCommon            = "Common"
	tagCompliance        = "Compliance"
	tagCloudScanner      = "Cloud Scanner"
	tagKubernetesScanner = "Kubernetes Scanner"
	tagCloudResources    = "Cloud Resources"
	tagCloudNodes        = "Cloud Nodes"
	tagTopology          = "Topology"
	tagLookup            = "Lookup"
	tagSearch            = "Search"
	tagThreat            = "Threat"
	tagScanResults       = "Scan Results"
	tagSecretScan        = "Secret Scan"
	tagVulnerability     = "Vulnerability"
	tagMalwareScan       = "Malware Scan"
	tagControls          = "Controls"
	tagDiagnosis         = "Diagnosis"
	tagRegistry          = "Registry"
	tagInternal          = "Internal"
	tagIntegration       = "Integration"
	tagGenerativeAi      = "Generative AI"
	tagReports           = "Reports"
	tagSettings          = "Settings"
	tagDiffAdd           = "Diff Add"
	tagCompletion        = "Completion"

	securityName = "bearer_token"
)

var (
	bearerToken = []map[string][]string{{securityName: {}}}
)

type FailureResponse struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message"`
}

type BadRequestResponse struct {
	Success     bool               `json:"success" example:"false"`
	Message     string             `json:"message"`
	ErrorFields *map[string]string `json:"error_fields"`
	ErrorIndex  *map[string][]int  `json:"error_index"`
}

type OpenApiDocs struct {
	reflector          *openapi3.Reflector
	badRequestResponse *BadRequestResponse
	failureResponse    *FailureResponse
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
			Tags:     []openapi3.Tag{{Name: tagAuthentication}, {Name: tagCommon}, {Name: tagCompliance}, {Name: tagTopology}, {Name: tagSecretScan}, {Name: tagMalwareScan}, {Name: tagVulnerability}},
		},
	}

	reflector.
		SpecEns().
		ComponentsEns().
		SecuritySchemesEns().
		WithMapOfSecuritySchemeOrRefValuesItem(
			securityName,
			openapi3.SecuritySchemeOrRef{
				SecurityScheme: &openapi3.SecurityScheme{
					HTTPSecurityScheme: (&openapi3.HTTPSecurityScheme{}).
						WithScheme("bearer").
						WithBearerFormat("JWT").
						WithDescription("RW Access"),
				},
			},
		)

	return &OpenApiDocs{reflector: reflector, failureResponse: &FailureResponse{Success: false}, badRequestResponse: &BadRequestResponse{Success: false}}
}

func (d *OpenApiDocs) Json() ([]byte, error) {
	return d.reflector.Spec.MarshalJSON()
}

func (d *OpenApiDocs) Yaml() ([]byte, error) {
	return d.reflector.Spec.MarshalYAML()
}

func (d *OpenApiDocs) AddOperation(id, method, path, summary, description string, successStatusCode int, tags []string,
	security []map[string][]string, request interface{}, response interface{}) {
	operation := openapi3.Operation{
		Tags:        tags,
		Summary:     &summary,
		Description: &description,
		ID:          &id,
		Security:    security,
	}
	err := d.reflector.SetRequest(&operation, request, method)
	if err != nil {
		log.Error().Msgf("Docs SetRequest %s %s: %s", method, path, err.Error())
	}
	err = d.reflector.SetJSONResponse(&operation, response, successStatusCode)
	if err != nil {
		log.Error().Msgf("Docs - ok response %s %s: %s", method, path, err.Error())
	}
	d.addResponses(&operation, method, path)
	err = d.reflector.Spec.AddOperation(method, path, operation)
	if err != nil {
		log.Error().Msgf("Docs AddOperation %s %s: %s", method, path, err.Error())
	}
}

func (d *OpenApiDocs) addResponses(operation *openapi3.Operation, method, path string) {
	err := d.reflector.SetupResponse(openapi3.OperationContext{Operation: operation, HTTPStatus: http.StatusUnauthorized})
	if err != nil {
		log.Error().Msgf("Docs - unauthorized %s %s: %s", method, path, err.Error())
	}
	err = d.reflector.SetupResponse(openapi3.OperationContext{Operation: operation, HTTPStatus: http.StatusForbidden})
	if err != nil {
		log.Error().Msgf("Docs - forbidden %s %s: %s", method, path, err.Error())
	}
	err = d.reflector.SetJSONResponse(operation, d.badRequestResponse, http.StatusBadRequest)
	if err != nil {
		log.Error().Msgf("Docs - bad request %s %s: %s", method, path, err.Error())
	}
	err = d.reflector.SetJSONResponse(operation, d.failureResponse, http.StatusInternalServerError)
	if err != nil {
		log.Error().Msgf("Docs - internal server error %s %s: %s", method, path, err.Error())
	}
	err = d.reflector.SetJSONResponse(operation, d.failureResponse, http.StatusNotFound)
	if err != nil {
		log.Error().Msgf("Docs - not found %s %s: %s", method, path, err.Error())
	}
}

func (d *OpenApiDocs) AddNonJsonOperation(id, method, path, summary, description string, successStatusCode int, tags []string,
	security []map[string][]string, request interface{}, respContentType string) {
	operation := openapi3.Operation{
		Tags:        tags,
		Summary:     &summary,
		Description: &description,
		ID:          &id,
		Security:    security,
	}
	err := d.reflector.SetRequest(&operation, request, method)
	if err != nil {
		log.Error().Msgf("Docs SetRequest %s %s: %s", method, path, err.Error())
	}
	err = d.reflector.SetupResponse(openapi3.OperationContext{Operation: &operation, HTTPStatus: successStatusCode, RespContentType: respContentType})
	if err != nil {
		log.Error().Msgf("Docs - ok response %s %s: %s", method, path, err.Error())
	}
	d.addResponses(&operation, method, path)
	err = d.reflector.Spec.AddOperation(method, path, operation)
	if err != nil {
		log.Error().Msgf("Docs AddOperation %s %s: %s", method, path, err.Error())
	}
}

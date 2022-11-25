package apiDocs

import "github.com/swaggest/openapi-go/openapi3"

func NewOpenAPIReflector() *openapi3.Reflector {
	// OpenAPI generation
	description := "Deepfence ThreatMapper API Documentation"
	openAPI := &openapi3.Reflector{
		Spec: &openapi3.Spec{
			Openapi: "3.0.3",
			Info: openapi3.Info{
				Title:          "Deepfence ThreatMapper",
				Description:    &description,
				TermsOfService: nil,
				Contact:        nil,
				License:        nil,
				Version:        "2.0.0",
			},
			ExternalDocs:  nil,
			Servers:       nil,
			Security:      nil,
			Tags:          nil,
			Paths:         openapi3.Paths{},
			Components:    nil,
			MapOfAnything: nil,
		},
	}
	return openAPI
}

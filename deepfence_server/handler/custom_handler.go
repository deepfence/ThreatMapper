package handler

import (
	"github.com/casbin/casbin/v2"
	"github.com/deepfence/ThreatMapper/deepfence_server/apiDocs"
	consolediagnosis "github.com/deepfence/ThreatMapper/deepfence_server/diagnosis/console-diagnosis"
	"github.com/go-chi/jwtauth/v5"
	ut "github.com/go-playground/universal-translator"
	"github.com/go-playground/validator/v10"
	"github.com/twmb/franz-go/pkg/kgo"
)

type Handler struct {
	TokenAuth        *jwtauth.JWTAuth
	AuthEnforcer     *casbin.Enforcer
	OpenApiDocs      *apiDocs.OpenApiDocs
	SaasDeployment   bool
	Validator        *validator.Validate
	Translator       ut.Translator
	IngestChan       chan *kgo.Record
	ConsoleDiagnosis consolediagnosis.ConsoleDiagnosisHandler
}

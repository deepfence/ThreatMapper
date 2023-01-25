package handler

import (
	"github.com/ThreeDotsLabs/watermill-kafka/v2/pkg/kafka"
	"github.com/casbin/casbin/v2"
	"github.com/deepfence/ThreatMapper/deepfence_server/apiDocs"
	"github.com/go-chi/jwtauth/v5"
	"github.com/go-playground/validator/v10"
	"github.com/twmb/franz-go/pkg/kgo"
)

type Handler struct {
	TokenAuth      *jwtauth.JWTAuth // TODO: move to global postgres / customer postgres
	AuthEnforcer   *casbin.Enforcer
	OpenApiDocs    *apiDocs.OpenApiDocs
	SaasDeployment bool
	Validator      *validator.Validate
	IngestChan     chan *kgo.Record
	TasksPublisher *kafka.Publisher
}

package handler

import (
	"github.com/casbin/casbin/v2"
	"github.com/go-chi/jwtauth/v5"
	"github.com/swaggest/openapi-go/openapi3"
)

type Handler struct {
	TokenAuth    *jwtauth.JWTAuth
	AuthEnforcer *casbin.Enforcer
	OpenAPI      *openapi3.Reflector
}

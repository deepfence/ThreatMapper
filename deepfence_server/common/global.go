package common

import (
	"github.com/casbin/casbin/v2"
	"github.com/go-chi/jwtauth/v5"
	"github.com/swaggest/openapi-go/openapi3"
)

var (
	TokenAuth      *jwtauth.JWTAuth
	CasbinEnforcer *casbin.Enforcer
	OpenAPI        *openapi3.Reflector
)

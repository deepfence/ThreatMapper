package authorization

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/common"
	"github.com/go-chi/jwtauth/v5"
	"github.com/go-chi/render"
	"net/http"
)

func CasbinHandler(resource, permission string, h http.HandlerFunc) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		_, claims, err := jwtauth.FromContext(r.Context())
		if err != nil {
			render.Status(r, http.StatusInternalServerError)
			return
		}
		enforce, err := common.CasbinEnforcer.Enforce([]interface{}{claims["role"].(string), resource, permission}...)
		if err != nil {
			render.Status(r, http.StatusInternalServerError)
			return
		}
		if enforce {
			h(w, r)
		} else {
			render.Status(r, http.StatusUnauthorized)
			return
		}
	}
}

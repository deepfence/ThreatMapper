package handler

import (
	"net/http"

	"github.com/go-chi/jwtauth/v5"
)

func (h *Handler) AuthHandler(resource, permission string, handlerFunc http.HandlerFunc) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		_, claims, err := jwtauth.FromContext(r.Context())
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		enforce, err := h.AuthEnforcer.Enforce([]interface{}{claims["role"].(string), resource, permission}...)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		if enforce {
			handlerFunc(w, r)
		} else {
			w.WriteHeader(http.StatusForbidden)
			return
		}
	}
}

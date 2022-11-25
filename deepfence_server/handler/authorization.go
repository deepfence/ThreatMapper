package handler

import (
	"github.com/go-chi/jwtauth/v5"
	"github.com/go-chi/render"
	"net/http"
)

func (h *Handler) AuthHandler(resource, permission string, handlerFunc http.HandlerFunc) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		_, claims, err := jwtauth.FromContext(r.Context())
		if err != nil {
			render.Status(r, http.StatusInternalServerError)
			return
		}
		enforce, err := h.AuthEnforcer.Enforce([]interface{}{claims["role"].(string), resource, permission}...)
		if err != nil {
			render.Status(r, http.StatusInternalServerError)
			return
		}
		if enforce {
			handlerFunc(w, r)
		} else {
			render.Status(r, http.StatusUnauthorized)
			return
		}
	}
}

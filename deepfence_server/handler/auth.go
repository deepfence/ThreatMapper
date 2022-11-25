package handler

import (
	"net/http"
)

func (h *Handler) LoginHandler(w http.ResponseWriter, r *http.Request) {
	_, _, _ = h.TokenAuth.Encode(map[string]interface{}{})
	return
}

func (h *Handler) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	return
}

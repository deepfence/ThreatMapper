package handler

import (
	"context"
	"fmt"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/opentracing/opentracing-go"
	"github.com/ugorji/go/codec"
)

const (
	RevokedAccessTokenIdPrefix = "Revoked-AccessTokenID-"
	UserInviteSendEmail        = "send-invite-email"
	UserInviteGetLink          = "get-invite-link"
)

type InviteUserRequest struct {
	Email  string `json:"email" validate:"required,email" required:"true"`
	Role   string `json:"role" validate:"required,oneof=admin standard-user read-only-user" required:"true" enum:"admin,standard-user,read-only-user"`
	Action string `json:"action" validate:"required,oneof=send-invite-email get-invite-link" required:"true" enum:"send-invite-email,get-invite-link"`
}

type InviteUserResponse struct {
	InviteExpiryHours int32  `json:"invite_expiry_hours"`
	InviteURL         string `json:"invite_url"`
}

func (h *Handler) Ping(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "pong")
}

func (h *Handler) OpenApiDocsHandler(w http.ResponseWriter, r *http.Request) {
	apiDocs, err := h.OpenApiDocs.Json()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	httpext.JSONBytes(w, http.StatusOK, apiDocs)
}

func respondWith(ctx context.Context, w http.ResponseWriter, code int, response interface{}) {
	if err, ok := response.(error); ok {
		log.Error().Msgf("Error %d: %v", code, err)
		response = err.Error()
	} else if 500 <= code && code < 600 {
		log.Error().Msgf("Non-error %d: %v", code, response)
	} else if ctx.Err() != nil {
		log.Debug().Msgf("Context error %v", ctx.Err())
		code = 499
		response = nil
	}
	if span := opentracing.SpanFromContext(ctx); span != nil {
		span.LogKV("response-code", code)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Cache-Control", "no-cache")
	w.WriteHeader(code)
	encoder := codec.NewEncoder(w, &codec.JsonHandle{})
	if err := encoder.Encode(response); err != nil {
		log.Error().Msgf("Error encoding response: %v", err)
	}
}

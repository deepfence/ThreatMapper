package handler

import (
	"context"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/opentracing/opentracing-go"
	"github.com/ugorji/go/codec"
)

const (
	RevokedAccessTokenIdPrefix = "Revoked-AccessTokenID-"
	UserInviteSendEmail        = "send-invite-email"
	UserInviteGetLink          = "get-invite-link"
)

func (h *Handler) Ping(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("pong"))
}

func (h *Handler) EULAHandler(w http.ResponseWriter, r *http.Request) {
	httpext.JSON(w, http.StatusOK, model.EULAResponse)
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
		if code != 503 {
			log.Error().Msgf("Non-error %d: %v", code, response)
		}
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

type BadDecoding struct {
	err error
}

func (bd *BadDecoding) Error() string {
	return bd.err.Error()
}

type InternalServerError struct {
	err error
}

func (i *InternalServerError) Error() string {
	return i.err.Error()
}

type ValidatorError struct {
	err                       error
	skipOverwriteErrorMessage bool
}

func (bd *ValidatorError) Error() string {
	return bd.err.Error()
}

type ForbiddenError struct {
	err error
}

func (bd *ForbiddenError) Error() string {
	return bd.err.Error()
}

type NotFoundError struct {
	err error
}

func (bd *NotFoundError) Error() string {
	return bd.err.Error()
}

func respondWithErrorCode(err error, w http.ResponseWriter, code int) error {
	var errorFields map[string]string
	if code == http.StatusBadRequest {
		errorFields = model.ParseValidatorError(err.Error(), false)
	}
	if len(errorFields) > 0 {
		return httpext.JSON(w, code, model.ErrorResponse{Message: "", ErrorFields: errorFields})
	} else {
		return httpext.JSON(w, code, model.ErrorResponse{Message: err.Error(), ErrorFields: errorFields})
	}
}

func respondError(err error, w http.ResponseWriter) error {
	var code int
	var errorFields map[string]string
	switch err.(type) {
	case *reporters_scan.NodeNotFoundError:
		code = http.StatusNotFound
	case *ingesters.NodeNotFoundError:
		code = http.StatusNotFound
	case *ingesters.AlreadyRunningScanError:
		code = http.StatusConflict
	case *BadDecoding:
		code = http.StatusBadRequest
	case *ValidatorError:
		code = http.StatusBadRequest
		errorFields = model.ParseValidatorError(err.Error(), err.(*ValidatorError).skipOverwriteErrorMessage)
	case *ForbiddenError:
		code = http.StatusForbidden
	case *NotFoundError:
		code = http.StatusNotFound
	default:
		code = http.StatusInternalServerError
	}

	if len(errorFields) > 0 {
		return httpext.JSON(w, code, model.ErrorResponse{Message: "", ErrorFields: errorFields})
	} else {
		return httpext.JSON(w, code, model.ErrorResponse{Message: err.Error(), ErrorFields: errorFields})
	}
}

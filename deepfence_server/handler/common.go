package handler

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	reporters_scan "github.com/deepfence/ThreatMapper/deepfence_server/reporters/scan"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/db"
	"github.com/opentracing/opentracing-go"
	"github.com/ugorji/go/codec"
)

const (
	RevokedAccessTokenIDPrefix = "Revoked-AccessTokenID-"
	UserInviteSendEmail        = "send-invite-email"
	UserInviteGetLink          = "get-invite-link"
)

func (h *Handler) Ping(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("pong"))
}

func (h *Handler) EULAHandler(w http.ResponseWriter, r *http.Request) {
	err := httpext.JSON(w, http.StatusOK, model.EULAResponse)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) OpenAPIDocsHandler(w http.ResponseWriter, r *http.Request) {
	apiDocs, err := h.OpenAPIDocs.JSON()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	err = httpext.JSONBytes(w, http.StatusOK, apiDocs)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func respondWith(ctx context.Context, w http.ResponseWriter, code int, response interface{}) {
	if err, ok := response.(error); ok {
		switch response.(type) {
		case *neo4j.ConnectivityError:
			code = http.StatusServiceUnavailable
		default:
		}
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
	errorIndex                map[string][]int
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

func isTransientError(err error) bool {
	// Check if the error is a deadlock error
	if neoErr, ok := err.(*db.Neo4jError); ok {
		return strings.HasPrefix(neoErr.Code, "Neo.TransientError")
	}
	return false
}

func (h *Handler) respondWithErrorCode(err error, w http.ResponseWriter, code int) {
	var errorFields map[string]string
	var errMsg string
	if code == http.StatusBadRequest {
		errorFields, errMsg = h.ParseValidatorError(err, false)
	} else {
		errMsg = err.Error()
	}
	if len(errorFields) > 0 {
		err = httpext.JSON(w, code, model.ErrorResponse{Message: "", ErrorFields: errorFields})
	} else {
		err = httpext.JSON(w, code, model.ErrorResponse{Message: errMsg, ErrorFields: errorFields})
	}
	if err != nil {
		log.Error().Msg(err.Error())
		w.WriteHeader(http.StatusInternalServerError)
	}
}

func (h *Handler) respondError(err error, w http.ResponseWriter) {
	code := http.StatusInternalServerError
	var errorFields map[string]string
	errMsg := err.Error()

	// array index for the error field
	var errorIndex map[string][]int
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
		var validatorError *ValidatorError
		errors.As(err, &validatorError)
		errorFields, errMsg = h.ParseValidatorError(validatorError.err, validatorError.skipOverwriteErrorMessage)
		errorIndex = validatorError.errorIndex
	case *ForbiddenError:
		code = http.StatusForbidden
	case *NotFoundError:
		code = http.StatusNotFound
	case *neo4j.ConnectivityError:
		code = http.StatusServiceUnavailable
	case *neo4j.Neo4jError:
		if isTransientError(err) {
			code = http.StatusConflict
		}
	}

	if len(errorFields) > 0 {
		err = httpext.JSON(w, code, model.ErrorResponse{Message: "", ErrorFields: errorFields, ErrorIndex: errorIndex})
	} else {
		err = httpext.JSON(w, code, model.ErrorResponse{Message: errMsg, ErrorFields: errorFields, ErrorIndex: errorIndex})
	}
	if err != nil {
		log.Error().Msg(err.Error())
		w.WriteHeader(http.StatusInternalServerError)
	}
}

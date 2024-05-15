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
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/db"
	"github.com/ugorji/go/codec"
)

const (
	RevokedAccessTokenIDPrefix = "Revoked-AccessTokenID-"
	UserInviteSendEmail        = "send-invite-email"
	UserInviteGetLink          = "get-invite-link"
)

const (
	port80  = ":80"
	port443 = ":443"
)

// GetHostURL Host specifies the host on which the URL is sought.
// This is either the value of the "Host" header or the host name given in the URL itself
func (h *Handler) GetHostURL(r *http.Request) string {
	host := r.Host
	if strings.HasSuffix(host, port443) {
		return strings.TrimSuffix(host, port443)
	} else if strings.HasSuffix(host, port80) {
		return strings.TrimSuffix(host, port80)
	}
	return host
}

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

	ctx, span := telemetry.NewSpan(ctx, "common", "respond-with")
	defer span.End()

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

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Cache-Control", "no-cache")
	w.WriteHeader(code)
	encoder := codec.NewEncoder(w, &codec.JsonHandle{})
	if err := encoder.Encode(response); err != nil {
		log.Error().Msgf("Error encoding response: %v", err)
	}
}

type PaymentRequired struct {
	err error
}

func (p *PaymentRequired) Error() string {
	return p.err.Error()
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
	errs                      []error
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
		errorFields, errMsg = h.ParseValidatorError(err, nil, false)
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
	case *ingesters.NodeNotActiveError:
		code = http.StatusBadRequest
	case *ingesters.AgentNotInstalledError:
		code = http.StatusBadRequest
	case *ingesters.AlreadyRunningScanError:
		code = http.StatusConflict
	case *BadDecoding:
		code = http.StatusBadRequest
	case *PaymentRequired:
		code = http.StatusPaymentRequired
	case *ValidatorError:
		code = http.StatusBadRequest
		var validatorError *ValidatorError
		errors.As(err, &validatorError)
		errorFields, errMsg = h.ParseValidatorError(validatorError.err, validatorError.errs, validatorError.skipOverwriteErrorMessage)
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

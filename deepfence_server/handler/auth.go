package handler

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/google/uuid"
	"net/http"
)

func (h *Handler) ApiAuthHandler(w http.ResponseWriter, r *http.Request) {
	var apiAuthRequest model.ApiAuthRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &apiAuthRequest)
	if err != nil {
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}
	err = h.Validator.Struct(apiAuthRequest)
	if err != nil {
		errorFields := model.ParseValidatorError(err.Error())
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false, ErrorFields: &errorFields})
		return
	}
	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	parsedUUID, _ := uuid.Parse(apiAuthRequest.ApiToken)
	apiToken := &model.ApiToken{ApiToken: parsedUUID}
	user, err := apiToken.GetUser(ctx, pgClient)
	accessTokenResponse, err := user.GetAccessToken(h.TokenAuth, model.GrantTypeAPIToken)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	httpext.JSON(w, http.StatusOK, model.Response{Success: true, Data: accessTokenResponse})
}

func (h *Handler) LoginHandler(w http.ResponseWriter, r *http.Request) {
	var loginRequest model.LoginRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &loginRequest)
	if err != nil {
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}
	err = h.Validator.Struct(loginRequest)
	if err != nil {
		errorFields := model.ParseValidatorError(err.Error())
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false, ErrorFields: &errorFields})
		return
	}
	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	u := model.User{Email: loginRequest.Email}
	err = u.LoadFromDbByEmail(ctx, pgClient)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	passwordValid, err := u.CompareHashAndPassword(ctx, pgClient, loginRequest.Password)
	if err != nil || !passwordValid {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	accessTokenResponse, err := u.GetAccessToken(h.TokenAuth, model.GrantTypePassword)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	httpext.JSON(w, http.StatusOK, model.Response{Success: true, Data: accessTokenResponse})
}

func (h *Handler) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	return
}

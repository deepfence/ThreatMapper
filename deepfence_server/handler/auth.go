package handler

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/go-chi/jwtauth/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

func (h *Handler) ApiAuthHandler(w http.ResponseWriter, r *http.Request) {
	var apiAuthRequest model.ApiAuthRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &apiAuthRequest)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(apiAuthRequest)
	if err != nil {
		respondError(&ValidatorError{err: err}, w)
		return
	}
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(err, w)
		return
	}
	parsedUUID, _ := uuid.Parse(apiAuthRequest.ApiToken)
	apiToken := &model.ApiToken{ApiToken: parsedUUID}
	user, err := apiToken.GetUser(ctx, pgClient)
	if err != nil {
		respondError(err, w)
		return
	}
	accessTokenResponse, err := user.GetAccessToken(h.TokenAuth, model.GrantTypeAPIToken)
	if err != nil {
		respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EVENT_AUTH, ACTION_TOKEN_AUTH, apiAuthRequest, true)

	httpext.JSON(w, http.StatusOK, accessTokenResponse)
}

func (h *Handler) RefreshTokenHandler(w http.ResponseWriter, r *http.Request) {
	user, grantType, err := h.parseRefreshToken(r.Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			respondError(&NotFoundError{err}, w)
		} else {
			respondError(err, w)
		}
		return
	}
	accessTokenResponse, err := user.GetAccessToken(h.TokenAuth, grantType)
	if err != nil {
		respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, accessTokenResponse)
}

func (h *Handler) parseRefreshToken(requestContext context.Context) (*model.User, string, error) {
	_, claims, err := jwtauth.FromContext(requestContext)
	if err != nil {
		return nil, "", err
	}
	tokenType, err := utils.GetStringValueFromInterfaceMap(claims, "type")
	if err != nil {
		return nil, "", err
	}
	if tokenType != "refresh_token" {
		return nil, "", errors.New("cannot parse refresh token")
	}
	accessTokenID, err := utils.GetStringValueFromInterfaceMap(claims, "token_id")
	if err != nil {
		return nil, "", err
	}
	revoked, err := IsAccessTokenRevoked(requestContext, accessTokenID)
	if err != nil {
		return nil, "", err
	}
	if revoked == true {
		return nil, "", &ForbiddenError{errors.New("access token is revoked")}
	}
	userId, err := utils.GetInt64ValueFromInterfaceMap(claims, "user")
	if err != nil {
		return nil, "", err
	}
	user, _, _, _, err := model.GetUserByID(userId)
	if err != nil {
		return nil, "", err
	}
	if user.IsActive == false {
		return nil, "", &ForbiddenError{errors.New("user is not active")}
	}
	grantType, err := utils.GetStringValueFromInterfaceMap(claims, "grant_type")
	if err != nil {
		return nil, "", err
	}
	return user, grantType, nil
}

func (h *Handler) LoginHandler(w http.ResponseWriter, r *http.Request) {
	var loginRequest model.LoginRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &loginRequest)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(loginRequest)
	if err != nil {
		respondError(&ValidatorError{err: err}, w)
		return
	}
	u, statusCode, ctx, pgClient, err := model.GetUserByEmail(strings.ToLower(loginRequest.Email))
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	if u.IsActive == false {
		respondError(&ForbiddenError{errors.New("user is not active")}, w)
		return
	}
	passwordValid, err := u.CompareHashAndPassword(ctx, pgClient, loginRequest.Password)
	if err != nil || !passwordValid {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	accessTokenResponse, err := u.GetAccessToken(h.TokenAuth, model.GrantTypePassword)
	if err != nil {
		respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EVENT_AUTH, ACTION_LOGIN, u, true)

	httpext.JSON(w, http.StatusOK, model.LoginResponse{
		ResponseAccessToken: *accessTokenResponse,
		OnboardingRequired:  model.IsOnboardingRequired(ctx),
		PasswordInvalidated: u.PasswordInvalidated,
	})
}

func (h *Handler) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	err := LogoutHandler(r.Context())
	if err != nil {
		respondError(err, w)
		return
	}
	h.AuditUserActivity(r, EVENT_AUTH, ACTION_LOGOUT, nil, true)
	w.WriteHeader(http.StatusNoContent)
}

func IsAccessTokenRevoked(ctx context.Context, accessTokenID string) (bool, error) {
	redisClient, err := directory.RedisClient(ctx)
	if err != nil {
		return false, err
	}
	val, err := redisClient.Get(ctx, RevokedAccessTokenIdPrefix+accessTokenID).Bool()
	if err == redis.Nil {
		return false, nil
	} else if err != nil {
		return false, err
	}
	return val, nil
}

func RevokeAccessToken(ctx context.Context, accessTokenID string) error {
	redisClient, err := directory.RedisClient(ctx)
	if err != nil {
		return err
	}
	return redisClient.Set(ctx, RevokedAccessTokenIdPrefix+accessTokenID, true, model.RefreshTokenExpiry).Err()
}

func LogoutHandler(requestContext context.Context) error {
	_, claims, err := jwtauth.FromContext(requestContext)
	if err != nil {
		return err
	}
	accessTokenID, err := utils.GetStringValueFromInterfaceMap(claims, "id")
	if err != nil {
		return err
	}
	return RevokeAccessToken(requestContext, accessTokenID)
}

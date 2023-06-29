package handler

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/jwtauth/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

var (
	parseRefreshTokenError  = errors.New("cannot parse refresh token")
	accessTokenRevokedError = ForbiddenError{errors.New("access token is revoked")}
	userInactiveError       = ForbiddenError{errors.New("user is not active")}
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
	tokenSplit := strings.Split(apiAuthRequest.ApiToken, "|")
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(tokenSplit[0]))
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(err, w)
		return
	}
	parsedUUID, err := uuid.Parse(tokenSplit[1])
	if err != nil {
		respondError(err, w)
		return
	}
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

	user.Password = ""
	h.AuditUserActivity(r, EVENT_AUTH, ACTION_TOKEN_AUTH, user, true)

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
		return nil, "", parseRefreshTokenError
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
		return nil, "", &accessTokenRevokedError
	}
	userId, err := utils.GetInt64ValueFromInterfaceMap(claims, "user")
	if err != nil {
		return nil, "", err
	}
	user, _, _, err := model.GetUserByID(requestContext, userId)
	if err != nil {
		return nil, "", err
	}
	if user.IsActive == false {
		return nil, "", &userInactiveError
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
	loginRequest.Email = strings.ToLower(loginRequest.Email)
	ctx := directory.NewContextWithNameSpace(directory.FetchNamespace(loginRequest.Email))
	u, statusCode, pgClient, err := model.GetUserByEmail(ctx, loginRequest.Email)
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	if u.IsActive == false {
		respondError(&userInactiveError, w)
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

	u.Password = ""
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

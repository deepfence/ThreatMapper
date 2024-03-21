package handler

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/jwtauth/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
)

var (
	errParseRefreshToken  = errors.New("cannot parse refresh token")
	errAccessTokenRevoked = ForbiddenError{errors.New("access token is revoked")}
	errUserInactive       = ValidatorError{
		err:                       errors.New("email:user is not active"),
		skipOverwriteErrorMessage: true,
	}
	errNoUserRegistered = NotFoundError{errors.New("you have not registered, please register first")}
)

func (h *Handler) APIAuthHandler(w http.ResponseWriter, r *http.Request) {
	var apiAuthRequest model.APIAuthRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &apiAuthRequest)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	apiAuthRequest.APIToken, _ = utils.Base64RawDecode(apiAuthRequest.APIToken)
	err = h.Validator.Struct(apiAuthRequest)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	tokenSplit := strings.Split(apiAuthRequest.APIToken, ":")
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(tokenSplit[0]))

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}
	parsedUUID, err := uuid.Parse(tokenSplit[1])
	if err != nil {
		h.respondError(err, w)
		return
	}
	apiToken := &model.APIToken{APIToken: parsedUUID}
	user, err := apiToken.GetUser(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}
	// licenseActive - not needed in this api
	accessTokenResponse, err := user.GetAccessToken(h.TokenAuth, model.GrantTypeAPIToken, false)
	if err != nil {
		h.respondError(err, w)
		return
	}

	user.Password = ""
	// h.AuditUserActivity(r, EventAuth, ActionTokenAuth, user, true)

	err = httpext.JSON(w, http.StatusOK, accessTokenResponse)
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) RefreshTokenHandler(w http.ResponseWriter, r *http.Request) {
	user, grantType, err := h.parseRefreshToken(r.Context())
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			h.respondError(&NotFoundError{err}, w)
		} else {
			h.respondError(err, w)
		}
		return
	}

	licenseActive := false
	if grantType == model.GrantTypePassword {
		pgClient, err := directory.PostgresClient(r.Context())
		if err == nil {
			license, err := model.GetLicense(r.Context(), pgClient)
			if err == nil {
				licenseActive = license.IsActive
			}
		}
	}

	accessTokenResponse, err := user.GetAccessToken(h.TokenAuth, grantType, licenseActive)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = httpext.JSON(w, http.StatusOK, accessTokenResponse)
	if err != nil {
		log.Error().Msg(err.Error())
	}
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
		return nil, "", errParseRefreshToken
	}
	accessTokenID, err := utils.GetStringValueFromInterfaceMap(claims, "token_id")
	if err != nil {
		return nil, "", err
	}
	revoked, err := IsAccessTokenRevoked(requestContext, accessTokenID)
	if err != nil {
		return nil, "", err
	}
	if revoked {
		return nil, "", &errAccessTokenRevoked
	}
	userID, err := utils.GetInt64ValueFromInterfaceMap(claims, "user")
	if err != nil {
		return nil, "", err
	}
	user, _, _, err := model.GetUserByID(requestContext, userID)
	if err != nil {
		return nil, "", err
	}
	if !user.IsActive {
		return nil, "", &errUserInactive
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
		h.respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(loginRequest)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	loginRequest.Email = strings.ToLower(loginRequest.Email)
	ctx := directory.NewContextWithNameSpace(directory.FetchNamespace(loginRequest.Email))

	ctx, span := otel.GetTracerProvider().Tracer("user").Start(ctx, "login")
	defer span.End()

	// if it is a fresh setup, there won't be any users in the system
	freshSetup, err := model.IsFreshSetup(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}
	if freshSetup {
		h.respondError(&errNoUserRegistered, w)
		return
	}
	u, statusCode, pgClient, err := model.GetUserByEmail(ctx, loginRequest.Email)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	if !u.IsActive {
		h.respondError(&errUserInactive, w)
		return
	}
	passwordValid, err := u.CompareHashAndPassword(ctx, pgClient, loginRequest.Password)
	if err != nil || !passwordValid {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	licenseActive := false
	licenseRegistered := false
	var licenseKey string
	var licenseEmailDomain string
	license, err := model.GetLicense(ctx, pgClient)
	if err == nil {
		licenseRegistered = true
		licenseActive = license.IsActive
		licenseKey = license.LicenseKey
		licenseEmailDomain = license.LicenseEmailDomain
	}

	accessTokenResponse, err := u.GetAccessToken(h.TokenAuth, model.GrantTypePassword, licenseActive)
	if err != nil {
		h.respondError(err, w)
		return
	}

	u.Password = ""
	h.AuditUserActivity(r, EventAuth, ActionLogin, u, true)

	err = httpext.JSON(w, http.StatusOK, model.LoginResponse{
		ResponseAccessToken: *accessTokenResponse,
		OnboardingRequired:  model.IsOnboardingRequired(ctx),
		PasswordInvalidated: u.PasswordInvalidated,
		LicenseRegistered:   licenseRegistered,
		LicenseKey:          licenseKey,
		EmailDomain:         licenseEmailDomain,
	})
	if err != nil {
		log.Error().Msg(err.Error())
	}
}

func (h *Handler) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	err := LogoutHandler(r.Context())
	if err != nil {
		h.respondError(err, w)
		return
	}
	h.AuditUserActivity(r, EventAuth, ActionLogout, nil, true)
	w.WriteHeader(http.StatusNoContent)
}

func IsAccessTokenRevoked(ctx context.Context, accessTokenID string) (bool, error) {
	redisClient, err := directory.RedisClient(ctx)
	if err != nil {
		return false, err
	}
	val, err := redisClient.Get(ctx, RevokedAccessTokenIDPrefix+accessTokenID).Bool()
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
	return redisClient.Set(ctx, RevokedAccessTokenIDPrefix+accessTokenID, true, model.RefreshTokenExpiry).Err()
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

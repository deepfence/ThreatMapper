package handler

import (
	"context"
	"database/sql"
	"errors"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/integrations/email"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/jwtauth/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"net/http"
)

const (
	MaxPostRequestSize = 100000 // 100 KB
	DefaultNamespace   = "default"
)

func (h *Handler) RegisterUser(w http.ResponseWriter, r *http.Request) {
	var registerRequest model.UserRegisterRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &registerRequest)
	if err != nil {
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}
	err = h.Validator.Struct(registerRequest)
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
	consoleUrl, err := utils.RemoveURLPath(registerRequest.ConsoleURL)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	consoleUrlSetting := model.Setting{
		Key: model.ConsoleURLSettingKey,
		Value: &model.SettingValue{
			Label:       "Deepfence Console URL",
			Value:       consoleUrl,
			Description: "Deepfence Console URL used for sending emails with links to the console",
		},
		IsVisibleOnUi: true,
	}
	_, err = consoleUrlSetting.Create(ctx, pgClient)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	companies, err := pgClient.CountCompanies(ctx)
	if err != nil || companies > 0 {
		httpext.JSON(w, http.StatusForbidden, model.Response{Success: false, Message: "Cannot register. Please contact your administrator for an invite"})
		return
	}
	emailDomain, _ := utils.GetEmailDomain(registerRequest.Email)
	c := model.Company{
		Name:        registerRequest.Company,
		EmailDomain: emailDomain,
		Namespace:   DefaultNamespace, //TODO: SaaS namespace
	}
	company, err := c.Create(ctx, pgClient)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	c.ID = company.ID
	role, err := pgClient.GetRoleByName(ctx, model.AdminRole)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	user := model.User{
		FirstName:           registerRequest.FirstName,
		LastName:            registerRequest.LastName,
		Email:               registerRequest.Email,
		Company:             registerRequest.Company,
		CompanyID:           company.ID,
		IsActive:            true,
		Role:                role.Name,
		RoleID:              role.ID,
		PasswordInvalidated: registerRequest.IsTemporaryPassword,
	}
	user.Groups, err = c.GetDefaultUserGroupMap(ctx, pgClient)
	if err != nil {
		log.Error().Msg("c.GetDefaultUserGroup: " + err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	err = user.SetPassword(registerRequest.Password)
	if err != nil {
		log.Error().Msg("user.SetPassword: " + err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	createdUser, err := user.Create(ctx, pgClient)
	if err != nil {
		log.Error().Msg("user.Create: " + err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	user.ID = createdUser.ID
	apiToken := model.ApiToken{
		ApiToken:        utils.NewUUID(),
		Name:            user.Email,
		CompanyID:       company.ID,
		RoleID:          role.ID,
		CreatedByUserID: user.ID,
	}
	defaultGroup, err := c.GetDefaultUserGroup(ctx, pgClient)
	if err != nil {
		log.Error().Msg("GetDefaultUserGroup: " + err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	apiToken.GroupID = defaultGroup.ID
	_, err = apiToken.Create(ctx, pgClient)
	if err != nil {
		log.Error().Msg("apiToken.Create: " + err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	accessTokenResponse, err := user.GetAccessToken(h.TokenAuth, model.GrantTypePassword)
	if err != nil {
		log.Error().Msg("GetAccessToken: " + err.Error())
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	httpext.JSON(w, http.StatusOK, model.Response{Success: true, Data: accessTokenResponse})
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	user, statusCode, _, _, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		httpext.JSON(w, statusCode, model.Response{Success: false, Message: err.Error()})
		return
	}
	httpext.JSON(w, http.StatusOK, model.Response{Success: true, Data: user})
}

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	return
}

func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	return
}

func (h *Handler) ResetPasswordRequest(w http.ResponseWriter, r *http.Request) {
	var resetPasswordRequest model.PasswordResetRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &resetPasswordRequest)
	if err != nil {
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}
	err = h.Validator.Struct(resetPasswordRequest)
	if err != nil {
		errorFields := model.ParseValidatorError(err.Error())
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false, ErrorFields: &errorFields})
		return
	}
	user, statusCode, ctx, pgClient, err := model.GetUserByEmail(resetPasswordRequest.Email)
	if err != nil {
		httpext.JSON(w, statusCode, model.Response{Success: false, Message: err.Error()})
		return
	}
	err = pgClient.DeletePasswordResetByUserEmail(ctx, user.Email)
	if err != nil {
		httpext.JSON(w, statusCode, model.Response{Success: false, Message: err.Error()})
		return
	}
	_, err = pgClient.CreatePasswordReset(ctx, postgresql_db.CreatePasswordResetParams{
		Code: utils.NewUUID(), Expiry: utils.GetCurrentDatetime(), UserID: user.ID,
	})
	if err != nil {
		httpext.JSON(w, statusCode, model.Response{Success: false, Message: err.Error()})
		return
	}
	err = email.SendEmail()
	if err != nil {
		pgClient.DeletePasswordResetByUserEmail(ctx, user.Email)
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	httpext.JSON(w, http.StatusOK, model.Response{Success: true})
}

func (h *Handler) ResetPasswordVerification(w http.ResponseWriter, r *http.Request) {
	var passwordResetVerifyRequest model.PasswordResetVerifyRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &passwordResetVerifyRequest)
	if err != nil {
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}
	err = h.Validator.Struct(passwordResetVerifyRequest)
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
	code, err := utils.UUIDFromString(passwordResetVerifyRequest.Code)
	passwordReset, err := pgClient.GetPasswordResetByCode(ctx, code)
	if errors.Is(err, sql.ErrNoRows) {
		httpext.JSON(w, http.StatusNotFound, model.Response{Success: false, Message: "code not found"})
		return
	} else if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	user := model.User{ID: passwordReset.UserID}
	err = user.LoadFromDbByID(ctx, pgClient)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	err = user.SetPassword(passwordResetVerifyRequest.Password)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	_, err = user.Update(ctx, pgClient)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	httpext.JSON(w, http.StatusOK, model.Response{Success: true})
}

func (h *Handler) GetApiTokens(w http.ResponseWriter, r *http.Request) {
	user, statusCode, ctx, pgClient, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		httpext.JSON(w, statusCode, model.Response{Success: false, Message: err.Error()})
		return
	}
	apiTokens, err := pgClient.GetApiTokensByUser(ctx, user.ID)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	httpext.JSON(w, http.StatusOK, model.Response{Success: true, Data: apiTokens})
}

func (h *Handler) GetUserFromJWT(requestContext context.Context) (*model.User, int, context.Context, *postgresql_db.Queries, error) {
	_, claims, err := jwtauth.FromContext(requestContext)
	if err != nil {
		return nil, http.StatusBadRequest, requestContext, nil, err
	}
	userId, err := utils.GetInt64ValueFromInterfaceMap(claims, "user_id")
	if err != nil {
		return nil, http.StatusInternalServerError, requestContext, nil, err
	}
	user, statusCode, ctx, pgClient, err := model.GetUserByID(userId)
	if err != nil {
		return nil, statusCode, ctx, pgClient, err
	}
	return user, http.StatusOK, ctx, pgClient, nil
}

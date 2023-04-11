package handler

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/integrations/email"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	postgresql_db "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/jwtauth/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

const (
	MaxPostRequestSize = 1000000 // 1 MB
	DefaultNamespace   = "default"
)

var (
	True  = new(bool)
	False = new(bool)
)

func init() {
	*True = true
	*False = false
}

func (h *Handler) RegisterUser(w http.ResponseWriter, r *http.Request) {
	var registerRequest model.UserRegisterRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &registerRequest)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(registerRequest)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return
	}
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(err, w)
		return
	}
	consoleUrl, err := utils.RemoveURLPath(registerRequest.ConsoleURL)
	if err != nil {
		respondError(err, w)
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
		respondError(err, w)
		return
	}
	users, err := pgClient.CountActiveUsers(ctx)
	if err != nil || users > 0 {
		respondError(&ForbiddenError{errors.New("Cannot register. Please contact your administrator for an invite")}, w)
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
		respondError(err, w)
		return
	}
	c.ID = company.ID
	role, err := pgClient.GetRoleByName(ctx, model.AdminRole)
	if err != nil {
		respondError(err, w)
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
		CompanyNamespace:    c.Namespace,
	}
	user.Groups, err = c.GetDefaultUserGroupMap(ctx, pgClient)
	if err != nil {
		log.Error().Msg("c.GetDefaultUserGroup: " + err.Error())
		respondError(err, w)
		return
	}
	err = user.SetPassword(registerRequest.Password)
	if err != nil {
		log.Error().Msg("user.SetPassword: " + err.Error())
		respondError(err, w)
		return
	}
	createdUser, err := user.Create(ctx, pgClient)
	if err != nil {
		log.Error().Msg("user.Create: " + err.Error())
		respondError(err, w)
		return
	}
	user.ID = createdUser.ID
	err = h.createApiToken(ctx, pgClient, &user, user.RoleID)
	if err != nil {
		log.Error().Msg("createApiToken: " + err.Error())
		respondError(err, w)
		return
	}
	accessTokenResponse, err := user.GetAccessToken(h.TokenAuth, model.GrantTypePassword)
	if err != nil {
		log.Error().Msg("GetAccessToken: " + err.Error())
		respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, model.LoginResponse{
		ResponseAccessToken: *accessTokenResponse,
		OnboardingRequired:  model.IsOnboardingRequired(ctx),
		PasswordInvalidated: user.PasswordInvalidated,
	})
}

func (h *Handler) RegisterInvitedUser(w http.ResponseWriter, r *http.Request) {
	var registerRequest model.RegisterInvitedUserRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &registerRequest)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(registerRequest)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return
	}
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(err, w)
		return
	}
	code, err := utils.UUIDFromString(registerRequest.Code)
	userInvite, err := pgClient.GetUserInviteByCode(ctx, code)
	if errors.Is(err, sql.ErrNoRows) {
		respondError(&BadDecoding{errors.New("Invalid code")}, w)
		return
	} else if err != nil {
		respondError(err, w)
		return
	}
	company, err := pgClient.GetCompany(ctx, userInvite.CompanyID)
	if err != nil {
		respondError(err, w)
		return
	}
	role, err := pgClient.GetRoleByID(ctx, userInvite.RoleID)
	user := model.User{
		FirstName:           registerRequest.FirstName,
		LastName:            registerRequest.LastName,
		Email:               userInvite.Email,
		Company:             company.Name,
		CompanyID:           company.ID,
		IsActive:            true,
		Role:                role.Name,
		RoleID:              role.ID,
		PasswordInvalidated: registerRequest.IsTemporaryPassword,
	}
	user.Groups, err = model.GetDefaultUserGroupMap(ctx, pgClient, company.ID)
	if err != nil {
		log.Error().Msg("c.GetDefaultUserGroup: " + err.Error())
		respondError(err, w)
		return
	}
	err = user.SetPassword(registerRequest.Password)
	if err != nil {
		log.Error().Msg("user.SetPassword: " + err.Error())
		respondError(err, w)
		return
	}
	createdUser, err := user.Create(ctx, pgClient)
	if err != nil {
		log.Error().Msg("user.Create: " + err.Error())
		respondError(err, w)
		return
	}
	user.ID = createdUser.ID
	err = h.createApiToken(ctx, pgClient, &user, user.RoleID)
	if err != nil {
		log.Error().Msg("createApiToken: " + err.Error())
		respondError(err, w)
		return
	}
	accessTokenResponse, err := user.GetAccessToken(h.TokenAuth, model.GrantTypePassword)
	if err != nil {
		log.Error().Msg("GetAccessToken: " + err.Error())
		respondError(err, w)
		return
	}

	createdUser.PasswordHash = ""
	h.AuditUserActivity(r, EVENT_AUTH, ACTION_CREATE, createdUser, true)

	httpext.JSON(w, http.StatusOK, model.LoginResponse{
		ResponseAccessToken: *accessTokenResponse,
		OnboardingRequired:  model.IsOnboardingRequired(ctx),
		PasswordInvalidated: user.PasswordInvalidated,
	})
}

func (h *Handler) InviteUser(w http.ResponseWriter, r *http.Request) {
	var inviteUserRequest model.InviteUserRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &inviteUserRequest)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(inviteUserRequest)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return
	}
	user, statusCode, ctx, pgClient, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	role, err := pgClient.GetRoleByName(ctx, inviteUserRequest.Role)
	if err != nil {
		respondError(err, w)
		return
	}
	var userInvite postgresql_db.UserInvite
	code := utils.NewUUID()
	expiry := utils.GetCurrentDatetime().Add(48 * time.Hour)
	userInvite, err = pgClient.GetUserInviteByEmail(ctx, inviteUserRequest.Email)
	if errors.Is(err, sql.ErrNoRows) {
		userInvite, err = pgClient.CreateUserInvite(ctx, postgresql_db.CreateUserInviteParams{
			Email:           inviteUserRequest.Email,
			Code:            code,
			CreatedByUserID: user.ID,
			RoleID:          role.ID,
			CompanyID:       user.CompanyID,
			Accepted:        false,
			Expiry:          expiry,
		})
		if err != nil {
			respondError(err, w)
			return
		}
	} else if err != nil {
		respondError(err, w)
		return
	} else {
		userInvite, err = pgClient.UpdateUserInvite(ctx, postgresql_db.UpdateUserInviteParams{
			Code:            code,
			CreatedByUserID: user.ID,
			RoleID:          role.ID,
			CompanyID:       user.CompanyID,
			Accepted:        false,
			Expiry:          expiry,
			ID:              userInvite.ID,
		})
		if err != nil {
			respondError(err, w)
			return
		}
	}
	inviteURL := fmt.Sprintf("http://localhost/#/invite-accept/?invite_code=%s", code)
	message := ""
	if inviteUserRequest.Action == UserInviteSendEmail {
		email.SendEmail()
		message = "Invite sent"
	}

	h.AuditUserActivity(r, EVENT_AUTH, ACTION_INVITE, userInvite, true)

	httpext.JSON(w, http.StatusOK, model.InviteUserResponse{InviteExpiryHours: 48, InviteURL: inviteURL, Message: message})
}

func (h *Handler) userModel(pgUser postgresql_db.GetUsersRow) model.User {
	return model.User{
		ID:                  pgUser.ID,
		FirstName:           pgUser.FirstName,
		LastName:            pgUser.LastName,
		Email:               pgUser.Email,
		IsActive:            pgUser.IsActive,
		PasswordInvalidated: pgUser.PasswordInvalidated,
		Role:                pgUser.RoleName,
		RoleID:              pgUser.RoleID,
		Company:             pgUser.CompanyName,
	}
}

func (h *Handler) GetUsers(w http.ResponseWriter, r *http.Request) {
	currentUser, statusCode, ctx, pgClient, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	pgUsers, err := pgClient.GetUsers(ctx)
	if err != nil {
		respondError(&InternalServerError{err}, w)
	}
	users := make([]model.User, len(pgUsers))
	for i, pgUser := range pgUsers {
		users[i] = h.userModel(pgUser)
		if pgUser.ID == currentUser.ID {
			users[i].CurrentUser = True
		} else {
			users[i].CurrentUser = False
		}
	}
	httpext.JSON(w, http.StatusOK, users)
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	user, statusCode, _, _, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	httpext.JSON(w, http.StatusOK, user)
}

func (h *Handler) GetUserByUserID(w http.ResponseWriter, r *http.Request) {
	userId, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	user, statusCode, _, _, err := model.GetUserByID(userId)
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	httpext.JSON(w, http.StatusOK, user)
}

func (h *Handler) updateUserHandler(w http.ResponseWriter, r *http.Request, ctx context.Context, pgClient *postgresql_db.Queries, user *model.User) {
	defer r.Body.Close()
	var req model.UpdateUserRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return
	}
	user.FirstName = req.FirstName
	user.LastName = req.LastName
	if user.Role != req.Role {
		user.Role = req.Role
		role, err := pgClient.GetRoleByName(ctx, req.Role)
		if err != nil {
			respondError(err, w)
			return
		}
		user.RoleID = role.ID
	}
	user.IsActive = req.IsActive
	_, err = user.Update(ctx, pgClient)
	if err != nil {
		respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, user)
}

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	user, statusCode, ctx, pgClient, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	h.updateUserHandler(w, r, ctx, pgClient, user)
}

func (h *Handler) UpdateUserByUserID(w http.ResponseWriter, r *http.Request) {
	userId, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	user, statusCode, ctx, pgClient, err := model.GetUserByID(userId)
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	h.updateUserHandler(w, r, ctx, pgClient, user)
}

func (h *Handler) UpdateUserPassword(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.UpdateUserPasswordRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return
	}
	user, statusCode, ctx, pgClient, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	passwordValid, err := user.CompareHashAndPassword(ctx, pgClient, req.OldPassword)
	if err != nil || !passwordValid {
		respondError(&ValidatorError{
			errors.New("Key: 'UpdateUserPasswordRequest.OldPassword' Error:incorrect old password")}, w)
		return
	}
	err = user.SetPassword(req.NewPassword)
	if err != nil {
		respondError(err, w)
		return
	}
	err = user.UpdatePassword(ctx, pgClient)
	if err != nil {
		respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteUserByUserID(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ResetPasswordRequest(w http.ResponseWriter, r *http.Request) {
	var resetPasswordRequest model.PasswordResetRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &resetPasswordRequest)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(resetPasswordRequest)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return
	}
	user, _, ctx, pgClient, err := model.GetUserByEmail(resetPasswordRequest.Email)
	if err.Error() == utils.ErrorUserNotFound {
		respondError(&NotFoundError{errors.New("A password reset email will be sent if a user exists with the provided email id")}, w)
		return
	} else if err != nil {
		respondError(err, w)
		return
	}
	err = pgClient.DeletePasswordResetByUserEmail(ctx, user.Email)
	if err != nil {
		respondError(err, w)
		return
	}
	expiry := utils.GetCurrentDatetime().Add(10 * time.Minute)
	_, err = pgClient.CreatePasswordReset(ctx, postgresql_db.CreatePasswordResetParams{
		Code: utils.NewUUID(), Expiry: expiry, UserID: user.ID,
	})
	if err != nil {
		respondError(err, w)
		return
	}
	err = email.SendEmail()
	if err != nil {
		pgClient.DeletePasswordResetByUserEmail(ctx, user.Email)
		respondError(errors.New("Email not configured"), w)
		return
	}

	httpext.JSON(w, http.StatusOK, model.MessageResponse{
		Message: "A password reset email will be sent if a user exists with the provided email id"})
}

func (h *Handler) ResetPasswordVerification(w http.ResponseWriter, r *http.Request) {
	var passwordResetVerifyRequest model.PasswordResetVerifyRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &passwordResetVerifyRequest)
	if err != nil {
		respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(passwordResetVerifyRequest)
	if err != nil {
		respondError(&ValidatorError{err}, w)
		return
	}
	ctx := directory.WithGlobalContext(r.Context())
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(err, w)
		return
	}
	code, err := utils.UUIDFromString(passwordResetVerifyRequest.Code)
	passwordReset, err := pgClient.GetPasswordResetByCode(ctx, code)
	if errors.Is(err, sql.ErrNoRows) {
		respondError(&NotFoundError{errors.New("code not found")}, w)
		return
	} else if err != nil {
		respondError(err, w)
		return
	}
	user := model.User{ID: passwordReset.UserID}
	err = user.LoadFromDbByID(ctx, pgClient)
	if err != nil {
		respondError(err, w)
		return
	}
	err = user.SetPassword(passwordResetVerifyRequest.Password)
	if err != nil {
		respondError(err, w)
		return
	}
	err = user.UpdatePassword(ctx, pgClient)
	if err != nil {
		respondError(err, w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetApiTokens(w http.ResponseWriter, r *http.Request) {
	user, statusCode, ctx, pgClient, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	apiTokens, err := pgClient.GetApiTokensByUser(ctx, user.ID)
	if err != nil {
		respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, apiTokens)
}

func (h *Handler) createApiToken(ctx context.Context, pgClient *postgresql_db.Queries, user *model.User, roleID int32) error {
	apiToken := model.ApiToken{
		ApiToken:        utils.NewUUID(),
		Name:            user.Email,
		CompanyID:       user.CompanyID,
		RoleID:          roleID,
		CreatedByUserID: user.ID,
	}
	company := &model.Company{ID: user.CompanyID, Name: user.Company}
	defaultGroup, err := company.GetDefaultUserGroup(ctx, pgClient)
	if err != nil {
		return err
	}
	apiToken.GroupID = defaultGroup.ID
	_, err = apiToken.Create(ctx, pgClient)
	if err != nil {
		return err
	}
	return nil
}

func (h *Handler) ResetApiToken(w http.ResponseWriter, r *http.Request) {
	user, statusCode, ctx, pgClient, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		respondWithErrorCode(err, w, statusCode)
		return
	}
	err = pgClient.DeleteApiTokensByUserID(ctx, user.ID)
	if err != nil {
		respondError(err, w)
		return
	}
	err = h.createApiToken(ctx, pgClient, user, user.RoleID)
	if err != nil {
		respondError(err, w)
		return
	}
	apiTokens, err := pgClient.GetApiTokensByUser(ctx, user.ID)
	if err != nil {
		respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, apiTokens)
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

func (h *Handler) GetApiTokenForConsoleAgent(w http.ResponseWriter, r *http.Request) {
	// TODO make this local context for saas
	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		respondError(err, w)
		return
	}
	token, err := pgClient.GetApiTokenByActiveUser(r.Context())
	if err != nil {
		respondError(err, w)
		return
	}
	httpext.JSON(w, http.StatusOK, model.ApiAuthRequest{ApiToken: token.String()})
}

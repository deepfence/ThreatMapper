package handler

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/sendemail"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresql_db "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/jwtauth/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
)

const (
	MaxPostRequestSize    = 1000000 // 1 MB
	passwordResetResponse = "A password reset email will be sent if a user exists with the provided email id"
)

var (
	True  = new(bool)
	False = new(bool)

	ErrEmailNotConfigured = ValidatorError{
		err:                       errors.New("email:Not configured to send emails. Please configure it in Settings->Email Configuration"),
		skipOverwriteErrorMessage: true,
	}
	ErrIncorrectOldPassword = ValidatorError{
		err:                       errors.New("old_password:incorrect old password"),
		skipOverwriteErrorMessage: true,
	}
	ErrdeleteLastAdmin           = errors.New("at least one active admin user required")
	ErrpasswordResetCodeNotFound = NotFoundError{errors.New("code not found")}
	ErruserInviteInvalidCode     = BadDecoding{errors.New("invalid code")}
	ErrregistrationDone          = ForbiddenError{errors.New("cannot register. Please contact your administrator for an invite")}
	ErrCannotDeleteSelfUser      = ForbiddenError{err: errors.New("cannot delete your account, please request another admin user to delete your account")}
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
		log.Error().Msgf(err.Error())
		h.respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(registerRequest)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	registerRequest.Email = strings.ToLower(registerRequest.Email)
	namespace := directory.FetchNamespace(registerRequest.Email)
	ctx := directory.NewContextWithNameSpace(namespace)

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(err, w)
		return
	}

	users, err := pgClient.CountActiveUsers(ctx)
	if err != nil || users > 0 {
		if err != nil {
			log.Error().Msgf(err.Error())
		}
		u := model.User{
			FirstName:        registerRequest.FirstName,
			LastName:         registerRequest.LastName,
			Email:            registerRequest.Email,
			Company:          registerRequest.Company,
			CompanyNamespace: string(namespace),
		}
		h.AuditUserActivity(r, EventAuth, ActionCreate, &u, false)
		h.respondError(&ErrregistrationDone, w)
		return
	}

	consoleURL, err := utils.RemoveURLPath(registerRequest.ConsoleURL)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(err, w)
		return
	}
	consoleURLSetting := model.Setting{
		Key: model.ConsoleURLSettingKey,
		Value: &model.SettingValue{
			Label:       "Deepfence Console URL",
			Value:       consoleURL,
			Description: "Deepfence Console URL used for sending emails with links to the console",
		},
		IsVisibleOnUI: true,
	}
	_, err = consoleURLSetting.Create(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(err, w)
		return
	}

	emailDomain, _ := utils.GetEmailDomain(registerRequest.Email)
	c := model.Company{
		Name:        registerRequest.Company,
		EmailDomain: emailDomain,
		Namespace:   string(namespace),
	}
	company, err := c.Create(ctx, pgClient)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(err, w)
		return
	}
	c.ID = company.ID
	role, err := pgClient.GetRoleByName(ctx, model.AdminRole)
	if err != nil {
		log.Error().Msgf(err.Error())
		h.respondError(err, w)
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
		h.respondError(err, w)
		return
	}
	err = user.SetPassword(registerRequest.Password)
	if err != nil {
		log.Error().Msg("user.SetPassword: " + err.Error())
		h.respondError(err, w)
		return
	}
	createdUser, err := user.Create(ctx, pgClient)
	if err != nil {
		log.Error().Msg("user.Create: " + err.Error())
		h.respondError(err, w)
		return
	}
	user.ID = createdUser.ID
	_, err = user.CreateAPIToken(ctx, pgClient, user.RoleID, &c)
	if err != nil {
		log.Error().Msg("createApiToken: " + err.Error())
		h.respondError(err, w)
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

	accessTokenResponse, err := user.GetAccessToken(h.TokenAuth, model.GrantTypePassword, licenseActive)
	if err != nil {
		log.Error().Msg("GetAccessToken: " + err.Error())
		h.respondError(err, w)
		return
	}
	user.Password = ""
	h.AuditUserActivity(r, EventAuth, ActionCreate, &user, true)
	err = httpext.JSON(w, http.StatusOK, model.LoginResponse{
		ResponseAccessToken: *accessTokenResponse,
		OnboardingRequired:  model.IsOnboardingRequired(ctx),
		PasswordInvalidated: user.PasswordInvalidated,
		LicenseRegistered:   licenseRegistered,
		LicenseKey:          licenseKey,
		EmailDomain:         licenseEmailDomain,
	})
	if err != nil {
		log.Error().Msgf("%v", err)
	}
}

func (h *Handler) RegisterInvitedUser(w http.ResponseWriter, r *http.Request) {
	var registerRequest model.RegisterInvitedUserRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &registerRequest)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(registerRequest)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}

	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(registerRequest.Namespace))

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}
	code, err := utils.UUIDFromString(registerRequest.Code)
	if err != nil {
		h.respondError(err, w)
		return
	}
	userInvite, err := pgClient.GetUserInviteByCode(ctx, code)
	if errors.Is(err, sql.ErrNoRows) {
		h.respondError(&ErruserInviteInvalidCode, w)
		return
	} else if err != nil {
		h.respondError(err, w)
		return
	}
	company, err := model.GetCompany(ctx, pgClient, userInvite.CompanyID)
	if err != nil {
		h.respondError(err, w)
		return
	}
	role, err := pgClient.GetRoleByID(ctx, userInvite.RoleID)
	if err != nil {
		h.respondError(err, w)
		return
	}
	user := model.User{
		FirstName:           registerRequest.FirstName,
		LastName:            registerRequest.LastName,
		Email:               strings.ToLower(userInvite.Email),
		Company:             company.Name,
		CompanyID:           company.ID,
		IsActive:            true,
		Role:                role.Name,
		RoleID:              role.ID,
		PasswordInvalidated: registerRequest.IsTemporaryPassword,
		CompanyNamespace:    company.Namespace,
	}
	user.Groups, err = model.GetDefaultUserGroupMap(ctx, pgClient, company.ID)
	if err != nil {
		log.Error().Msg("c.GetDefaultUserGroup: " + err.Error())
		h.respondError(err, w)
		return
	}
	err = user.SetPassword(registerRequest.Password)
	if err != nil {
		log.Error().Msg("user.SetPassword: " + err.Error())
		h.respondError(err, w)
		return
	}
	createdUser, err := user.Create(ctx, pgClient)
	if err != nil {
		log.Error().Msg("user.Create: " + err.Error())
		h.respondError(err, w)
		return
	}
	user.ID = createdUser.ID
	_, err = user.CreateAPIToken(ctx, pgClient, user.RoleID, company)
	if err != nil {
		log.Error().Msg("createApiToken: " + err.Error())
		h.respondError(err, w)
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

	accessTokenResponse, err := user.GetAccessToken(h.TokenAuth, model.GrantTypePassword, licenseActive)
	if err != nil {
		log.Error().Msg("GetAccessToken: " + err.Error())
		h.respondError(err, w)
		return
	}

	user.Password = ""
	h.AuditUserActivity(r, EventAuth, ActionCreate, &user, true)

	_ = httpext.JSON(w, http.StatusOK, model.LoginResponse{
		ResponseAccessToken: *accessTokenResponse,
		OnboardingRequired:  model.IsOnboardingRequired(ctx),
		PasswordInvalidated: user.PasswordInvalidated,
		LicenseRegistered:   licenseRegistered,
		LicenseKey:          licenseKey,
		EmailDomain:         licenseEmailDomain,
	})
}

func (h *Handler) InviteUser(w http.ResponseWriter, r *http.Request) {
	var inviteUserRequest model.InviteUserRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &inviteUserRequest)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(inviteUserRequest)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	ctx := r.Context()
	user, statusCode, pgClient, err := h.GetUserFromJWT(ctx)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	role, err := pgClient.GetRoleByName(ctx, inviteUserRequest.Role)
	if err != nil {
		h.respondError(err, w)
		return
	}
	var userInvite postgresql_db.UserInvite
	code := utils.NewUUID()
	expiry := utils.GetCurrentDatetime().Add(48 * time.Hour)
	inviteUserRequest.Email = strings.ToLower(inviteUserRequest.Email)
	userInvite, err = pgClient.GetUserInviteByEmail(ctx, inviteUserRequest.Email)
	switch {
	case errors.Is(err, sql.ErrNoRows):
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
			h.respondError(err, w)
			return
		}
	case err != nil:
		h.respondError(err, w)
		return
	default:
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
			h.respondError(err, w)
			return
		}
	}
	consoleURL, err := model.GetManagementConsoleURL(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}
	inviteURL := fmt.Sprintf("%s/auth/invite-accept?invite_code=%s&namespace=%s", consoleURL, code, user.CompanyNamespace)
	if inviteUserRequest.Action == UserInviteSendEmail {
		emailSender, err := sendemail.NewEmailSender(ctx)
		if errors.Is(err, sql.ErrNoRows) {
			h.respondError(&ErrEmailNotConfigured, w)
			return
		} else if err != nil {
			h.respondError(err, w)
			return
		}

		htmlEmail, err := sendemail.RenderEmailTemplate(
			sendemail.UserInviteTemplate,
			sendemail.UserInvite{
				Project:          utils.Project,
				Username:         "",
				RequestedBy:      fmt.Sprintf("%s %s", user.FirstName, user.LastName),
				RequestedByEmail: user.Email,
				InviteLink:       inviteURL,
			},
		)
		if err != nil {
			log.Error().Err(err).Msg("error rendering UserInviteTemplate")
			h.respondError(err, w)
			return
		}

		err = emailSender.Send(
			[]string{inviteUserRequest.Email},
			fmt.Sprintf(sendemail.UserInviteEmailSubject, utils.Project),
			"",
			htmlEmail,
			nil,
		)
		if err != nil {
			log.Error().Err(err).Msg("error sending user invite email")
			h.respondError(err, w)
			return
		}
	}

	h.AuditUserActivity(r, EventAuth, ActionInvite, userInvite, true)

	_ = httpext.JSON(w, http.StatusOK, model.InviteUserResponse{InviteExpiryHours: 48, InviteURL: inviteURL, Message: "Invite sent"})
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
	ctx := r.Context()
	currentUser, statusCode, pgClient, err := h.GetUserFromJWT(ctx)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	pgUsers, err := pgClient.GetUsers(ctx)
	if err != nil {
		h.respondError(&InternalServerError{err}, w)
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
	_ = httpext.JSON(w, http.StatusOK, users)
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	user, statusCode, _, err := h.GetUserFromJWT(r.Context())
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	_ = httpext.JSON(w, http.StatusOK, user)
}

func (h *Handler) GetUserByUserID(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	user, statusCode, _, err := model.GetUserByID(r.Context(), userID)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	_ = httpext.JSON(w, http.StatusOK, user)
}

func (h *Handler) updateUserHandler(w http.ResponseWriter, r *http.Request, ctx context.Context, pgClient *postgresql_db.Queries, user *model.User, isCurrentUser bool) {
	defer r.Body.Close()
	var req model.UpdateUserRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	toLogout := false
	user.FirstName = req.FirstName
	user.LastName = req.LastName
	if user.Role != req.Role {
		activeAdminUsersCount, err := pgClient.CountActiveAdminUsers(ctx)
		if err != nil {
			h.respondWithErrorCode(err, w, http.StatusInternalServerError)
			return
		}
		if user.Role == model.AdminRole && activeAdminUsersCount < 2 {
			h.respondWithErrorCode(ErrdeleteLastAdmin, w, http.StatusForbidden)
			return
		}
		if isCurrentUser {
			toLogout = true
		}
		user.Role = req.Role
		role, err := pgClient.GetRoleByName(ctx, req.Role)
		if err != nil {
			h.respondError(err, w)
			return
		}
		user.RoleID = role.ID
	}
	if user.IsActive != req.IsActive {
		user.IsActive = req.IsActive
		if isCurrentUser {
			toLogout = true
		}
	}
	_, err = user.Update(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}
	if toLogout {
		err = LogoutHandler(ctx)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}
	user.Password = ""
	h.AuditUserActivity(r, EventAuth, ActionUpdate, user, true)
	_ = httpext.JSON(w, http.StatusOK, user)
}

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user, statusCode, pgClient, err := h.GetUserFromJWT(ctx)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	h.updateUserHandler(w, r, ctx, pgClient, user, true)
}

func (h *Handler) UpdateUserByUserID(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	ctx := r.Context()
	user, statusCode, pgClient, err := model.GetUserByID(ctx, userID)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	currentUser, statusCode, _, err := h.GetUserFromJWT(ctx)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	h.updateUserHandler(w, r, ctx, pgClient, user, currentUser.ID == user.ID)
}

func (h *Handler) UpdateUserPassword(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req model.UpdateUserPasswordRequest
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &req)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = h.Validator.Struct(req)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	ctx := r.Context()
	user, statusCode, pgClient, err := h.GetUserFromJWT(ctx)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	if user.Email == constants.DeepfenceCommunityEmailID {
		w.WriteHeader(http.StatusForbidden)
		return
	}
	passwordValid, err := user.CompareHashAndPassword(ctx, pgClient, req.OldPassword)
	if err != nil || !passwordValid {
		h.respondError(&ErrIncorrectOldPassword, w)
		return
	}
	err = user.SetPassword(req.NewPassword)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = user.UpdatePassword(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}
	user.Password = ""
	h.AuditUserActivity(r, EventAuth, ActionResetPassword, user, true)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteUserHandler(w http.ResponseWriter, r *http.Request, ctx context.Context, pgClient *postgresql_db.Queries, user *model.User, isCurrentUser bool) {
	activeAdminUsersCount, err := pgClient.CountActiveAdminUsers(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}
	if user.Role == model.AdminRole && activeAdminUsersCount < 2 {
		h.respondWithErrorCode(ErrdeleteLastAdmin, w, http.StatusForbidden)
		return
	}
	err = user.Delete(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}
	if isCurrentUser {
		err = LogoutHandler(ctx)
		if err != nil {
			log.Error().Msg(err.Error())
		}
	}

	user.Password = ""
	h.AuditUserActivity(r, EventAuth, ActionDelete, user, true)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user, statusCode, pgClient, err := h.GetUserFromJWT(ctx)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	h.deleteUserHandler(w, r, ctx, pgClient, user, true)
}

func (h *Handler) DeleteUserByUserID(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondError(&BadDecoding{err}, w)
		return
	}
	ctx := r.Context()
	user, statusCode, pgClient, err := model.GetUserByID(ctx, userID)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	currentUser, statusCode, _, err := h.GetUserFromJWT(ctx)
	if err != nil {
		log.Error().Msgf("%v", err)
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	if currentUser.ID == user.ID {
		log.Error().Msgf("User: %s, error: %v", currentUser.Email, ErrCannotDeleteSelfUser)
		h.respondError(&ErrCannotDeleteSelfUser, w)
		return
	}
	h.deleteUserHandler(w, r, ctx, pgClient, user, false)
}

func (h *Handler) ResetPasswordRequest(w http.ResponseWriter, r *http.Request) {
	var resetPasswordRequest model.PasswordResetRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &resetPasswordRequest)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(resetPasswordRequest)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	resetPasswordRequest.Email = strings.ToLower(resetPasswordRequest.Email)
	if resetPasswordRequest.Email == constants.DeepfenceCommunityEmailID {
		_ = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: passwordResetResponse})
		return
	}
	ctx := directory.NewContextWithNameSpace(directory.FetchNamespace(resetPasswordRequest.Email))
	user, statusCode, pgClient, err := model.GetUserByEmail(ctx, resetPasswordRequest.Email)
	if errors.Is(err, model.ErrUserNotFound) {
		_ = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: passwordResetResponse})
		return
	} else if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}

	emailSender, err := sendemail.NewEmailSender(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		h.respondError(&ErrEmailNotConfigured, w)
		return
	} else if err != nil {
		h.respondError(err, w)
		return
	}

	err = pgClient.DeletePasswordResetByUserEmail(ctx, user.Email)
	if err != nil {
		h.respondError(err, w)
		return
	}
	expiry := utils.GetCurrentDatetime().Add(10 * time.Minute)
	resetCode := utils.NewUUID()
	_, err = pgClient.CreatePasswordReset(ctx, postgresql_db.CreatePasswordResetParams{
		Code: resetCode, Expiry: expiry, UserID: user.ID,
	})
	if err != nil {
		h.respondError(err, w)
		return
	}
	consoleURL, err := model.GetManagementConsoleURL(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}
	resetPasswordURL := fmt.Sprintf("%s/auth/reset-password?code=%s&namespace=%s", consoleURL, resetCode, user.CompanyNamespace)

	htmlEmail, err := sendemail.RenderEmailTemplate(
		sendemail.PasswordResetTemplate,
		sendemail.PasswordReset{
			Project:    utils.Project,
			Username:   user.FirstName + " " + user.LastName,
			InviteLink: resetPasswordURL,
		},
	)
	if err != nil {
		e := pgClient.DeletePasswordResetByUserEmail(ctx, user.Email)
		if e != nil {
			log.Error().Msg(e.Error())
		}
		log.Error().Err(err).Msg("error rendering PasswordResetTemplate")
		h.respondError(err, w)
		return
	}

	err = emailSender.Send(
		[]string{resetPasswordRequest.Email},
		sendemail.PasswordResetEmailSubject,
		"",
		htmlEmail,
		nil,
	)
	if err != nil {
		e := pgClient.DeletePasswordResetByUserEmail(ctx, user.Email)
		if e != nil {
			log.Error().Msg(e.Error())
		}
		log.Error().Err(err).Msg("error sending password reset email")
		h.respondError(err, w)
		return
	}

	h.AuditUserActivity(r, EventAuth, ActionResetPassword, resetPasswordRequest, true)

	_ = httpext.JSON(w, http.StatusOK, model.MessageResponse{Message: passwordResetResponse})
}

func (h *Handler) ResetPasswordVerification(w http.ResponseWriter, r *http.Request) {
	var passwordResetVerifyRequest model.PasswordResetVerifyRequest
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &passwordResetVerifyRequest)
	if err != nil {
		h.respondError(&BadDecoding{err}, w)
		return
	}
	err = h.Validator.Struct(passwordResetVerifyRequest)
	if err != nil {
		h.respondError(&ValidatorError{err: err}, w)
		return
	}
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(passwordResetVerifyRequest.Namespace))
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}
	code, err := utils.UUIDFromString(passwordResetVerifyRequest.Code)
	if err != nil {
		h.respondWithErrorCode(err, w, http.StatusInternalServerError)
		return
	}
	passwordReset, err := pgClient.GetPasswordResetByCode(ctx, code)
	if errors.Is(err, sql.ErrNoRows) {
		h.respondError(&ErrpasswordResetCodeNotFound, w)
		return
	} else if err != nil {
		h.respondError(err, w)
		return
	}
	user := model.User{ID: passwordReset.UserID}
	err = user.LoadFromDBByID(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = user.SetPassword(passwordResetVerifyRequest.Password)
	if err != nil {
		h.respondError(err, w)
		return
	}
	err = user.UpdatePassword(ctx, pgClient)
	if err != nil {
		h.respondError(err, w)
		return
	}
	user.Password = ""
	h.AuditUserActivity(r, EventAuth, ActionVerifyPassword, user, true)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetAPITokens(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user, statusCode, pgClient, err := h.GetUserFromJWT(ctx)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	apiTokens, err := pgClient.GetApiTokensByUser(ctx, user.ID)
	if err != nil {
		h.respondError(err, w)
		return
	}
	apiTokenResponse := make([]model.APITokenResponse, len(apiTokens))
	for i, apiToken := range apiTokens {
		apiTokenResponse[i] = model.APITokenResponse{
			ID:              apiToken.ID,
			APIToken:        model.GetAPIToken(user.CompanyNamespace, apiToken.ApiToken),
			Name:            apiToken.Name,
			CompanyID:       apiToken.CompanyID,
			CreatedByUserID: apiToken.CreatedByUserID,
			CreatedAt:       apiToken.CreatedAt,
		}
	}
	_ = httpext.JSON(w, http.StatusOK, apiTokenResponse)
}

func (h *Handler) ResetAPIToken(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user, statusCode, pgClient, err := h.GetUserFromJWT(ctx)
	if err != nil {
		h.respondWithErrorCode(err, w, statusCode)
		return
	}
	err = pgClient.DeleteApiTokensByUserID(ctx, user.ID)
	if err != nil {
		h.respondError(err, w)
		return
	}
	company, err := model.GetCompany(ctx, pgClient, user.CompanyID)
	if err != nil {
		h.respondError(err, w)
		return
	}
	_, err = user.CreateAPIToken(ctx, pgClient, user.RoleID, company)
	if err != nil {
		h.respondError(err, w)
		return
	}
	apiTokens, err := pgClient.GetApiTokensByUser(ctx, user.ID)
	if err != nil {
		h.respondError(err, w)
		return
	}
	apiTokenResponse := make([]model.APITokenResponse, len(apiTokens))
	for i, apiToken := range apiTokens {
		apiTokenResponse[i] = model.APITokenResponse{
			ID:              apiToken.ID,
			APIToken:        model.GetAPIToken(user.CompanyNamespace, apiToken.ApiToken),
			Name:            apiToken.Name,
			CompanyID:       apiToken.CompanyID,
			CreatedByUserID: apiToken.CreatedByUserID,
			CreatedAt:       apiToken.CreatedAt,
		}
	}
	user.Password = ""
	h.AuditUserActivity(r, EventAuth, ActionVerifyPassword, user, true)
	_ = httpext.JSON(w, http.StatusOK, apiTokenResponse)
}

func (h *Handler) GetUserFromJWT(requestContext context.Context) (*model.User, int, *postgresql_db.Queries, error) {
	_, claims, err := jwtauth.FromContext(requestContext)
	if err != nil {
		return nil, http.StatusBadRequest, nil, err
	}
	userID, err := utils.GetInt64ValueFromInterfaceMap(claims, "user_id")
	if err != nil {
		return nil, http.StatusInternalServerError, nil, err
	}
	user, statusCode, pgClient, err := model.GetUserByID(requestContext, userID)
	if err != nil {
		return nil, statusCode, pgClient, err
	}
	return user, http.StatusOK, pgClient, nil
}

func (h *Handler) GetAPITokenForConsoleAgent(w http.ResponseWriter, r *http.Request) {
	var ctx context.Context
	if directory.IsNonSaaSDeployment() {
		ctx = directory.NewContextWithNameSpace(directory.NonSaaSDirKey)
	} else {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}
	token, err := pgClient.GetApiTokenByActiveUser(ctx)
	if err != nil {
		h.respondError(err, w)
		return
	}
	_ = httpext.JSON(w, http.StatusOK, model.APIAuthRequest{APIToken: model.GetAPIToken(string(directory.NonSaaSDirKey), token)})
}

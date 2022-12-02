package handler

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/go-chi/jwtauth/v5"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"net/http"
)

const (
	MaxPostRequestSize = 100000 // 100 KB
)

var (
	GrantTypePassword = "password"
	GrantTypeAPIToken = "api_token"
)

func (h *Handler) RegisterUser(w http.ResponseWriter, r *http.Request) {
	var user model.User
	defer r.Body.Close()
	err := httpext.DecodeJSON(r, httpext.NoQueryParams, MaxPostRequestSize, &user)
	if err != nil {
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false})
		return
	}
	err = h.Validator.Struct(user)
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
	emailDomain, _ := model.GetEmailDomain(user.Email)
	c := model.Company{Name: user.Company, EmailDomain: emailDomain}
	company, err := c.Create(ctx, pgClient)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	c.ID = company.ID
	userGroups, err := c.GetDefaultUserGroup(ctx, pgClient)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	role, err := pgClient.GetRoleByName(ctx, model.AdminRole)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	u := model.User{
		FirstName:           user.FirstName,
		LastName:            user.LastName,
		Email:               user.Email,
		Company:             user.Company,
		CompanyID:           company.ID,
		IsActive:            true,
		Groups:              userGroups,
		Role:                role.Name,
		RoleID:              role.ID,
		PasswordInvalidated: false,
		Password:            model.GetEncodedPassword(user.Password),
	}
	createdUser, _, err := u.Create(ctx, pgClient)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	u.ID = createdUser.ID
	accessTokenID, accessToken, err := h.CreatePasswordGrantAccessToken(&user)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	refreshToken, err := h.CreateRefreshToken(accessTokenID, u.ID, GrantTypePassword)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	httpext.JSON(w, http.StatusOK, model.Response{Success: true, Data: model.ResponseAccessToken{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}})
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	_, claims, err := jwtauth.FromContext(r.Context())
	if err != nil {
		httpext.JSON(w, http.StatusBadRequest, model.Response{Success: false, Message: err.Error()})
		return
	}
	userID, ok := claims["user_id"].(int64)
	if !ok {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: "cannot parse jwt"})
		return
	}
	user := model.User{ID: userID}
	ctx := directory.NewGlobalContext()
	pgClient, err := directory.PostgresClient(ctx)
	err = user.LoadFromDb(ctx, pgClient)
	if err != nil {
		httpext.JSON(w, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
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

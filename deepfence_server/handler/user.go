package handler

import (
	"context"
	"fmt"
	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/render"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/jwtauth/v5"
	"net/http"
	"regexp"
	"unicode"
)

var (
	MinCompanyLength    = 3
	MaxCompanyLength    = 32
	CompanyRegex        = regexp.MustCompile(fmt.Sprintf("^[A-Za-z][a-zA-Z0-9-\\s@\\.#&!]{%d,%d}$", MinCompanyLength-1, MaxCompanyLength-1))
	CompanyErrorMessage = "should only contain alphabets, numbers and valid characters"
	MinNameLength       = 2
	MaxNameLength       = 32
	NameRegex           = regexp.MustCompile(fmt.Sprintf("^[A-Za-z][A-Za-z .'-]{%d,%d}$", MinNameLength-1, MaxNameLength-1))
	NameErrorMessage    = "should only contain alphabets, numbers, space and hyphen"
	MinPassLength       = 8
	MaxPassLength       = 32
	GrantTypePassword   = "password"
	GrantTypeAPIToken   = "api_token"
)

func ValidateText(text string, minLength, maxLength int, regex *regexp.Regexp, defaultErrorMessage string) (bool, string) {
	if len(text) < minLength {
		return false, fmt.Sprintf("should be at least %d characters", minLength)
	}
	if len(text) > maxLength {
		return false, fmt.Sprintf("should not be more than %d characters", maxLength)
	}
	if regex.MatchString(text) {
		return true, ""
	}
	return false, defaultErrorMessage
}

func (h *Handler) RegisterUser(w http.ResponseWriter, r *http.Request) {
	var user model.User
	defer r.Body.Close()
	err := render.Decode(r, &user)
	if err != nil {
		render.Respond(w, r, http.StatusBadRequest, model.Response{Success: false})
		return
	}
	errorFields := make(model.InvalidFields)
	valid, errorMsg := ValidateText(user.FirstName, MinNameLength, MaxNameLength, NameRegex, NameErrorMessage)
	if !valid {
		errorFields["first_name"] = errorMsg
	}
	valid, errorMsg = ValidateText(user.LastName, MinNameLength, MaxNameLength, NameRegex, NameErrorMessage)
	if !valid {
		errorFields["last_name"] = errorMsg
	}
	valid, errorMsg = ValidateText(user.Company, MinCompanyLength, MaxCompanyLength, CompanyRegex, CompanyErrorMessage)
	if !valid {
		errorFields["company"] = errorMsg
	}
	valid = utils.ValidateEmail(user.Email)
	if !valid {
		errorFields["email"] = "invalid email"
	}
	valid, errorMsg = ValidatePassword(user.Password)
	if !valid {
		errorFields["password"] = errorMsg
	}
	if len(errorFields) > 0 {
		render.Respond(w, r, http.StatusBadRequest, model.Response{Success: false, ErrorFields: &errorFields})
		return
	}
	// temporary
	pgConn, err := model.NewPostgresDBConnection()
	if err != nil {
		render.Respond(w, r, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	emailDomain, _ := model.GetEmailDomain(user.Email)
	c := model.Company{Name: user.Company, EmailDomain: emailDomain}
	ctx := context.Background()
	company, err := c.Create(ctx)
	if err != nil {
		render.Respond(w, r, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	c.ID = company.ID
	userGroups, err := c.GetDefaultUserGroup(ctx)
	if err != nil {
		render.Respond(w, r, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	role, err := pgConn.Queries.GetRoleByName(ctx, model.AdminRole)
	if err != nil {
		render.Respond(w, r, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
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
		PgConn:              pgConn,
	}
	createdUser, err := u.Create(ctx)
	if err != nil {
		render.Respond(w, r, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	u.ID = createdUser.ID
	accessTokenID, accessToken, err := h.CreatePasswordGrantAccessToken(&user)
	if err != nil {
		render.Respond(w, r, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	refreshToken, err := h.CreateRefreshToken(accessTokenID, u.ID, GrantTypePassword)
	if err != nil {
		render.Respond(w, r, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	render.Respond(w, r, http.StatusOK, model.Response{Success: true, Data: model.ResponseAccessToken{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}})
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	_, claims, err := jwtauth.FromContext(r.Context())
	if err != nil {
		render.Respond(w, r, http.StatusBadRequest, model.Response{Success: false, Message: err.Error()})
		return
	}
	userID, ok := claims["user_id"].(int64)
	if !ok {
		render.Respond(w, r, http.StatusInternalServerError, model.Response{Success: false, Message: "cannot parse jwt"})
		return
	}
	pgConn, err := model.NewPostgresDBConnection()
	if err != nil {
		render.Respond(w, r, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	user := model.User{ID: userID, PgConn: pgConn}
	err = user.LoadFromDb(r.Context())
	if err != nil {
		render.Respond(w, r, http.StatusInternalServerError, model.Response{Success: false, Message: err.Error()})
		return
	}
	render.Respond(w, r, http.StatusOK, model.Response{Success: true, Data: user})
}

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	return
}

func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	return
}

func ValidatePassword(password string) (bool, string) {
	var (
		isUpper       bool
		isLower       bool
		isSpecialChar bool
		isDigit       bool
	)
	if len(password) < MinPassLength {
		return false, fmt.Sprintf("Password should be at least %d characters", MinPassLength)
	}
	if len(password) > MaxPassLength {
		return false, fmt.Sprintf("Password should be at most %d characters", MinPassLength)
	}
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			isUpper = true
		case unicode.IsLower(char):
			isLower = true
		case unicode.IsNumber(char):
			isDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			isSpecialChar = true
		}
	}
	if !isSpecialChar {
		return false, "Password should contain at least 1 special character"
	}
	if !isDigit {
		return false, "Password should contain at least 1 digit"
	}
	if !isUpper {
		return false, "Password should contain at least 1 upper case character"
	}
	if !isLower {
		return false, "Password should contain at least 1 lower case character"
	}
	return true, ""
}

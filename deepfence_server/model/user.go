package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"regexp"
	"strconv"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/go-chi/jwtauth/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

const (
	AdminRole         = "admin"
	StandardUserRole  = "standard-user"
	ReadOnlyRole      = "read-only-user"
	bcryptCost        = 11
	GrantTypePassword = "password"
	GrantTypeAPIToken = "api_token"
)

var (
	AccessTokenExpiry  = time.Minute * 30
	RefreshTokenExpiry = time.Hour * 24
	ErrorMessage       = map[string]string{
		"first_name": "should only contain alphabets, numbers, space and hyphen",
		"last_name":  "should only contain alphabets, numbers, space and hyphen",
		"company":    "should only contain alphabets, numbers and valid characters",
		"api_token":  "api_token must be UUID",
		"email":      "invalid email address",
		"password":   "should contain at least one upper case, lower case, digit and special character",
	}
	CompanyRegex  = regexp.MustCompile("^[A-Za-z][a-zA-Z0-9-\\s@\\.#&!]+$")
	UserNameRegex = regexp.MustCompile("^[A-Za-z][A-Za-z .'-]+$")
)

type ApiToken struct {
	ApiToken         uuid.UUID `json:"api_token"`
	ID               int64     `json:"id"`
	Name             string    `json:"name"`
	CompanyID        int32     `json:"company_id"`
	RoleID           int32     `json:"role_id"`
	GroupID          int32     `json:"group_id"`
	CreatedByUserID  int64     `json:"created_by_user_id"`
	CompanyNamespace string    `json:"company_namespace"`
}

func (a *ApiToken) GetUser(ctx context.Context, pgClient *postgresqlDb.Queries) (*User, error) {
	token, err := pgClient.GetApiTokenByToken(ctx, a.ApiToken)
	if err != nil {
		return nil, err
	}
	u := User{
		ID:                  token.CreatedByUserID,
		FirstName:           token.FirstName,
		LastName:            token.LastName,
		Email:               token.Email,
		Company:             token.CompanyName,
		CompanyID:           token.CompanyID,
		IsActive:            token.IsUserActive,
		Role:                token.RoleName,
		RoleID:              token.RoleID,
		PasswordInvalidated: token.UserPasswordInvalidated,
		CompanyNamespace:    token.CompanyNamespace,
	}
	return &u, nil
}

func (a *ApiToken) Create(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.ApiToken, error) {
	apiToken, err := pgClient.CreateApiToken(ctx, postgresqlDb.CreateApiTokenParams{
		ApiToken:        a.ApiToken,
		Name:            a.Name,
		CompanyID:       a.CompanyID,
		RoleID:          a.RoleID,
		GroupID:         a.GroupID,
		CreatedByUserID: a.CreatedByUserID,
	})
	if err != nil {
		return nil, err
	}
	return &apiToken, nil
}

type Company struct {
	ID          int32  `json:"id"`
	Name        string `json:"name"`
	EmailDomain string `json:"email_domain"`
	Namespace   string `json:"namespace"`
}

func (c *Company) Create(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.Company, error) {
	company, err := pgClient.CreateCompany(ctx, postgresqlDb.CreateCompanyParams{Name: c.Name, EmailDomain: c.EmailDomain, Namespace: c.Namespace})
	if err != nil {
		return nil, err
	}
	return &company, nil
}

func (c *Company) CreateDefaultUserGroup(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.UserGroup, error) {
	group, err := pgClient.CreateUserGroup(ctx, postgresqlDb.CreateUserGroupParams{
		Name: DefaultUserGroup, CompanyID: c.ID, IsSystem: true})
	if err != nil {
		return nil, err
	}
	return &group, nil
}

func (c *Company) GetDefaultUserGroupMap(ctx context.Context, pgClient *postgresqlDb.Queries) (map[string]string, error) {
	groups, err := pgClient.GetUserGroups(ctx, c.ID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if len(groups) > 0 {
		return map[string]string{strconv.Itoa(int(groups[0].ID)): groups[0].Name}, nil
	}
	group, err := c.CreateDefaultUserGroup(ctx, pgClient)
	if err != nil {
		return nil, err
	}
	return map[string]string{strconv.Itoa(int(group.ID)): group.Name}, nil
}

func (c *Company) GetDefaultUserGroup(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.UserGroup, error) {
	groups, err := pgClient.GetUserGroups(ctx, c.ID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if len(groups) > 0 {
		return &groups[0], nil
	}
	group, err := c.CreateDefaultUserGroup(ctx, pgClient)
	if err != nil {
		return nil, err
	}
	return group, nil
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,password,min=8,max=32"`
}

type ApiAuthRequest struct {
	ApiToken string `json:"api_token" validate:"required,uuid4"`
}

type UserRegisterRequest struct {
	FirstName           string `json:"first_name" validate:"required,user_name,min=2,max=32"`
	LastName            string `json:"last_name" validate:"required,user_name,min=2,max=32"`
	Email               string `json:"email" validate:"required,email"`
	Company             string `json:"company" validate:"required,company_name,min=2,max=32"`
	Password            string `json:"password" validate:"required,password,min=8,max=32"`
	IsTemporaryPassword bool   `json:"is_temporary_password"`
	ConsoleURL          string `json:"console_url" validate:"required,url"`
}

type User struct {
	ID                  int64             `json:"id"`
	FirstName           string            `json:"first_name" validate:"required,user_name,min=2,max=32"`
	LastName            string            `json:"last_name" validate:"required,user_name,min=2,max=32"`
	Email               string            `json:"email" validate:"required,email"`
	Company             string            `json:"company" validate:"required,company_name,min=2,max=32"`
	CompanyID           int32             `json:"company_id"`
	IsActive            bool              `json:"is_active"`
	Password            string            `json:"-" validate:"required,password,min=8,max=32"`
	Groups              map[string]string `json:"groups"`
	Role                string            `json:"role"`
	RoleID              int32             `json:"role_id"`
	PasswordInvalidated bool              `json:"password_invalidated"`
	CompanyNamespace    string            `json:"-"`
}

func (u *User) SetPassword(inputPassword string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(inputPassword), bcryptCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

func (u *User) CompareHashAndPassword(ctx context.Context, pgClient *postgresqlDb.Queries, inputPassword string) (bool, error) {
	hashedPassword, err := pgClient.GetPasswordHash(ctx, u.ID)
	if err != nil {
		return false, err
	}
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(inputPassword))
	if err != nil {
		return false, err
	}
	return true, nil
}

func (u *User) LoadFromDbByID(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	// Set ID field and load other fields from db
	var err error
	var user postgresqlDb.GetUserRow
	user, err = pgClient.GetUser(ctx, u.ID)
	if err != nil {
		return err
	}
	u.ID = user.ID
	u.FirstName = user.FirstName
	u.LastName = user.LastName
	u.Email = user.Email
	u.Company = user.CompanyName
	u.CompanyID = user.CompanyID
	u.IsActive = user.IsActive
	u.Role = user.RoleName
	u.RoleID = user.RoleID
	u.PasswordInvalidated = user.PasswordInvalidated
	u.CompanyNamespace = user.CompanyNamespace
	_ = json.Unmarshal(user.GroupIds, &u.Groups)
	return nil
}

func (u *User) LoadFromDbByEmail(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	// Set email field and load other fields from db
	var err error
	var user postgresqlDb.GetUserByEmailRow
	user, err = pgClient.GetUserByEmail(ctx, u.Email)
	if err != nil {
		return err
	}
	u.ID = user.ID
	u.FirstName = user.FirstName
	u.LastName = user.LastName
	u.Email = user.Email
	u.Company = user.CompanyName
	u.CompanyID = user.CompanyID
	u.IsActive = user.IsActive
	u.Role = user.RoleName
	u.RoleID = user.RoleID
	u.PasswordInvalidated = user.PasswordInvalidated
	u.CompanyNamespace = user.CompanyNamespace
	_ = json.Unmarshal(user.GroupIds, &u.Groups)
	return nil
}

func (u *User) Create(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.User, error) {
	groupIDs, err := json.Marshal(MapKeys(u.Groups))
	if err != nil {
		return nil, err
	}
	user, err := pgClient.CreateUser(ctx, postgresqlDb.CreateUserParams{
		FirstName:           u.FirstName,
		LastName:            u.LastName,
		Email:               u.Email,
		RoleID:              u.RoleID,
		GroupIds:            groupIDs,
		CompanyID:           u.CompanyID,
		PasswordHash:        u.Password,
		IsActive:            false,
		PasswordInvalidated: false,
	})
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (u *User) GetAccessToken(tokenAuth *jwtauth.JWTAuth, grantType string) (*ResponseAccessToken, error) {
	accessTokenID, accessToken, err := u.CreateAccessToken(tokenAuth, grantType)
	if err != nil {
		return nil, err
	}
	refreshToken, err := u.CreateRefreshToken(tokenAuth, accessTokenID, grantType)
	if err != nil {
		return nil, err
	}
	return &ResponseAccessToken{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func (u *User) CreateAccessToken(tokenAuth *jwtauth.JWTAuth, grantType string) (string, string, error) {
	accessTokenID := utils.NewUUIDString()
	claims := map[string]interface{}{
		"id":                   accessTokenID,
		"user_id":              u.ID,
		"first_name":           u.FirstName,
		"last_name":            u.LastName,
		"role":                 u.Role,
		"company_id":           u.CompanyID,
		"company":              u.Company,
		"email":                u.Email,
		"is_active":            u.IsActive,
		"grant_type":           grantType,
		directory.NamespaceKey: u.CompanyNamespace,
	}
	jwtauth.SetIssuedNow(claims)
	jwtauth.SetExpiryIn(claims, AccessTokenExpiry)
	_, accessToken, err := tokenAuth.Encode(claims)
	if err != nil {
		return "", "", err
	}
	return accessTokenID, accessToken, nil
}

func (u *User) CreateRefreshToken(tokenAuth *jwtauth.JWTAuth, accessTokenID string, grantType string) (string, error) {
	claims := map[string]interface{}{
		"token_id":             accessTokenID,
		"user":                 u.ID,
		"type":                 "refresh_token",
		"grant_type":           grantType,
		directory.NamespaceKey: u.CompanyNamespace,
	}
	jwtauth.SetIssuedNow(claims)
	jwtauth.SetExpiryIn(claims, RefreshTokenExpiry)
	_, refreshToken, err := tokenAuth.Encode(claims)
	if err != nil {
		return "", err
	}
	return refreshToken, nil
}

package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"os"
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
	AdminRole        = "admin"
	StandardUserRole = "standard-user"
	ReadOnlyRole     = "read-only-user"

	bcryptCost        = 11
	GrantTypePassword = "password"
	GrantTypeAPIToken = "api_token"
)

var (
	AccessTokenExpiry  = time.Minute * 30
	RefreshTokenExpiry = time.Hour * 26
)

func init() {
	accessTokenExpiryStr := os.Getenv("DEEPFENCE_ACCESS_TOKEN_EXPIRY_MINUTES")
	if accessTokenExpiryStr != "" {
		accessTokenExpiry, err := strconv.Atoi(accessTokenExpiryStr)
		if err == nil {
			if accessTokenExpiry > 0 && accessTokenExpiry <= 1440 {
				AccessTokenExpiry = time.Minute * time.Duration(accessTokenExpiry)
			}
		}
	}
}

type APITokenResponse struct {
	ID              int64     `json:"id"`
	APIToken        string    `json:"api_token"`
	Name            string    `json:"name"`
	CompanyID       int32     `json:"company_id"`
	CreatedByUserID int64     `json:"created_by_user_id"`
	CreatedAt       time.Time `json:"created_at"`
}

func GetAPIToken(namespace string, apiToken uuid.UUID) string {
	return utils.Base64RawEncode(namespace + ":" + apiToken.String())
}

type APIToken struct {
	APIToken         uuid.UUID `json:"api_token" required:"true"`
	ID               int64     `json:"id" required:"true"`
	Name             string    `json:"name" required:"true"`
	CompanyID        int32     `json:"company_id" required:"true"`
	RoleID           int32     `json:"role_id" required:"true"`
	GroupID          int32     `json:"group_id" required:"true"`
	CreatedByUserID  int64     `json:"created_by_user_id" required:"true"`
	CompanyNamespace string    `json:"company_namespace" required:"true"`
}

func (a *APIToken) GetUser(ctx context.Context, pgClient *postgresqlDb.Queries) (*User, error) {
	token, err := pgClient.GetApiTokenByToken(ctx, a.APIToken)
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

func (a *APIToken) Create(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.ApiToken, error) {
	apiToken, err := pgClient.CreateApiToken(ctx, postgresqlDb.CreateApiTokenParams{
		ApiToken:        a.APIToken,
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
	ID          int32  `json:"id" required:"true"`
	Name        string `json:"name" required:"true"`
	EmailDomain string `json:"email_domain" required:"true"`
	Namespace   string `json:"namespace" required:"true"`
}

func GetCompany(ctx context.Context, pgClient *postgresqlDb.Queries, companyID int32) (*Company, error) {
	company, err := pgClient.GetCompany(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return &Company{
		ID:          company.ID,
		Name:        company.Name,
		EmailDomain: company.EmailDomain,
		Namespace:   company.Namespace,
	}, err
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

func GetDefaultUserGroupMap(ctx context.Context, pgClient *postgresqlDb.Queries, companyID int32) (map[string]string, error) {
	groups, err := pgClient.GetUserGroups(ctx, companyID)
	if err != nil || len(groups) == 0 {
		return nil, err
	}
	return map[string]string{strconv.Itoa(int(groups[0].ID)): groups[0].Name}, nil
}

func (c *Company) GetDefaultUserGroupMap(ctx context.Context, pgClient *postgresqlDb.Queries) (map[string]string, error) {
	groups, err := GetDefaultUserGroupMap(ctx, pgClient, c.ID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if groups != nil {
		return groups, nil
	}
	group, err := c.CreateDefaultUserGroup(ctx, pgClient)
	if err != nil {
		return nil, err
	}
	return map[string]string{strconv.Itoa(int(group.ID)): group.Name}, nil
}

func GetDefaultUserGroup(ctx context.Context, pgClient *postgresqlDb.Queries, companyID int32) (*postgresqlDb.UserGroup, error) {
	groups, err := pgClient.GetUserGroups(ctx, companyID)
	if err != nil || len(groups) == 0 {
		return nil, err
	}
	return &groups[0], nil
}

func (c *Company) GetDefaultUserGroup(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.UserGroup, error) {
	group, err := GetDefaultUserGroup(ctx, pgClient, c.ID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if group != nil {
		return group, nil
	}
	group, err = c.CreateDefaultUserGroup(ctx, pgClient)
	if err != nil {
		return nil, err
	}
	return group, nil
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email" required:"true"`
	Password string `json:"password" validate:"required,min=1,max=32" required:"true"`
}

type APIAuthRequest struct {
	APIToken string `json:"api_token" validate:"required,api_token" required:"true"`
}

type UserRegisterRequest struct {
	FirstName           string `json:"first_name" validate:"required,user_name,min=2,max=32" required:"true"`
	LastName            string `json:"last_name" validate:"required,user_name,min=2,max=32" required:"true"`
	Email               string `json:"email" validate:"required,email" required:"true"`
	Company             string `json:"company" validate:"required,company_name,min=2,max=32" required:"true"`
	Password            string `json:"password" validate:"required,password,min=8,max=32" required:"true"`
	IsTemporaryPassword bool   `json:"is_temporary_password"`
	ConsoleURL          string `json:"console_url" validate:"required,url" required:"true"`
}

type RegisterInvitedUserRequest struct {
	Namespace           string `json:"namespace" validate:"required,namespace" required:"true"`
	FirstName           string `json:"first_name" validate:"required,user_name,min=2,max=32" required:"true"`
	LastName            string `json:"last_name" validate:"required,user_name,min=2,max=32" required:"true"`
	Password            string `json:"password" validate:"required,password,min=8,max=32" required:"true"`
	IsTemporaryPassword bool   `json:"is_temporary_password"`
	Code                string `json:"code" validate:"required,uuid4" required:"true"`
}

type InviteUserRequest struct {
	Email  string `json:"email" validate:"required,email" required:"true"`
	Role   string `json:"role" validate:"required,oneof=admin standard-user read-only-user" required:"true" enum:"admin,standard-user,read-only-user"`
	Action string `json:"action" validate:"required,oneof=send-invite-email get-invite-link" required:"true" enum:"send-invite-email,get-invite-link"`
}

type InviteUserResponse struct {
	InviteExpiryHours int32  `json:"invite_expiry_hours"`
	InviteURL         string `json:"invite_url"`
	Message           string `json:"message"`
}

type PasswordResetRequest struct {
	Email string `json:"email" validate:"required,email" required:"true"`
}

type PasswordResetVerifyRequest struct {
	Namespace string `json:"namespace" validate:"required,namespace" required:"true"`
	Code      string `json:"code" validate:"required,uuid4" required:"true"`
	Password  string `json:"password" validate:"required,password,min=8,max=32" required:"true"`
}

type UserIDRequest struct {
	ID int64 `path:"id"`
}

type UpdateUserPasswordRequest struct {
	OldPassword string `json:"old_password" validate:"required,password,min=8,max=32" required:"true"`
	NewPassword string `json:"new_password" validate:"required,password,min=8,max=32" required:"true"`
}

type UpdateUserRequest struct {
	FirstName string `json:"first_name" validate:"required,user_name,min=2,max=32"`
	LastName  string `json:"last_name" validate:"required,user_name,min=2,max=32"`
	IsActive  bool   `json:"is_active"`
	Role      string `json:"role" validate:"required,oneof=admin standard-user read-only-user" enum:"admin,standard-user,read-only-user"`
}

type UpdateUserIDRequest struct {
	ID        int64  `path:"id" validate:"required"`
	FirstName string `json:"first_name" validate:"required,user_name,min=2,max=32"`
	LastName  string `json:"last_name" validate:"required,user_name,min=2,max=32"`
	IsActive  bool   `json:"is_active"`
	Role      string `json:"role" validate:"required,oneof=admin standard-user read-only-user" enum:"admin,standard-user,read-only-user"`
}

type User struct {
	ID                  int64             `json:"id"`
	FirstName           string            `json:"first_name" validate:"required,user_name,min=2,max=32" required:"true"`
	LastName            string            `json:"last_name" validate:"required,user_name,min=2,max=32" required:"true"`
	Email               string            `json:"email" validate:"required,email" required:"true"`
	Company             string            `json:"company" validate:"required,company_name,min=2,max=32" required:"true"`
	CompanyID           int32             `json:"company_id"`
	IsActive            bool              `json:"is_active"`
	Password            string            `json:"-" validate:"required,password,min=8,max=32"`
	Groups              map[string]string `json:"groups"`
	Role                string            `json:"role" validate:"oneof=admin standard-user read-only-user" enum:"admin,standard-user,read-only-user"`
	RoleID              int32             `json:"role_id"`
	PasswordInvalidated bool              `json:"password_invalidated"`
	CompanyNamespace    string            `json:"-"`
	CurrentUser         *bool             `json:"current_user,omitempty"`
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

func GetUserByID(ctx context.Context, userID int64) (*User, int, *postgresqlDb.Queries, error) {
	user := User{ID: userID}
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return nil, 0, nil, err
	}
	err = user.LoadFromDBByID(ctx, pgClient)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, http.StatusNotFound, pgClient, errors.New(utils.ErrorUserNotFound)
	} else if err != nil {
		return nil, http.StatusInternalServerError, pgClient, err
	}
	return &user, http.StatusOK, pgClient, nil
}

func (u *User) LoadFromDBByID(ctx context.Context, pgClient *postgresqlDb.Queries) error {
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

func GetUserByEmail(ctx context.Context, email string) (*User, int, *postgresqlDb.Queries, error) {
	user := User{Email: email}
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return nil, http.StatusInternalServerError, pgClient, err
	}
	err = user.LoadFromDBByEmail(ctx, pgClient)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, http.StatusNotFound, pgClient, ErrUserNotFound
	} else if err != nil {
		return nil, http.StatusInternalServerError, pgClient, err
	}
	return &user, http.StatusOK, pgClient, nil
}

func IsFreshSetup(ctx context.Context) (bool, error) {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return false, err
	}
	uc, err := pgClient.CountUsers(ctx)
	if err != nil {
		return false, err
	}
	return uc == 0, nil
}

func (u *User) LoadFromDBByEmail(ctx context.Context, pgClient *postgresqlDb.Queries) error {
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
	groupIDs, err := json.Marshal(utils.MapKeys(u.Groups))
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
		IsActive:            true,
		PasswordInvalidated: false,
	})
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (u *User) UpdatePassword(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	err := pgClient.UpdatePassword(ctx, postgresqlDb.UpdatePasswordParams{
		PasswordHash: u.Password,
		ID:           u.ID,
	})
	if err != nil {
		return err
	}
	return nil
}

func (u *User) Delete(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	return pgClient.DeleteUser(ctx, u.ID)
}

func (u *User) Update(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.User, error) {
	groupIDs, err := json.Marshal(utils.MapKeys(u.Groups))
	if err != nil {
		return nil, err
	}
	user, err := pgClient.UpdateUser(ctx, postgresqlDb.UpdateUserParams{
		FirstName:           u.FirstName,
		LastName:            u.LastName,
		RoleID:              u.RoleID,
		GroupIds:            groupIDs,
		IsActive:            u.IsActive,
		PasswordInvalidated: u.PasswordInvalidated,
		ID:                  u.ID,
	})
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (u *User) GetAccessToken(tokenAuth *jwtauth.JWTAuth, grantType string, licenseActive bool) (*ResponseAccessToken, error) {
	accessTokenID, accessToken, err := u.CreateAccessToken(tokenAuth, grantType, licenseActive)
	if err != nil {
		return nil, err
	}
	refreshToken, err := u.CreateRefreshToken(tokenAuth, accessTokenID, grantType)
	if err != nil {
		return nil, err
	}
	return &ResponseAccessToken{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func (u *User) CreateAccessToken(tokenAuth *jwtauth.JWTAuth, grantType string, licenseActive bool) (string, string, error) {
	accessTokenID := utils.NewUUIDString()
	claims := map[string]interface{}{
		"id":                   accessTokenID,
		"user_id":              u.ID,
		"first_name":           u.FirstName,
		"last_name":            u.LastName,
		"role":                 u.Role,
		"role_id":              u.RoleID,
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

func (u *User) CreateAPIToken(ctx context.Context, pgClient *postgresqlDb.Queries, roleID int32, company *Company) (*postgresqlDb.ApiToken, error) {
	apiToken := APIToken{
		APIToken:        utils.NewUUID(),
		Name:            u.Email,
		CompanyID:       u.CompanyID,
		RoleID:          roleID,
		CreatedByUserID: u.ID,
	}
	defaultGroup, err := company.GetDefaultUserGroup(ctx, pgClient)
	if err != nil {
		return nil, err
	}
	apiToken.GroupID = defaultGroup.ID
	token, err := apiToken.Create(ctx, pgClient)
	if err != nil {
		return nil, err
	}
	return token, nil
}

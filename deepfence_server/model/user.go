package model

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"golang.org/x/crypto/pbkdf2"
	"strings"
	"unicode"
)

const (
	KeyLength    = 16
	IterCount    = 2048
	AdminRole    = "admin"
	UserRole     = "user"
	ReadOnlyRole = "read-only-user"
)

var (
	SaltKey      = []byte(uuid.New().String())
	ErrorMessage = map[string]string{
		"first_name": "should only contain alphabets, numbers, space and hyphen",
		"last_name":  "should only contain alphabets, numbers, space and hyphen",
		"company":    "should only contain alphabets, numbers and valid characters",
	}
)

type ApiToken struct {
	ID              int32  `json:"id"`
	Name            string `json:"name"`
	RoleName        string `json:"role_name"`
	Company         string `json:"company"`
	CompanyID       int32  `json:"company_id"`
	Role            string `json:"role"`
	RoleID          int32  `json:"role_id"`
	CreatedByUser   string `json:"created_by_user"`
	CreatedByUserID int64  `json:"created_by_user_id"`
}

type Company struct {
	ID          int32  `json:"id"`
	Name        string `json:"name"`
	EmailDomain string `json:"email_domain"`
}

func (c *Company) Create(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.Company, error) {
	company, err := pgClient.CreateCompany(ctx, postgresqlDb.CreateCompanyParams{Name: c.Name, EmailDomain: c.EmailDomain})
	if err != nil {
		return nil, err
	}
	return &company, nil
}

func (c *Company) GetDefaultUserGroup(ctx context.Context, pgClient *postgresqlDb.Queries) (map[int32]string, error) {
	groups, err := pgClient.GetUserGroups(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	if len(groups) > 0 {
		return map[int32]string{groups[0].ID: groups[0].Name}, nil
	}
	group, err := pgClient.CreateUserGroup(ctx, postgresqlDb.CreateUserGroupParams{
		Name: DefaultUserGroup, CompanyID: c.ID, IsSystem: true})
	if err != nil {
		return nil, err
	}
	return map[int32]string{group.ID: group.Name}, nil
}

type User struct {
	ID                  int64            `json:"id"`
	FirstName           string           `json:"first_name" validate:"required,min=2,max=32"`
	LastName            string           `json:"last_name" validate:"required,min=2,max=32"`
	Email               string           `json:"email" validate:"required,email"`
	Company             string           `json:"company" validate:"required,min=2,max=32"`
	CompanyID           int32            `json:"company_id"`
	IsActive            bool             `json:"is_active"`
	Password            string           `json:"-"  validate:"required,password,min=8,max=32"`
	Groups              map[int32]string `json:"groups"`
	Role                string           `json:"role"`
	RoleID              int32            `json:"role_id"`
	PasswordInvalidated bool             `json:"password_invalidated"`
}

func MapKeys(input map[int32]string) []int32 {
	keys := make([]int32, len(input))
	i := 0
	for k := range input {
		keys[i] = k
		i++
	}
	return keys
}

func GetEncodedPassword(inputPassword string) string {
	password := pbkdf2.Key([]byte(inputPassword), SaltKey, IterCount, KeyLength, sha256.New)
	return base64.StdEncoding.EncodeToString(password)
}

func (u *User) LoadFromDb(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	// Set ID field and load other fields from db
	user, err := pgClient.GetUser(ctx, u.ID)
	if err != nil {
		return err
	}
	company, err := pgClient.GetCompany(ctx, user.CompanyID)
	if err != nil {
		return err
	}
	u.FirstName = user.FirstName
	u.LastName = user.LastName
	u.Email = user.Email
	u.Company = company.Name
	u.CompanyID = company.ID
	u.IsActive = user.IsActive
	//u.Groups = user.GroupIds
	u.RoleID = user.RoleID
	u.PasswordInvalidated = user.PasswordInvalidated
	return nil
}

func (u *User) Create(ctx context.Context, pgClient *postgresqlDb.Queries) (*postgresqlDb.User, *postgresqlDb.ApiToken, error) {
	groupIDs, err := json.Marshal(MapKeys(u.Groups))
	if err != nil {
		return nil, nil, err
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
		return nil, nil, err
	}
	apiToken, err := pgClient.CreateApiToken(ctx, postgresqlDb.CreateApiTokenParams{
		ApiToken:        uuid.New(),
		Name:            u.FirstName + " " + u.LastName,
		CompanyID:       u.CompanyID,
		RoleID:          u.RoleID,
		CreatedByUserID: user.ID,
	})
	return &user, &apiToken, nil
}

func (u *User) GetAccessToken() *ResponseAccessToken {

	return nil
}

func GetEmailDomain(email string) (string, error) {
	domain := strings.Split(email, "@")
	if len(domain) != 2 {
		return "", errors.New("invalid domain")
	}
	return strings.ToLower(domain[1]), nil
}

// ValidatePassword implements validator.Func
func ValidatePassword(fl validator.FieldLevel) bool {
	var (
		isUpper       bool
		isLower       bool
		isSpecialChar bool
		isDigit       bool
	)
	for _, char := range fl.Field().String() {
		switch {
		case unicode.IsUpper(char):
			isUpper = true
		case unicode.IsLower(char):
			isLower = true
		case unicode.IsNumber(char):
			isDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			isSpecialChar = true
		default:
			return false
		}
	}
	if !isUpper || !isLower || !isSpecialChar || !isDigit {
		return false
	}
	return true
}

func ParseValidatorError(errMsg string) map[string]string {
	fields := make(map[string]string)
	validate := func(errMsg string) string {
		s := strings.SplitN(errMsg, "'", 3)
		if len(s) == 3 {
			s = strings.Split(s[1], ".")
			if len(s) == 2 {
				return strings.ToLower(s[1])
			}
			return strings.ToLower(s[1])
		}
		return strings.ToLower(errMsg)
	}
	for _, msg := range strings.Split(errMsg, "\n") {
		field := validate(msg)
		m, ok := ErrorMessage[field]
		if ok {
			fields[validate(msg)] = m
		} else {
			fields[validate(msg)] = "invalid"
		}
	}
	//CompanyRegex      = regexp.MustCompile(fmt.Sprintf("^[A-Za-z][a-zA-Z0-9-\\s@\\.#&!]{%d,%d}$", MinCompanyLength-1, MaxCompanyLength-1))
	//NameRegex         = regexp.MustCompile(fmt.Sprintf("^[A-Za-z][A-Za-z .'-]{%d,%d}$", MinNameLength-1, MaxNameLength-1))
	return fields
}

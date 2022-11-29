package model

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/google/uuid"
	"golang.org/x/crypto/pbkdf2"
	"strings"
)

const (
	KeyLength    = 16
	IterCount    = 2048
	AdminRole    = "admin"
	UserRole     = "user"
	ReadOnlyRole = "read-only-user"
)

var (
	SaltKey = []byte(uuid.New().String())
)

type ApiToken struct {
	ID            int32           `json:"id"`
	Name          string          `json:"name"`
	RoleName      string          `json:"role_name"`
	CreatedByUser string          `json:"created_by_user"`
	PgConn        *PostgresDBConn `json:"-"`
}

type Company struct {
	ID          int32           `json:"id"`
	Name        string          `json:"name"`
	EmailDomain string          `json:"email_domain"`
	PgConn      *PostgresDBConn `json:"-"`
}

func (c *Company) Create(ctx context.Context) (*postgresqlDb.Company, error) {
	company, err := c.PgConn.Queries.CreateCompany(ctx, postgresqlDb.CreateCompanyParams{Name: c.Name, EmailDomain: c.EmailDomain})
	if err != nil {
		return nil, err
	}
	return &company, nil
}

func (c *Company) GetDefaultUserGroup(ctx context.Context) (map[int32]string, error) {
	groups, err := c.PgConn.Queries.GetUserGroups(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	if len(groups) > 0 {
		return map[int32]string{groups[0].ID: groups[0].Name}, nil
	}
	group, err := c.PgConn.Queries.CreateUserGroup(ctx, postgresqlDb.CreateUserGroupParams{
		Name: DefaultUserGroup, CompanyID: c.ID, IsSystem: true})
	if err != nil {
		return nil, err
	}
	return map[int32]string{group.ID: group.Name}, nil
}

type User struct {
	ID                  int64            `json:"id"`
	FirstName           string           `json:"first_name"`
	LastName            string           `json:"last_name"`
	Email               string           `json:"email"`
	Company             string           `json:"company"`
	CompanyID           int32            `json:"company_id"`
	IsActive            bool             `json:"is_active"`
	Password            string           `json:"-"`
	Groups              map[int32]string `json:"groups"`
	Role                string           `json:"role"`
	RoleID              int32            `json:"role_id"`
	PasswordInvalidated bool             `json:"password_invalidated"`
	PgConn              *PostgresDBConn  `json:"-"`
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

func (u *User) LoadFromDb(ctx context.Context) error {
	// Set ID field and load other fields from db
	user, err := u.PgConn.Queries.GetUser(ctx, u.ID)
	if err != nil {
		return err
	}
	company, err := u.PgConn.Queries.GetCompany(ctx, user.CompanyID)
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

func (u *User) Create(ctx context.Context) (*postgresqlDb.User, error) {
	groupIDs, err := json.Marshal(MapKeys(u.Groups))
	if err != nil {
		return nil, err
	}
	user, err := u.PgConn.Queries.CreateUser(ctx, postgresqlDb.CreateUserParams{
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

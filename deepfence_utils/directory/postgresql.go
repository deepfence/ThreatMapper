package directory

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"

	"github.com/XSAM/otelsql"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	_ "github.com/lib/pq"
)

const (
	ConsoleURLSettingKey = "console_url"
)

type SettingValue struct {
	Label       string      `json:"label"`
	Value       interface{} `json:"value"`
	Description string      `json:"description"`
}

var postgresClientsPool sync.Map

func init() {
	postgresClientsPool = sync.Map{}
}

func newPostgresClient(endpoints DBConfigs) (*postgresqlDb.Queries, error) {
	if endpoints.Postgres == nil {
		return nil, errors.New("No defined postgres config")
	}
	// psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
	// 	endpoints.Postgres.Host, endpoints.Postgres.Port, endpoints.Postgres.Username, endpoints.Postgres.Password, endpoints.Postgres.Database, endpoints.Postgres.SslMode)
	// db, err := sql.Open("postgres", psqlInfo)
	psqlDSN := fmt.Sprintf("postgresql://%s:%s@%s:%d/%s?sslmode=%s",
		endpoints.Postgres.Username, endpoints.Postgres.Password,
		endpoints.Postgres.Host, endpoints.Postgres.Port,
		endpoints.Postgres.Database, endpoints.Postgres.SslMode)
	db, err := otelsql.Open("postgres", psqlDSN)
	db.SetMaxOpenConns(100)
	db.SetMaxIdleConns(10)
	if err != nil {
		return nil, err
	}
	return postgresqlDb.New(db), nil
}

func PostgresClient(ctx context.Context) (*postgresqlDb.Queries, error) {
	driver, err := getClient(ctx, &postgresClientsPool, newPostgresClient)
	if err != nil {
		return nil, err
	}
	return driver, err
}

func GetManagementConsoleURL(ctx context.Context) (string, error) {
	pgClient, err := PostgresClient(ctx)
	if err != nil {
		return "", err
	}
	setting, err := pgClient.GetSetting(ctx, ConsoleURLSettingKey)
	if err != nil {
		return "", err
	}
	var settingVal SettingValue
	err = json.Unmarshal(setting.Value, &settingVal)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%v", settingVal.Value), nil
}

func GetManagementHost(ctx context.Context) (string, error) {
	url, err := GetManagementConsoleURL(ctx)
	if err != nil {
		return "", err
	}
	// Remove scheme if present
	if strings.HasPrefix(url, "http://") {
		return url[7:], nil
	} else if strings.HasPrefix(url, "https://") {
		return url[8:], nil
	}
	return url, nil
}

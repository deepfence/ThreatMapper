package model

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	DefaultUserGroup = "default"
)

var (
	ErrUserNotFound = errors.New("user not found")
	EULAResponse    = MessageResponse{Message: constants.EndUserLicenceAgreement}
)

type MessageResponse struct {
	Message string `json:"message" required:"true"`
}

type ErrorResponse struct {
	Message     string            `json:"message"`
	ErrorFields map[string]string `json:"error_fields"`
	ErrorIndex  map[string][]int  `json:"error_index"`
}

type LoginResponse struct {
	ResponseAccessToken
	OnboardingRequired  bool `json:"onboarding_required" required:"true"`
	PasswordInvalidated bool `json:"password_invalidated" required:"true"`
}

type ResponseAccessToken struct {
	AccessToken  string `json:"access_token" required:"true"`
	RefreshToken string `json:"refresh_token" required:"true"`
}

type FetchWindow struct {
	Offset int `json:"offset" required:"true"`
	Size   int `json:"size" required:"true"`
}

func (fw FetchWindow) FetchWindow2CypherQuery() string {
	if fw.Size == 0 {
		return ""
	}
	return ` SKIP ` + strconv.Itoa(fw.Offset) + ` LIMIT ` + strconv.Itoa(fw.Size)
}

func IsOnboardingRequired(ctx context.Context) bool {
	onboardingRequired, err := isOnboardingRequired(ctx)
	if err != nil {
		log.Error().Msg(err.Error())
	}
	return onboardingRequired
}

func isOnboardingRequired(ctx context.Context) (bool, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return false, err
	}
	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return false, err
	}
	defer session.Close()
	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return false, err
	}
	defer tx.Close()

	res, err := tx.Run(`MATCH (n)
		WHERE (n:Node OR n:KubernetesCluster or n:RegistryAccount or n:CloudNode)
		AND n.active=true
		AND COALESCE(n.pseudo, false)=false
		AND COALESCE(n.is_console_vm, false)=false
		RETURN count(n)`,
		map[string]interface{}{})
	if err != nil {
		return false, err
	}
	rec, err := res.Single()
	if err != nil {
		return false, err
	}
	if rec.Values[0] != nil {
		if rec.Values[0].(int64) == 0 {
			return true, nil
		}
	}
	return false, nil
}

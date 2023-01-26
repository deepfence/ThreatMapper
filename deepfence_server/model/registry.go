package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	commonConstants "github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	postgresqlDb "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
)

type RegistryAddReq struct {
	Name         string                 `json:"name"`
	NonSecret    map[string]interface{} `json:"non_secret"`
	Secret       map[string]interface{} `json:"secret"`
	RegistryType string                 `json:"registry_type"`
}

// todo: add support to list by name and type, id
type RegistryListReq struct{}

type RegistryImageListReq struct {
	ResourceType string `json:"resource_type,omitempty"`
	Namespace    string `json:"namespace,omitempty"`
}

type ImageAndTag struct {
	ImageID             string    `json:"image_id,omitempty"`
	Name                string    `json:"name,omitempty"`
	LastUpdated         time.Time `json:"last_updated,omitempty"`
	LastUpdaterUsername string    `json:"last_updater_username,omitempty"`
	FullSize            int       `json:"full_size,omitempty"`
	V2                  bool      `json:"v2,omitempty"`
	TagStatus           string    `json:"tag_status,omitempty"`
	TagLastPulled       time.Time `json:"tag_last_pulled,omitempty"`
	TagLastPushed       time.Time `json:"tag_last_pushed,omitempty"`
	MediaType           string    `json:"media_type,omitempty"`
	ContentType         string    `json:"content_type,omitempty"`
	Digest              string    `json:"digest,omitempty"`
	Tag                 string    `json:"tag,omitempty"`
	Architecture        string    `json:"architecture,omitempty"`
	Os                  string    `json:"os,omitempty"`
	Size                int       `json:"size,omitempty"`
	Status              string    `json:"status,omitempty"`
	LastPulled          time.Time `json:"last_pulled,omitempty"`
	LastPushed          time.Time `json:"last_pushed,omitempty"`
}

type RegistryImages struct {
	Count    int             `json:"count"`
	Next     string          `json:"next"`
	Previous interface{}     `json:"previous"`
	Results  []RegistryImage `json:"results"`
}

type RegistryImage struct {
	Name              string    `json:"name"`
	Namespace         string    `json:"namespace"`
	RepositoryType    string    `json:"repository_type"`
	Status            int       `json:"status"`
	StatusDescription string    `json:"status_description"`
	Description       string    `json:"description"`
	IsPrivate         bool      `json:"is_private"`
	StarCount         int       `json:"star_count"`
	PullCount         int       `json:"pull_count"`
	LastUpdated       time.Time `json:"last_updated"`
	DateRegistered    time.Time `json:"date_registered"`
	Affiliation       string    `json:"affiliation"`
	MediaTypes        []string  `json:"media_types"`
	ContentTypes      []string  `json:"content_types"`
}

// ListRegistriesSafe doesnot get secret field from DB
func (rl *RegistryListReq) ListRegistriesSafe(ctx context.Context, pgClient *postgresqlDb.Queries) ([]postgresqlDb.GetContainerRegistriesSafeRow, error) {
	return pgClient.GetContainerRegistriesSafe(ctx)
}

func (ra *RegistryAddReq) RegistryExists(ctx context.Context, pgClient *postgresqlDb.Queries) (bool, error) {
	_, err := pgClient.GetContainerRegistryByTypeAndName(ctx, postgresqlDb.GetContainerRegistryByTypeAndNameParams{
		RegistryType: ra.RegistryType,
		Name:         ra.Name,
	})
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	} else if err != nil {
		return false, err
	}
	return true, nil
}

func (ra *RegistryAddReq) GetAESValueForEncryption(ctx context.Context, pgClient *postgresqlDb.Queries) (json.RawMessage, error) {
	s := Setting{}
	aes, err := s.GetSettingByKey(ctx, pgClient, commonConstants.AES_SECRET)
	if err != nil {
		return nil, err
	}
	var sValue SettingValue
	err = json.Unmarshal(aes.Value, &sValue)
	if err != nil {
		return nil, err
	}

	b, err := json.Marshal(sValue.Value)
	if err != nil {
		return nil, err
	}

	return json.RawMessage(b), nil
}

func (ra *RegistryAddReq) CreateRegistry(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	bSecret, err := json.Marshal(ra.Secret)
	if err != nil {
		return err
	}

	bNonSecret, err := json.Marshal(ra.NonSecret)
	if err != nil {
		return err
	}
	extra := "{}"
	_, err = pgClient.CreateContainerRegistry(ctx, postgresqlDb.CreateContainerRegistryParams{
		Name:            ra.Name,
		RegistryType:    ra.RegistryType,
		EncryptedSecret: bSecret,       // rawSecretJSON,
		NonSecret:       bNonSecret,    //rawNonSecretJSON,
		Extras:          []byte(extra), //json.RawMessage([]byte{}),
	})
	return err
}

func (r *RegistryImageListReq) GetRegistryImages(ctx context.Context) ([]ImageAndTag, error) {
	return GetContainerImagesFromRegistryAndNamespace(ctx, r.ResourceType, r.Namespace)
}

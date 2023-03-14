package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"sort"
	"strconv"
	"time"

	commonConstants "github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	pkgConst "github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	postgresqlDb "github.com/deepfence/golang_deepfence_sdk/utils/postgresql/postgresql-db"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/dbtype"
	"github.com/rs/zerolog/log"
)

type RegistryAddReq struct {
	Name         string                 `json:"name"`
	NonSecret    map[string]interface{} `json:"non_secret"`
	Secret       map[string]interface{} `json:"secret"`
	Extras       map[string]interface{} `json:"extras"`
	RegistryType string                 `json:"registry_type"`
}

type RegistryIDPathReq struct {
	RegistryId string `path:"registry_id" validate:"required" required:"true"`
}

type RegistryImagesReq struct {
	RegistryId string      `json:"registry_id" validate:"required" required:"true"`
	Window     FetchWindow `json:"window"`
}

type RegistryImageTagsReq struct {
	RegistryId string      `json:"registry_id" validate:"required" required:"true"`
	ImageName  string      `json:"image_name" validate:"required" required:"true"`
	Window     FetchWindow `json:"window"`
}

type RegistryCountResp struct {
	Count int `json:"count"`
}

type RegistryTypeReq struct {
	RegistryType string `path:"registry_type" validate:"required" required:"true"`
}

// todo: add support to list by name and type, id
type RegistryListReq struct{}

type RegistryImageListReq struct {
	ResourceType string `json:"resource_type,omitempty"`
	Namespace    string `json:"namespace,omitempty"`
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

type RegistryListResp struct {
	ID           int32           `json:"id"`
	NodeID       string          `json:"node_id"`
	Name         string          `json:"name"`
	RegistryType string          `json:"registry_type"`
	NonSecret    json.RawMessage `json:"non_secret"`
	CreatedAt    int64           `json:"created_at"`
	UpdatedAt    int64           `json:"updated_at"`
}

type RegistrySummaryAllResp map[string]Summary

type Summary struct {
	Images          int `json:"images"`
	Registries      int `json:"registries"`
	ScansComplete   int `json:"scans_complete"`
	ScansInProgress int `json:"scans_in_progress"`
	ScansTotal      int `json:"scans_total"`
	Tags            int `json:"tags"`
}

// ListRegistriesSafe doesnot get secret field from DB
func (rl *RegistryListReq) ListRegistriesSafe(ctx context.Context, pgClient *postgresqlDb.Queries) ([]postgresqlDb.GetContainerRegistriesSafeRow, error) {
	return pgClient.GetContainerRegistriesSafe(ctx)
}

// DeleteRegistry from DB
func DeleteRegistry(ctx context.Context, pgClient *postgresqlDb.Queries, r int32) error {
	return pgClient.DeleteContainerRegistry(ctx, r)
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

	bExtras, err := json.Marshal(ra.Extras)
	if err != nil {
		return err
	}

	_, err = pgClient.CreateContainerRegistry(ctx, postgresqlDb.CreateContainerRegistryParams{
		Name:            ra.Name,
		RegistryType:    ra.RegistryType,
		EncryptedSecret: bSecret,    // rawSecretJSON,
		NonSecret:       bNonSecret, // rawNonSecretJSON,
		Extras:          bExtras,    // rawExtrasJSON,
	})
	return err
}

func (r *RegistryImageListReq) GetRegistryImages(ctx context.Context) ([]ContainerImage, error) {
	return GetContainerImagesFromRegistryAndNamespace(ctx, r.ResourceType, r.Namespace)
}

type ContainerImageWithTags struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	Tags    []string `json:"tags"`
	Size    string   `json:"size"`
	Created int64    `json:"created"`
	Updated int64    `json:"updated"`
}

func (i *ContainerImageWithTags) AddTags(tags ...string) ContainerImageWithTags {
	i.Tags = append(i.Tags, tags...)
	return *i
}

func toContainerImageWithTags(data map[string]interface{}) (ContainerImageWithTags, error) {
	var image ContainerImageWithTags

	var ok bool
	var val interface{}

	if val, ok = data["node_id"]; !ok {
		return image, errors.New("missing node_id")
	}
	image.ID = val.(string)

	if val, ok = data["docker_image_name"]; !ok {
		return image, errors.New("missing docker_image_name")
	}
	image.Name = val.(string)

	if val, ok = data["docker_image_tag"]; !ok {
		return image, errors.New("missing docker_image_tag")
	}
	image.Tags = []string{val.(string)}

	if val, ok = data["docker_image_size"]; !ok {
		return image, errors.New("missing docker_image_size")
	}
	image.Size = val.(string)

	if val, ok = data["metadata"]; !ok {
		return image, errors.New("missing metadata")
	}
	log.Info().Msgf("metadata: %+v", val)
	if metadata, ok := val.(map[string]interface{}); ok {
		if val, ok = metadata["last_updated"]; ok {
			if updatedString, ok := val.(string); ok {
				var err error
				if image.Updated, err = strconv.ParseInt(updatedString, 10, 64); err != nil {
					return image, err
				}
			}
		}
	}

	return image, nil
}

func ListImages(ctx context.Context, registryId int32, fw FetchWindow) ([]ContainerImageWithTags, error) {

	images := []ContainerImageWithTags{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return images, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return images, err
	}
	defer tx.Close()

	query := `
	MATCH (n:RegistryAccount{container_registry_id:$id}) -[:HOSTS]-> (m:ContainerImage)
	RETURN m
	ORDER BY m.node_id
	` + fw.FetchWindow2CypherQuery()
	r, err := tx.Run(query, map[string]interface{}{"id": registryId})
	if err != nil {
		return images, err
	}

	records, err := r.Collect()
	if err != nil {
		return images, err
	}

	ri := map[string]ContainerImageWithTags{}

	for _, rec := range records {
		data, has := rec.Get("m")
		if !has {
			log.Warn().Msgf("Missing neo4j entry")
			continue
		}
		da, ok := data.(dbtype.Node)
		if !ok {
			log.Warn().Msgf("Missing neo4j entry")
			continue
		}

		node, err := toContainerImageWithTags(da.Props)
		if err != nil {
			log.Warn().Msgf("Missing neo4j entry: %s", err.Error())
			continue
		}

		i, ok := ri[node.Name]
		if ok {
			ri[node.Name] = i.AddTags(node.Tags...)
		} else {
			ri[node.Name] = node
		}
	}

	// sort response
	keys := make([]string, 0, len(ri))
	for k := range ri {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, v := range keys {
		images = append(images, ri[v])
	}

	return images, nil
}

func toContainerImage(data map[string]interface{}) ContainerImage {
	image := ContainerImage{
		ID:   data["node_id"].(string),
		Name: data["docker_image_name"].(string),
		Tag:  data["docker_image_tag"].(string),
		Size: data["docker_image_size"].(string),
	}

	md := data["metadata"].(string)
	var metadata Metadata
	if err := json.Unmarshal([]byte(md), &metadata); err != nil {
		log.Error().Msg(err.Error())
	}

	image.Metadata = metadata

	return image
}

func ListImageTags(ctx context.Context, registryId int32, imageName string, fw FetchWindow) ([]ContainerImage, error) {

	imageTags := []ContainerImage{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return imageTags, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return imageTags, err
	}
	defer tx.Close()

	query := `
	MATCH (n:RegistryAccount{container_registry_id:$id}) -[:HOSTS]-> (m:ContainerImage{docker_image_name:$name})
	RETURN m
	ORDER BY m.node_id
	` + fw.FetchWindow2CypherQuery()
	r, err := tx.Run(query, map[string]interface{}{"id": registryId, "name": imageName})
	if err != nil {
		return imageTags, err
	}

	records, err := r.Collect()
	if err != nil {
		return imageTags, err
	}

	for _, rec := range records {
		data, has := rec.Get("m")
		if !has {
			log.Warn().Msgf("Missing neo4j entry")
			continue
		}
		da, ok := data.(dbtype.Node)
		if !ok {
			log.Warn().Msgf("Missing neo4j entry")
			continue
		}
		imageTags = append(imageTags, toContainerImage(da.Props))
	}

	// sort response
	sort.SliceStable(imageTags, func(i, j int) bool {
		return imageTags[i].Tag < imageTags[j].Tag
	})

	return imageTags, nil
}

func toScansCount(scans []interface{}) Summary {
	counts := Summary{}
	for _, n := range scans {
		counts.ScansTotal++
		l := n.(string)
		switch l {
		case utils.SCAN_STATUS_SUCCESS, utils.SCAN_STATUS_FAILED:
			counts.ScansComplete++
		default:
			counts.ScansInProgress++
		}
	}
	return counts
}

func RegistrySummary(ctx context.Context, registryId *int32, registryType *string) (Summary, error) {

	count := Summary{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return count, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return count, err
	}
	defer tx.Close()

	queryPerRegistry := `
	MATCH (n:RegistryAccount{container_registry_id:$id})-[:HOSTS]->(m:ContainerImage)
	WITH
		COUNT(distinct m.docker_image_name) AS images,
		COUNT(m.docker_image_tag) AS tags,
		COUNT(distinct n) AS registries
	OPTIONAL MATCH (s)-[:SCANNED]->()<-[:HOSTS]-(a:RegistryAccount{container_registry_id:$id})
	RETURN COLLECT(s.status) AS scan_status, images, tags, registries
	`

	queryRegistriesByType := `
	MATCH (n:RegistryAccount{registry_type:$type})-[:HOSTS]->(m:ContainerImage)
	WITH
		COUNT(distinct m.docker_image_name) AS images,
		COUNT(m.docker_image_tag) AS tags,
		COUNT(distinct n) AS registries
	OPTIONAL MATCH (s)-[:SCANNED]->()<-[:HOSTS]-(a:RegistryAccount{registry_type:$type})
	RETURN COLLECT(s.status) AS scan_status, images, tags, registries
	`

	queryAllRegistries := `
	MATCH (n:RegistryAccount)-[:HOSTS]->(m:ContainerImage)
	WITH
		COUNT(distinct m.docker_image_name) AS images,
		COUNT(m.docker_image_tag) AS tags,
		COUNT(distinct n) AS registries
	OPTIONAL MATCH (s)-[:SCANNED]->()<-[:HOSTS]-(a:RegistryAccount)
	RETURN COLLECT(s.status) AS scan_status, images, tags, registries
	`

	var (
		result neo4j.Result
	)
	if registryId != nil {
		if result, err = tx.Run(queryPerRegistry, map[string]interface{}{"id": *registryId}); err != nil {
			log.Error().Err(err).Msgf("failed to query summary for registry id %d", *registryId)
			return count, err
		}
	} else if registryType != nil {
		if result, err = tx.Run(queryRegistriesByType, map[string]interface{}{"type": *registryType}); err != nil {
			log.Error().Err(err).Msgf("failed to query summary for registry type %s", *registryType)
			return count, err
		}
	} else {
		if result, err = tx.Run(queryAllRegistries, map[string]interface{}{}); err != nil {
			log.Error().Err(err).Msgf("failed to query summary for all registries")
			return count, err
		}
	}

	record, err := result.Single()
	if err != nil {
		return count, err
	}

	images, has := record.Get("images")
	if !has {
		log.Warn().Msgf("images not found in query result")
	}

	tags, has := record.Get("tags")
	if !has {
		log.Warn().Msg("tags not found in query result")
	}

	registries, has := record.Get("registries")
	if !has {
		log.Warn().Msg("registries not found in query result")
	}

	scansStatus, has := record.Get("scan_status")
	if !has {
		log.Warn().Msg("scan_status not found in query result")
	}

	count = toScansCount(scansStatus.([]interface{}))
	count.Images = int(images.(int64))
	count.Tags = int(tags.(int64))
	count.Registries = int(registries.(int64))

	return count, nil
}

func RegistrySummaryAll(ctx context.Context) (RegistrySummaryAllResp, error) {

	count := RegistrySummaryAllResp{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return count, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return count, err
	}
	defer tx.Close()

	queryRegistriesByType := `
	MATCH (n:RegistryAccount{registry_type:$type})-[:HOSTS]->(m:ContainerImage)
	WITH
		COUNT(distinct m.docker_image_name) AS images,
		COUNT(m.docker_image_tag) AS tags,
		COUNT(distinct n) AS registries
	OPTIONAL MATCH (s)-[:SCANNED]->()<-[:HOSTS]-(a:RegistryAccount{registry_type:$type})
	RETURN COLLECT(s.status) AS scan_status, images, tags, registries
	`

	for _, t := range pkgConst.RegistryTypes {
		var (
			result neo4j.Result
			rCount = Summary{}
		)

		if result, err = tx.Run(queryRegistriesByType, map[string]interface{}{"type": t}); err != nil {
			log.Error().Err(err).Msgf("failed to query summary for registry type %s", t)
			count[t] = rCount
			continue
		}

		record, err := result.Single()
		if err != nil {
			count[t] = rCount
			continue
		}

		images, has := record.Get("images")
		if !has {
			log.Warn().Msgf("images not found in query result")
		}

		tags, has := record.Get("tags")
		if !has {
			log.Warn().Msg("tags not found in query result")
		}

		registries, has := record.Get("registries")
		if !has {
			log.Warn().Msg("registries not found in query result")
		}

		scansStatus, has := record.Get("scan_status")
		if !has {
			log.Warn().Msg("scan_status not found in query result")
		}

		rCount = toScansCount(scansStatus.([]interface{}))
		rCount.Images = int(images.(int64))
		rCount.Tags = int(tags.(int64))
		rCount.Registries = int(registries.(int64))

		count[t] = rCount
	}

	return count, nil
}

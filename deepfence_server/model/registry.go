package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"strings"
	"time"

	commonConstants "github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	pkgConst "github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/dbtype"
	"github.com/rs/zerolog/log"
	"github.com/samber/mo"
)

type RegistryAddReq struct {
	Name         string                 `json:"name" validate:"required,min=2,max=64" required:"true"`
	NonSecret    map[string]interface{} `json:"non_secret"`
	Secret       map[string]interface{} `json:"secret"`
	Extras       map[string]interface{} `json:"extras"`
	RegistryType string                 `json:"registry_type" validate:"required" required:"true"`
}

type RegistryGCRAddReq struct {
	Name               string         `formData:"name" json:"name" validate:"required,min=2,max=64" required:"true"`
	RegistryURL        string         `formData:"registry_url" json:"registry_url" validate:"required,url" required:"true"`
	ServiceAccountJson multipart.File `formData:"service_account_json" json:"service_account_json" validate:"required" required:"true"`
}

type RegistryUpdateReq struct {
	Id           string                 `path:"registry_id" validate:"required" required:"true"`
	Name         string                 `json:"name" validate:"required,min=2,max=64" required:"true"`
	NonSecret    map[string]interface{} `json:"non_secret"`
	Secret       map[string]interface{} `json:"secret"`
	Extras       map[string]interface{} `json:"extras"`
	RegistryType string                 `json:"registry_type" validate:"required" required:"true"`
}

type RegistryIDPathReq struct {
	RegistryId string `path:"registry_id" validate:"required" required:"true"`
}

type RegistryImagesReq struct {
	RegistryId  string                  `json:"registry_id" validate:"required" required:"true"`
	ImageFilter reporters.FieldsFilters `json:"image_filter" required:"true"`
	Window      FetchWindow             `json:"window" required:"true"`
}

type RegistryImageStubsReq struct {
	RegistryId  string                  `json:"registry_id" validate:"required" required:"true"`
	ImageFilter reporters.FieldsFilters `json:"image_filter" required:"true"`
	Window      FetchWindow             `json:"window" required:"true"`
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
	IsSyncing    bool            `json:"is_syncing"`
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

func (rl *RegistryListReq) IsRegistrySyncing(ctx context.Context, rid string) bool {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return false
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return false
	}
	defer tx.Close()

	query := `
	MATCH (n:RegistryAccount{node_id: $id})
	RETURN n.syncing`

	r, err := tx.Run(query, map[string]interface{}{"id": rid})
	if err != nil {
		return false
	}

	record, err := r.Single()
	if err != nil {
		return false
	}

	if record.Values[0] == nil {
		log.Warn().Msgf("syncing not found in query result: record: %+v", record)
		return false
	}

	isSyncing, has := record.Values[0].(bool)
	if !has {
		log.Warn().Msgf("boolean assertion failed: record: %+v", record)
		return false
	}

	return isSyncing
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

func (ra *RegistryAddReq) CreateRegistry(ctx context.Context, rContext context.Context, pgClient *postgresqlDb.Queries, ns string) (int32, error) {
	bSecret, err := json.Marshal(ra.Secret)
	if err != nil {
		return 0, err
	}

	bNonSecret, err := json.Marshal(ra.NonSecret)
	if err != nil {
		return 0, err
	}

	bExtras, err := json.Marshal(ra.Extras)
	if err != nil {
		return 0, err
	}

	_, err = pgClient.CreateContainerRegistry(ctx, postgresqlDb.CreateContainerRegistryParams{
		Name:            ra.Name,
		RegistryType:    ra.RegistryType,
		EncryptedSecret: bSecret,    // rawSecretJSON,
		NonSecret:       bNonSecret, // rawNonSecretJSON,
		Extras:          bExtras,    // rawExtrasJSON,
	})
	if err != nil {
		return 0, err
	}

	cr, err := pgClient.GetContainerRegistryByTypeAndName(ctx, postgresqlDb.GetContainerRegistryByTypeAndNameParams{
		RegistryType: ra.RegistryType,
		Name:         ra.Name,
	})
	if err != nil {
		return 0, err
	}

	driver, err := directory.Neo4jClient(rContext)
	if err != nil {
		return 0, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return 0, err
	}
	defer tx.Close()

	registryID := GetRegistryID(ra.RegistryType, ns)
	query := `
		MERGE (m:RegistryAccount{node_id: $node_id })
		SET m.registry_type = $registry_type,
		m.syncing = false,
		m.container_registry_ids = REDUCE(distinctElements = [], element IN COALESCE(m.container_registry_ids, []) + $pgId | CASE WHEN NOT element in distinctElements THEN distinctElements + element ELSE distinctElements END)`
	_, err = tx.Run(query, map[string]interface{}{"node_id": registryID, "registry_type": ra.RegistryType, "pgId": cr.ID})
	if err != nil {
		return 0, err
	}

	return cr.ID, tx.Commit()
}

func (ru *RegistryUpdateReq) UpdateRegistry(ctx context.Context, pgClient *postgresqlDb.Queries, r int32) error {
	bSecret, err := json.Marshal(ru.Secret)
	if err != nil {
		return err
	}

	bNonSecret, err := json.Marshal(ru.NonSecret)
	if err != nil {
		return err
	}

	bExtras, err := json.Marshal(ru.Extras)
	if err != nil {
		return err
	}

	_, err = pgClient.UpdateContainerRegistry(ctx, postgresqlDb.UpdateContainerRegistryParams{
		ID:              r,
		Name:            ru.Name,
		RegistryType:    ru.RegistryType,
		EncryptedSecret: bSecret,    // rawSecretJSON,
		NonSecret:       bNonSecret, // rawNonSecretJSON,
		Extras:          bExtras,    // rawExtrasJSON,
	})
	return err
}

func (ru *RegistryUpdateReq) RegistryExists(ctx context.Context, pgClient *postgresqlDb.Queries, id int32) (bool, error) {
	registry, err := pgClient.GetContainerRegistry(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	} else if err != nil {
		return false, err
	}

	if ru.Name == "" {
		ru.Name = registry.Name
	}
	// kludge: should we allow changing registry type?
	if ru.RegistryType == "" {
		ru.RegistryType = registry.RegistryType
	}
	if ru.Secret == nil {
		err = json.Unmarshal(registry.EncryptedSecret, &ru.Secret)
		if err != nil {
			return false, err
		}
	}
	if ru.NonSecret == nil {
		err = json.Unmarshal(registry.NonSecret, &ru.NonSecret)
		if err != nil {
			return false, err
		}
	}
	if ru.Extras == nil {
		err = json.Unmarshal(registry.Extras, &ru.Extras)
		if err != nil {
			return false, err
		}
	}
	return true, nil
}

func GetAESValueForEncryption(ctx context.Context, pgClient *postgresqlDb.Queries) (json.RawMessage, error) {
	aes, err := GetSettingByKey(ctx, pgClient, commonConstants.AES_SECRET)
	if err != nil {
		return nil, err
	}

	b, err := json.Marshal(aes.Value.Value)
	if err != nil {
		return nil, err
	}

	return json.RawMessage(b), nil
}

func (r *RegistryImageListReq) GetRegistryImages(ctx context.Context) ([]ContainerImage, error) {
	return GetContainerImagesFromRegistryAndNamespace(ctx, r.ResourceType, r.Namespace)
}

type ImageStub struct {
	ID   string   `json:"id"`
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

func (i *ImageStub) AddTags(tags ...string) ImageStub {
	i.Tags = append(i.Tags, tags...)
	return *i
}

func ListImageStubs(ctx context.Context, registryId string, filter reporters.FieldsFilters, fw FetchWindow) ([]ImageStub, error) {

	images := []ImageStub{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return images, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return images, err
	}
	defer tx.Close()

	err = checkRegistryExists(tx, registryId)
	if err != nil {
		return images, err
	}

	query := `
	MATCH (n:RegistryAccount{node_id: $id}) -[:HOSTS]-> (l:ImageStub)
	` + reporters.ParseFieldFilters2CypherWhereConditions("l", mo.Some(filter), true) + `
	WITH distinct l.docker_image_name as name, l.tags as tags, l.node_id as id
	RETURN name, tags, id
	ORDER BY name
	` + fw.FetchWindow2CypherQuery()
	r, err := tx.Run(query, map[string]interface{}{"id": registryId})
	if err != nil {
		return images, err
	}

	records, err := r.Collect()
	if err != nil {
		return images, err
	}

	for i := range records {
		tags := []string{}
		if records[i].Values[1] != nil {
			arr := records[i].Values[1].([]interface{})
			for j := range arr {
				tags = append(tags, arr[j].(string))
			}
		}
		images = append(images,
			ImageStub{
				ID:   records[i].Values[0].(string),
				Name: records[i].Values[0].(string),
				Tags: tags,
			},
		)
	}

	return images, nil
}

func ListImages(ctx context.Context, registryId string, filter reporters.FieldsFilters, fw FetchWindow) ([]ContainerImage, error) {

	res := []ContainerImage{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	err = checkRegistryExists(tx, registryId)
	if err != nil {
		return res, err
	}

	query := `
	MATCH (n:RegistryAccount{node_id: $id}) -[:HOSTS]-> (l:ImageStub) <-[:IS]- (m:ContainerImage)
	` + reporters.ParseFieldFilters2CypherWhereConditions("m", mo.Some(filter), true) + `
	RETURN l, m
	` + fw.FetchWindow2CypherQuery()
	log.Info().Msgf("query: %v", query)
	r, err := tx.Run(query, map[string]interface{}{"id": registryId})
	if err != nil {
		return res, err
	}

	records, err := r.Collect()
	if err != nil {
		return res, err
	}

	for _, rec := range records {
		lValue, hasL := rec.Get("l")
		mValue, hasM := rec.Get("m")
		if !hasL || !hasM {
			log.Warn().Msgf("Missing neo4j entry")
			continue
		}

		l, ok := lValue.(dbtype.Node)
		if !ok {
			log.Warn().Msgf("Missing neo4j entry")
			continue
		}
		m, ok := mValue.(dbtype.Node)
		if !ok {
			log.Warn().Msgf("Missing neo4j entry")
			continue
		}

		var node ContainerImage
		utils.FromMap(m.Props, &node)
		dockerImageNameVal, exists := l.Props["docker_image_name"]
		if exists {
			var tagList []string
			dockerImageName, _ := dockerImageNameVal.(string)
			for _, imageTag := range node.DockerImageTagList {
				tokens := strings.Split(imageTag, ":")
				if len(tokens) > 1 {
					if tokens[0] == dockerImageName {
						tagList = append(tagList, tokens[1])
					}
				} else {
					tagList = append(tagList, imageTag)
				}
			}
			node.DockerImageTagList = tagList
		}
		node.Tag = strings.Join(node.DockerImageTagList, ", ")
		res = append(res, node)
	}

	return res, nil
}

func checkRegistryExists(tx neo4j.Transaction, node_id string) error {
	query := `
	MATCH (n:RegistryAccount{node_id: $id})
	RETURN n.node_id`

	r, err := tx.Run(query, map[string]interface{}{"id": node_id})
	if err != nil {
		return err
	}

	_, err = r.Single()
	if err != nil {
		return &ingesters.NodeNotFoundError{NodeId: node_id}
	}
	return nil
}

func GetRegistryPgIds(ctx context.Context, node_id string) ([]int64, error) {

	res := []int64{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()
	query := `
	MATCH (n:RegistryAccount{node_id: $id})
	RETURN n.container_registry_ids`

	r, err := tx.Run(query, map[string]interface{}{"id": node_id})
	if err != nil {
		return res, err
	}

	record, err := r.Single()
	if err != nil {
		return res, err
	}

	for _, rec := range record.Values[0].([]interface{}) {
		res = append(res, rec.(int64))
	}

	return res, err
}

func DeleteRegistryAccount(ctx context.Context, node_id string) error {

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	query := fmt.Sprintf("MATCH (n:RegistryAccount{node_id:'%s'}) DETACH DELETE n", node_id)
	log.Info().Msgf("delete registry account query: %s", query)

	_, err = tx.Run(query, map[string]interface{}{})
	if err != nil {
		log.Error().Msgf("%v", err)
		return err
	}

	return tx.Commit()
}

func toScansCount(scans []interface{}) Summary {
	counts := Summary{}
	for _, n := range scans {
		counts.ScansTotal++
		l := n.(string)
		switch l {
		case utils.ScanStatusSuccess, utils.ScanStatusFailed:
			counts.ScansComplete++
		default:
			counts.ScansInProgress++
		}
	}
	return counts
}

func RegistrySummary(ctx context.Context, registryId mo.Option[string], registryType mo.Option[string]) (Summary, error) {

	count := Summary{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return count, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return count, err
	}
	defer tx.Close()

	queryPerRegistry := `
	MATCH (n:RegistryAccount{node_id:$id})-[:HOSTS]->(m:ContainerImage)
	WITH
		COUNT(distinct m.docker_image_name) AS images,
		COUNT(m.docker_image_tag) AS tags,
		COUNT(distinct n) AS registries
	OPTIONAL MATCH (s)-[:SCANNED]->()<-[:HOSTS]-(a:RegistryAccount)
	WHERE $id IN a.container_registry_ids
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
	if regId, ok := registryId.Get(); ok {
		if result, err = tx.Run(queryPerRegistry, map[string]interface{}{"id": regId}); err != nil {
			log.Error().Err(err).Msgf("failed to query summary for registry id %v", regId)
			return count, err
		}
	} else if regType, ok := registryType.Get(); ok {
		if result, err = tx.Run(queryRegistriesByType, map[string]interface{}{"type": regType}); err != nil {
			log.Error().Err(err).Msgf("failed to query summary for registry type %s", regType)
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

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
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

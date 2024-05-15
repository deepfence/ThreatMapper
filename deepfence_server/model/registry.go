package model

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"mime/multipart"
	"strings"
	"time"

	commonConstants "github.com/deepfence/ThreatMapper/deepfence_server/constants/common"
	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	pkgConst "github.com/deepfence/ThreatMapper/deepfence_server/pkg/constants"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/dbtype"
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
	ServiceAccountJSON multipart.File `formData:"service_account_json" json:"service_account_json" validate:"required" required:"true"`
}

type RegistryUpdateReq struct {
	ID           string                 `path:"registry_id" validate:"required" required:"true"`
	Name         string                 `json:"name" validate:"required,min=2,max=64" required:"true"`
	NonSecret    map[string]interface{} `json:"non_secret"`
	Secret       map[string]interface{} `json:"secret"`
	Extras       map[string]interface{} `json:"extras"`
	RegistryType string                 `json:"registry_type" validate:"required" required:"true"`
}

type RegistryIDPathReq struct {
	RegistryID string `path:"registry_id" validate:"required" required:"true"`
}

type RegistryImagesReq struct {
	RegistryID      string                  `json:"registry_id" validate:"required" required:"true"`
	ImageFilter     reporters.FieldsFilters `json:"image_filter" required:"true"`
	ImageStubFilter reporters.FieldsFilters `json:"image_stub_filter" required:"true"`
	Window          FetchWindow             `json:"window" required:"true"`
}

type DeleteRegistryBulkReq struct {
	RegistryIds []string `json:"registry_ids" validate:"required" required:"true"`
}

type RegistryImageStubsReq struct {
	RegistryID  string                  `json:"registry_id" validate:"required" required:"true"`
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
	ID           int32  `json:"id"`
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
	Repositories    int `json:"repositories"`
	Registries      int `json:"registries"`
	Images          int `json:"images"`
	ScansComplete   int `json:"scans_complete"`
	ScansInProgress int `json:"scans_in_progress"`
	ScansTotal      int `json:"scans_total"`
}

type SummaryOld struct {
	Images          int `json:"images"`
	Registries      int `json:"registries"`
	ScansComplete   int `json:"scans_complete"`
	ScansInProgress int `json:"scans_in_progress"`
	ScansTotal      int `json:"scans_total"`
	Tags            int `json:"tags"`
}

var queryRegistryCountByType = `    
	MATCH (n:RegistryAccount{registry_type:$type})
    RETURN COUNT(distinct n) as registries
	`

var queryRegistriesByType = `
	MATCH (n:RegistryAccount{registry_type:$type})-[:HOSTS]->(i:ImageStub)-[:IS]-(m:ContainerImage)<-[:HOSTS]-(n)
    WITH COUNT(distinct i.docker_image_name) AS repositories,
		COUNT(distinct m.docker_image_id) AS images
    OPTIONAL MATCH (s)-[:SCANNED]->()<-[:HOSTS]-(:RegistryAccount{registry_type:$type})
    RETURN COLLECT(s.status) AS scan_status, repositories, images
	`

// ListRegistriesSafe doesnot get secret field from DB
func (rl *RegistryListReq) ListRegistriesSafe(ctx context.Context,
	pgClient *postgresqlDb.Queries) ([]postgresqlDb.GetContainerRegistriesSafeRow, error) {
	ctx, span := telemetry.NewSpan(ctx, "registry", "list-registries-safe")
	defer span.End()
	return pgClient.GetContainerRegistriesSafe(ctx)
}

func (rl *RegistryListReq) IsRegistrySyncing(ctx context.Context, rid string) bool {

	ctx, span := telemetry.NewSpan(ctx, "registry", "is-registry-syncing")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return false
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return false
	}
	defer tx.Close(ctx)

	query := `
	MATCH (n:RegistryAccount{node_id: $id})
	RETURN n.syncing`

	r, err := tx.Run(ctx, query, map[string]interface{}{"id": rid})
	if err != nil {
		return false
	}

	record, err := r.Single(ctx)
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
	ctx, span := telemetry.NewSpan(ctx, "registry", "delete-registry")
	defer span.End()
	return pgClient.DeleteContainerRegistry(ctx, r)
}

func (ra *RegistryAddReq) RegistryExists(ctx context.Context,
	pgClient *postgresqlDb.Queries) (bool, error) {

	ctx, span := telemetry.NewSpan(ctx, "registry", "registry-exists")
	defer span.End()

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

func (ra *RegistryAddReq) CreateRegistry(ctx context.Context, rContext context.Context,
	pgClient *postgresqlDb.Queries, ns string) (int32, error) {

	ctx, span := telemetry.NewSpan(ctx, "registry", "create-registry")
	defer span.End()

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

	containerRegistry, err := pgClient.CreateContainerRegistry(ctx,
		postgresqlDb.CreateContainerRegistryParams{
			Name:            ra.Name,
			RegistryType:    ra.RegistryType,
			EncryptedSecret: bSecret,    // rawSecretJSON,
			NonSecret:       bNonSecret, // rawNonSecretJSON,
			Extras:          bExtras,    // rawExtrasJSON,
		})
	if err != nil {
		return 0, err
	}

	cr, err := pgClient.GetContainerRegistryByTypeAndName(ctx,
		postgresqlDb.GetContainerRegistryByTypeAndNameParams{
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

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return 0, err
	}
	defer tx.Close(ctx)

	registryID := utils.GetRegistryID(ra.RegistryType, ns, containerRegistry.ID)
	query := `
		MERGE (m:RegistryAccount{node_id: $node_id })
		SET m.registry_type = $registry_type,
		m.syncing = false,
		m.name = $name,
		m.container_registry_ids = REDUCE(distinctElements = [], element IN COALESCE(m.container_registry_ids, []) + $pgId | CASE WHEN NOT element in distinctElements THEN distinctElements + element ELSE distinctElements END)`
	_, err = tx.Run(ctx, query, map[string]interface{}{
		"node_id":       registryID,
		"registry_type": ra.RegistryType,
		"pgId":          cr.ID,
		"name":          containerRegistry.Name,
	})
	if err != nil {
		return 0, err
	}

	return cr.ID, tx.Commit(ctx)
}

func (ru *RegistryUpdateReq) UpdateRegistry(ctx context.Context,
	pgClient *postgresqlDb.Queries, r int32) error {

	ctx, span := telemetry.NewSpan(ctx, "registry", "update-registry")
	defer span.End()

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

	_, err = pgClient.UpdateContainerRegistry(ctx,
		postgresqlDb.UpdateContainerRegistryParams{
			ID:              r,
			Name:            ru.Name,
			RegistryType:    ru.RegistryType,
			EncryptedSecret: bSecret,    // rawSecretJSON,
			NonSecret:       bNonSecret, // rawNonSecretJSON,
			Extras:          bExtras,    // rawExtrasJSON,
		})
	return err
}

func (ru *RegistryUpdateReq) RegistryExists(ctx context.Context,
	pgClient *postgresqlDb.Queries, id int32) (bool, error) {

	ctx, span := telemetry.NewSpan(ctx, "registry", "registry-exists")
	defer span.End()

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

func GetAESValueForEncryption(ctx context.Context,
	pgClient *postgresqlDb.Queries) (json.RawMessage, error) {

	ctx, span := telemetry.NewSpan(ctx, "registry", "get-aes-value-for-encryption")
	defer span.End()

	aes, err := GetSettingByKey(ctx, pgClient, commonConstants.AESSecret)
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
	ctx, span := telemetry.NewSpan(ctx, "registry", "get-registry-images")
	defer span.End()
	return GetContainerImagesFromRegistryAndNamespace(ctx, r.ResourceType, r.Namespace, r.ID)
}

type ImageStub struct {
	ID     string   `json:"id"`
	Name   string   `json:"name"`
	Images int      `json:"images"`
	Tags   []string `json:"tags"`
}

func (i *ImageStub) AddTags(tags ...string) ImageStub {
	i.Tags = append(i.Tags, tags...)
	return *i
}

func ListImageStubs(ctx context.Context, registryID string,
	filter reporters.FieldsFilters, fw FetchWindow) ([]ImageStub, error) {

	ctx, span := telemetry.NewSpan(ctx, "registry", "list-image-stubs")
	defer span.End()

	images := []ImageStub{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return images, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return images, err
	}
	defer tx.Close(ctx)

	err = checkRegistryExists(ctx, tx, registryID)
	if err != nil {
		return images, err
	}

	query := `
	MATCH (n:RegistryAccount{node_id: $id}) -[:HOSTS]-> (l:ImageStub)-[:IS]-(m:ContainerImage)
	` + reporters.ParseFieldFilters2CypherWhereConditions("l", mo.Some(filter), true) + `
	MATCH (n) -[:HOSTS]-> (m:ContainerImage)
	WITH distinct l.docker_image_name as name, 
		l.tags as tags, 
		COUNT(distinct m.docker_image_id) as images
	RETURN name, tags, images
	ORDER BY name
	` + fw.FetchWindow2CypherQuery()

	log.Debug().Msgf("Query: %s", query)

	r, err := tx.Run(ctx, query, map[string]interface{}{"id": registryID})
	if err != nil {
		return images, err
	}

	records, err := r.Collect(ctx)
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
				ID:     records[i].Values[0].(string),
				Name:   records[i].Values[0].(string),
				Images: int(records[i].Values[2].(int64)),
				Tags:   tags,
			},
		)
	}

	return images, nil
}

func ListImages(ctx context.Context, registryID string, filter, stubFilter reporters.FieldsFilters, fw FetchWindow) ([]ContainerImage, error) {

	ctx, span := telemetry.NewSpan(ctx, "registry", "list-images")
	defer span.End()

	res := []ContainerImage{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	err = checkRegistryExists(ctx, tx, registryID)
	if err != nil {
		return res, err
	}

	condition := reporters.ParseFieldFilters2CypherWhereConditions("m", mo.Some(filter), true)
	condition += ` ` + reporters.ParseFieldFilters2CypherWhereConditions("l", mo.Some(stubFilter), condition == "")
	query := `
	MATCH (n:RegistryAccount{node_id: $id}) -[:HOSTS]-> (l:ImageStub) <-[:IS]- (m:ContainerImage) <-[:HOSTS]- (n)
	` + condition + `
	RETURN l, m
	` + fw.FetchWindow2CypherQuery()
	log.Info().Msgf("query: %v", query)
	r, err := tx.Run(ctx, query, map[string]interface{}{"id": registryID})
	if err != nil {
		return res, err
	}

	records, err := r.Collect(ctx)
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
			node.Name = dockerImageName
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

func checkRegistryExists(ctx context.Context, tx neo4j.ExplicitTransaction, nodeID string) error {

	ctx, span := telemetry.NewSpan(ctx, "registry", "check-registry-exists")
	defer span.End()

	query := `
	MATCH (n:RegistryAccount{node_id: $id})
	RETURN n.node_id`

	r, err := tx.Run(ctx, query, map[string]interface{}{"id": nodeID})
	if err != nil {
		return err
	}

	_, err = r.Single(ctx)
	if err != nil {
		return &ingesters.NodeNotFoundError{NodeID: nodeID}
	}
	return nil
}

func GetRegistryPgIDs(ctx context.Context, nodeIDs []string) ([]int64, error) {

	ctx, span := telemetry.NewSpan(ctx, "registry", "get-registry-pg-ids")
	defer span.End()

	res := []int64{}
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)
	query := `
	MATCH (n:RegistryAccount)
	WHERE n.node_id in $ids
	RETURN n.container_registry_ids`

	r, err := tx.Run(ctx, query, map[string]interface{}{"ids": nodeIDs})
	if err != nil {
		return res, err
	}

	records, err := r.Collect(ctx)
	if err != nil {
		return res, err
	}

	for _, record := range records {
		for _, rec := range record.Values[0].([]interface{}) {
			res = append(res, rec.(int64))
		}
	}

	return res, err
}

func DeleteRegistryAccount(ctx context.Context, nodeIDs []string) error {

	ctx, span := telemetry.NewSpan(ctx, "registry", "delete-registry-account")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	query := `
		MATCH (n:RegistryAccount)
		WHERE n.node_id IN $ids
		DETACH DELETE n`
	_, err = tx.Run(ctx, query, map[string]interface{}{"ids": nodeIDs})
	if err != nil {
		log.Error().Msgf("%v", err)
		return err
	}

	return tx.Commit(ctx)
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

func RegistrySummary(ctx context.Context, registryID mo.Option[string],
	registryType mo.Option[string]) (Summary, error) {

	ctx, span := telemetry.NewSpan(ctx, "registry", "registry-summary")
	defer span.End()

	count := Summary{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return count, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return count, err
	}
	defer tx.Close(ctx)

	queryPerRegistry := `
	MATCH (n:RegistryAccount{node_id:$id})-[:HOSTS]->(i:ImageStub)-[:IS]-(m:ContainerImage)
	MATCH (n)-[:HOSTS]->(m)
	WITH n,
		COUNT(distinct i.docker_image_name) AS repositories,
		COUNT(distinct m.docker_image_id) AS images
	OPTIONAL MATCH (s)-[:SCANNED]->()<-[:HOSTS]-(n)
	RETURN COLLECT(s.status) AS scan_status, repositories, images
	`

	queryAllRegistries := `
	MATCH (n:RegistryAccount)-[:HOSTS]->(i:ImageStub)-[:IS]-(m:ContainerImage)
	MATCH (n)-[:HOSTS]->(m)
	WITH COUNT(distinct i.docker_image_name) AS repositories,
		COUNT(distinct m.docker_image_id) AS images
	OPTIONAL MATCH (s)-[:SCANNED]->()<-[:HOSTS]-(:RegistryAccount)
	RETURN COLLECT(s.status) AS scan_status, repositories, images
	`

	var (
		registryResult neo4j.ResultWithContext
		result         neo4j.ResultWithContext
	)
	if regID, ok := registryID.Get(); ok {
		regQuery := `
		MATCH (n:RegistryAccount{node_id:$id})
		RETURN COUNT(distinct n) as registries
		`
		if registryResult, err = tx.Run(ctx, regQuery, map[string]interface{}{"id": regID}); err != nil {
			log.Error().Err(err).Msgf("failed to get count for registry id %v", regID)
			return count, err
		}

		log.Debug().Msgf("summary queryPerRegistry: %s", queryPerRegistry)
		if result, err = tx.Run(ctx, queryPerRegistry, map[string]interface{}{"id": regID}); err != nil {
			log.Error().Err(err).Msgf("failed to query summary for registry id %v", regID)
			return count, err
		}
	} else if regType, ok := registryType.Get(); ok {
		if registryResult, err = tx.Run(ctx, queryRegistryCountByType,
			map[string]interface{}{"type": regType}); err != nil {
			log.Error().Err(err).Msgf("failed to get count for registry type %s", regType)
			return count, err
		}

		log.Debug().Msgf("summary queryRegistriesByType: %s", queryRegistriesByType)
		if result, err = tx.Run(ctx, queryRegistriesByType, map[string]interface{}{"type": regType}); err != nil {
			log.Error().Err(err).Msgf("failed to query summary for registry type %s", regType)
			return count, err
		}
	} else {
		regQuery := `    
		MATCH (n:RegistryAccount)
    	RETURN COUNT (distinct n) as registries
        `
		if registryResult, err = tx.Run(ctx, regQuery, map[string]interface{}{}); err != nil {
			log.Error().Err(err).Msgf("failed to get count for all registries")
			return count, err
		}

		log.Debug().Msgf("summary queryAllRegistries: %s", queryAllRegistries)
		if result, err = tx.Run(ctx, queryAllRegistries, map[string]interface{}{}); err != nil {
			log.Error().Err(err).Msgf("failed to query summary for all registries")
			return count, err
		}
	}

	regRecord, err := registryResult.Single(ctx)
	if err != nil {
		log.Error().Msgf("Error in getting registry count: %s", err.Error())
		return count, nil
	}

	registries, has := regRecord.Get("registries")
	if !has {
		log.Warn().Msg("registry count  not found in query result")
	}

	record, err := result.Single(ctx)
	if err != nil {
		log.Error().Msgf("Error in getting resuts: %s", err.Error())
		return count, nil
	}

	repositories, has := record.Get("repositories")
	if !has {
		log.Warn().Msg("repositories not found in query result")
	}

	images, has := record.Get("images")
	if !has {
		log.Warn().Msgf("images not found in query result")
	}

	scansStatus, has := record.Get("scan_status")
	if !has {
		log.Warn().Msg("scan_status not found in query result")
	}

	count = toScansCount(scansStatus.([]interface{}))
	count.Repositories = int(repositories.(int64))
	count.Images = int(images.(int64))
	count.Registries = int(registries.(int64))

	return count, nil
}

func RegistrySummaryAll(ctx context.Context) (RegistrySummaryAllResp, error) {

	ctx, span := telemetry.NewSpan(ctx, "registry", "registry-summary-all")
	defer span.End()

	count := RegistrySummaryAllResp{}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return count, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return count, err
	}
	defer tx.Close(ctx)

	for _, t := range pkgConst.RegistryTypes {
		var (
			registryResult neo4j.ResultWithContext
			result         neo4j.ResultWithContext

			rCount = Summary{}
		)

		if registryResult, err = tx.Run(ctx, queryRegistryCountByType,
			map[string]interface{}{"type": t}); err != nil {
			log.Error().Err(err).Msgf("failed to get count for registry type %s", t)
			count[t] = rCount
			continue
		}

		if result, err = tx.Run(ctx, queryRegistriesByType, map[string]interface{}{"type": t}); err != nil {
			log.Error().Err(err).Msgf("failed to query summary for registry type %s", t)
			count[t] = rCount
			continue
		}

		regRecord, err := registryResult.Single(ctx)
		if err != nil {
			log.Error().Msgf("Error in getting registry count: %s", err.Error())
			count[t] = rCount
			continue
		}

		record, err := result.Single(ctx)
		if err != nil {
			count[t] = rCount
			continue
		}

		repositories, has := record.Get("repositories")
		if !has {
			log.Warn().Msgf("Repositories not found in query result")
		}

		images, has := record.Get("images")
		if !has {
			log.Warn().Msg("images not found in query result")
		}

		registries, has := regRecord.Get("registries")
		if !has {
			log.Warn().Msg("registries not found in query result")
		}

		scansStatus, has := record.Get("scan_status")
		if !has {
			log.Warn().Msg("scan_status not found in query result")
		}

		rCount = toScansCount(scansStatus.([]interface{}))
		rCount.Repositories = int(repositories.(int64))
		rCount.Images = int(images.(int64))
		rCount.Registries = int(registries.(int64))

		count[t] = rCount
	}

	return count, nil
}

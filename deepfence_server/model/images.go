package model

import (
	"context"
	"encoding/json"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/dbtype"
	"github.com/rs/zerolog/log"
)

func GetContainerImagesFromRegistryAndNamespace(ctx context.Context, registryType, namespace string, pgID int32) ([]ContainerImage, error) {

	ctx, span := telemetry.NewSpan(ctx, "model", "get-container-images-from-registry-and-namespace")
	defer span.End()

	var registryID string
	var query string
	var images []ContainerImage

	if registryType != "" && namespace != "" && pgID > 0 {
		registryID = utils.GetRegistryID(registryType, namespace, pgID)
	}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return nil, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return nil, err
	}
	defer tx.Close(ctx)

	if registryID != "" {
		query = "MATCH (n:RegistryAccount{node_id: $node_id})-[r:HOSTS]->(m:ContainerImage) RETURN m"
	} else {
		query = "MATCH (n:RegistryAccount{})-[r:HOSTS]->(m:ContainerImage) RETURN m"
	}

	res, err := tx.Run(ctx, query, map[string]interface{}{"node_id": registryID})
	if err != nil {
		return nil, err
	}

	recs, err := res.Collect(ctx)
	if err != nil {
		return nil, err
	}

	for _, rec := range recs {
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
		var image ContainerImage
		// utils.FromMap(da.Props, &image)
		p, err := json.Marshal(da.Props)
		if err != nil {
			log.Warn().Msgf("marshal error: %v", err)
			continue
		}

		err = json.Unmarshal(p, &image)
		if err != nil {
			log.Warn().Msgf("unmarshal error: %v", err)
			continue
		}
		images = append(images, image)
	}

	return images, nil
}

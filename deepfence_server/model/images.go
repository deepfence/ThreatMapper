package model

import (
	"context"
	"encoding/json"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j/dbtype"
	"github.com/rs/zerolog/log"
)

func GetContainerImagesFromRegistryAndNamespace(ctx context.Context, rType, ns string) ([]ContainerImage, error) {
	var registryId string
	var query string
	var images []ContainerImage

	if rType != "" && ns != "" {
		registryId = GetRegistryID(rType, ns)
	}

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return nil, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	if err != nil {
		return nil, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return nil, err
	}
	defer tx.Close()

	if registryId != "" {
		query = "MATCH (n:RegistryAccount{node_id: $node_id})-[r:HOSTS]->(m:ContainerImage) RETURN m"
	} else {
		query = "MATCH (n:RegistryAccount{})-[r:HOSTS]->(m:ContainerImage) RETURN m"
	}

	res, err := tx.Run(query, map[string]interface{}{"node_id": registryId})
	if err != nil {
		return nil, err
	}

	recs, err := res.Collect()
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

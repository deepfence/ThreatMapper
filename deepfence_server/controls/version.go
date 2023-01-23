package controls

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	DEFAULT_AGENT_IMAGE_NAME = "deepfence.io"
	DEFAULT_AGENT_IMAGE_TAG  = "thomas"
	DEFAULT_AGENT_VERSION    = "0.0.1"
)

func GetLatestAgentVersion(ctx context.Context) (model.AgentImageMetadata, error) {
	res := model.AgentImageMetadata{}

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session, err := client.Session(neo4j.AccessModeRead)
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return res, err
	}
	defer tx.Close()

	r, err := tx.Run(`
		MATCH (n:AgentVersionMetadata)
		RETURN n.version, n.image_name, n.image_tag`, nil)

	if err != nil {
		return res, err
	}

	record, err := r.Single()

	if err != nil {
		return res, err
	}

	res.Version = record.Values[0].(string)
	res.ImageName = record.Values[1].(string)
	res.ImageTag = record.Values[2].(string)

	return res, tx.Commit()

}

func SetLatestAgentVersion(ctx context.Context, meta model.AgentImageMetadata) error {

	client, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session, err := client.Session(neo4j.AccessModeWrite)
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	_, err = tx.Run(`
		MATCH (n:AgentVersionMetadata)
		SET n.version = $version, n.image_name = $name, n.image_tag = $tag`,
		map[string]interface{}{"version": meta.Version, "name": meta.ImageName, "tag": meta.ImageTag})

	if err != nil {
		return err
	}

	return tx.Commit()

}

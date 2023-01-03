package directory

import (
	"context"
	"errors"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

var neo4j_clients_pool map[NamespaceID]*neo4j.Driver

func init() {
	neo4j_clients_pool = map[NamespaceID]*neo4j.Driver{}
}

func new_neo4j_client(endpoints DBConfigs) (*neo4j.Driver, error) {
	if endpoints.Neo4j == nil {
		return nil, errors.New("No defined Neo4j config")
	}
	driver, err := neo4j.NewDriver(endpoints.Neo4j.Endpoint, neo4j.BasicAuth(endpoints.Neo4j.Username, endpoints.Neo4j.Password, ""))
	if err != nil {
		return nil, err
	}
	return &driver, nil
}

func Neo4jClient(ctx context.Context) (neo4j.Driver, error) {
	driver, err := getClient(ctx, neo4j_clients_pool, new_neo4j_client)
	if err != nil {
		return nil, err
	}
	return *driver, err
}

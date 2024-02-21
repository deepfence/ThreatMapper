package directory

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	neo4jTracing "github.com/raito-io/neo4j-tracing"
)

var neo4jClientsPool sync.Map
var driverFactory *neo4jTracing.Neo4jTracer

func init() {
	neo4jClientsPool = sync.Map{}
	driverFactory = neo4jTracing.NewNeo4jTracer()
}

type CypherDriver struct {
	impl neo4j.DriverWithContext
}

func newNeo4JClient(endpoints DBConfigs) (*CypherDriver, error) {
	if endpoints.Neo4j == nil {
		return nil, errors.New("no defined Neo4j config")
	}
	driver, err := driverFactory.NewDriverWithContext(endpoints.Neo4j.Endpoint,
		neo4j.BasicAuth(endpoints.Neo4j.Username, endpoints.Neo4j.Password, ""),
		func(cfg *neo4j.Config) {
			cfg.ConnectionAcquisitionTimeout = time.Second * 5
		},
	)
	if err != nil {
		return nil, err
	}
	return &CypherDriver{impl: driver}, nil
}

func Neo4jClient(ctx context.Context) (neo4j.DriverWithContext, error) {
	cd, err := getClient(ctx, &neo4jClientsPool, newNeo4JClient)
	if err != nil {
		return nil, err
	}

	err = cd.impl.VerifyConnectivity(ctx)
	if err != nil {
		key, _ := ExtractNamespace(ctx)
		old, has := neo4jClientsPool.LoadAndDelete(key)
		if has {
			old.(*CypherDriver).impl.Close(ctx)
		}
		return nil, err
	}
	return cd.impl, err
}

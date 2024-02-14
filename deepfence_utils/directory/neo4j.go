package directory

import (
	"context"
	"errors"
	"fmt"
	"path"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.opentelemetry.io/otel"
)

var neo4jClientsPool sync.Map

func init() {
	neo4jClientsPool = sync.Map{}
}

func getCallerInfo(skip int) (info string) {
	pc, file, lineNo, ok := runtime.Caller(skip)
	if !ok {

		info = "runtime.Caller() failed"
		return
	}
	funcName := runtime.FuncForPC(pc).Name()
	fileName := path.Base(file) // The Base function returns the last element of the path
	splits := strings.Split(funcName, "/")
	return fmt.Sprintf("Neo4j: %s:%s:%d ", splits[len(splits)-1], fileName, lineNo)
}

type CypherDriver struct {
	impl neo4j.DriverWithContext
}

func newNeo4JClient(endpoints DBConfigs) (*CypherDriver, error) {
	if endpoints.Neo4j == nil {
		return nil, errors.New("no defined Neo4j config")
	}
	driver, err := neo4j.NewDriverWithContext(endpoints.Neo4j.Endpoint,
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

func Neo4jSession(ctx context.Context, driver neo4j.DriverWithContext, accessMode neo4j.AccessMode) neo4j.SessionWithContext {
	return driver.NewSession(ctx, neo4j.SessionConfig{
		AccessMode: neo4j.AccessModeWrite,
		BoltLogger: NewNeoTrace(ctx, otel.GetTracerProvider()),
	})
}

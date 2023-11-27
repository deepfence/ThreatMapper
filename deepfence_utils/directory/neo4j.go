package directory

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"path"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"go.opentelemetry.io/otel"
)

var neo4jClientsPool sync.Map

func init() {
	neo4jClientsPool = sync.Map{}
}

type CypherTransaction struct {
	impl neo4j.Transaction
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

func (ct CypherTransaction) Run(cypher string, params map[string]interface{}) (neo4j.Result, error) {
	_, span := otel.Tracer("neo4j").Start(context.Background(), getCallerInfo(2))
	defer span.End()
	return ct.impl.Run(cypher, params)
}
func (ct CypherTransaction) Commit() error {
	return ct.impl.Commit()
}
func (ct CypherTransaction) Rollback() error {
	return ct.impl.Rollback()
}
func (ct CypherTransaction) Close() error {
	return ct.impl.Close()
}

type CypherSession struct {
	impl neo4j.Session
}

func (cs CypherSession) LastBookmark() string {
	return cs.impl.LastBookmark()
}
func (cs CypherSession) BeginTransaction(configurers ...func(*neo4j.TransactionConfig)) (neo4j.Transaction, error) {
	t, err := cs.impl.BeginTransaction(configurers...)
	if err != nil {
		return nil, err
	}
	return CypherTransaction{impl: t}, nil
}
func (cs CypherSession) ReadTransaction(work neo4j.TransactionWork, configurers ...func(*neo4j.TransactionConfig)) (interface{}, error) {
	return cs.impl.ReadTransaction(work, configurers...)
}
func (cs CypherSession) WriteTransaction(work neo4j.TransactionWork, configurers ...func(*neo4j.TransactionConfig)) (interface{}, error) {
	return cs.impl.WriteTransaction(work, configurers...)
}
func (cs CypherSession) Run(cypher string, params map[string]interface{}, configurers ...func(*neo4j.TransactionConfig)) (neo4j.Result, error) {
	_, span := otel.Tracer("neo4j").Start(context.Background(), getCallerInfo(2))
	defer span.End()
	return cs.impl.Run(cypher, params, configurers...)
}
func (cs CypherSession) Close() error {
	return cs.impl.Close()
}

type CypherDriver struct {
	impl neo4j.Driver
}

func (cd CypherDriver) Target() url.URL {
	return cd.impl.Target()
}
func (cd CypherDriver) NewSession(config neo4j.SessionConfig) neo4j.Session {
	return CypherSession{impl: cd.impl.NewSession(config)}
}
func (cd CypherDriver) Session(accessMode neo4j.AccessMode, bookmarks ...string) (neo4j.Session, error) {
	s := cd.impl.NewSession(neo4j.SessionConfig{Bookmarks: bookmarks})
	return CypherSession{impl: s}, nil
}
func (cd CypherDriver) VerifyConnectivity() error {
	return cd.impl.VerifyConnectivity()
}
func (cd CypherDriver) Close() error {
	return cd.impl.Close()
}

func newNeo4JClient(endpoints DBConfigs) (*CypherDriver, error) {
	if endpoints.Neo4j == nil {
		return nil, errors.New("no defined Neo4j config")
	}
	driver, err := neo4j.NewDriver(endpoints.Neo4j.Endpoint,
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

func Neo4jClient(ctx context.Context) (neo4j.Driver, error) {
	driver, err := getClient(ctx, &neo4jClientsPool, newNeo4JClient)
	if err != nil {
		return nil, err
	}

	err = driver.VerifyConnectivity()
	if err != nil {
		key, _ := ExtractNamespace(ctx)
		old, has := neo4jClientsPool.LoadAndDelete(key)
		if has {
			old.(*CypherDriver).Close()
		}
		return nil, err
	}
	return *driver, err
}

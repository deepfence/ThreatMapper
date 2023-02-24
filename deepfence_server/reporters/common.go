package reporters

import (
	"errors"

	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

var (
	NotFoundErr = errors.New("Resource not found")
)

type Cypherable interface {
	NodeType() string
}

type CypherableAndCategorizable interface {
	Categorizable
	Cypherable
}

type Categorizable interface {
	GetCategory() string
}

func GetCategoryCounts[T Categorizable](entries []T) map[string]int32 {
	res := map[string]int32{}

	if len(entries) == 0 {
		return res
	}

	if entries[0].GetCategory() == "" {
		return res
	}

	for i := range entries {
		res[entries[i].GetCategory()] += 1
	}

	return res
}

func Neo4jGetStringRecord(rec *neo4j.Record, key, defaultVal string) string {
	val, ok := rec.Get(key)
	if !ok {
		val = defaultVal
	}
	return val.(string)
}

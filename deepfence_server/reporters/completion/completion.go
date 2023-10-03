package completion

import (
	"context"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
	"github.com/rs/zerolog/log"
)

type CompletionNodeFieldReq struct {
	Completion string            `json:"completion" required:"true"`
	FieldName  string            `json:"field_name" required:"true"`
	Window     model.FetchWindow `json:"window" required:"true"`
	ScanID     string            `json:"scan_id" required:"false"`
}

type CompletionNodeFieldRes struct {
	PossibleValues []string `json:"possible_values" required:"true"`
}

func FieldValueCompletion[T reporters.Cypherable](ctx context.Context, req CompletionNodeFieldReq) ([]string, error) {
	res := []string{}

	var dummy T

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

	query := ""

	if req.ScanID != "" {
		query = `
		MATCH (n{node_id: $scan_id}) -[:DETECTED]-> (m) -[:IS]-> (r:` + dummy.NodeType() + `) ` +
			getWhereClause("r", req.FieldName, req.Completion) +
			` RETURN DISTINCT r.` + req.FieldName
	} else {
		query = `
		MATCH (n:` + dummy.NodeType() + `) ` +
			getWhereClause("n", req.FieldName, req.Completion) +
			` RETURN DISTINCT n.` + req.FieldName
	}

	log.Info().Msgf("completion query: \n%v", query)
	r, err := tx.Run(query,
		map[string]interface{}{
			"scan_id": req.ScanID,
		})

	if err != nil {
		return res, err
	}

	recs, err := r.Collect()

	if err != nil {
		return res, err
	}

	for i := range recs {
		res = append(res, recs[i].Values[0].(string))
	}

	return res, nil
}

func getWhereClause(n, fieldName, completion string) string {
	if completion == "" {
		return ""
	}
	return fmt.Sprintf("WHERE %s.%s =~ '^%s.*'", n, fieldName, completion)
}

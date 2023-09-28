package completion

import (
	"context"
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

	session, err := driver.Session(neo4j.AccessModeRead)
	if err != nil {
		return res, err
	}
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close()

	query := `
	MATCH (n:` + dummy.NodeType() + `)
	WHERE n.` + req.FieldName + ` =~ '^` + req.Completion + `.*'
	RETURN DISTINCT n.` + req.FieldName

	log.Debug().Msgf("completion query: \n%v", query)
	r, err := tx.Run(query,
		map[string]interface{}{})

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

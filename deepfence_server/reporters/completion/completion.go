package completion

import (
	"context"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
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

	ctx, span := telemetry.NewSpan(ctx, "completion", "field-value-completion")
	defer span.End()

	res := []string{}

	var dummy T

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return res, err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return res, err
	}
	defer tx.Close(ctx)

	query := ""

	if req.ScanID != "" {
		if dummy.NodeType() == "CloudCompliance" {
			query = `
			MATCH (n{node_id: $scan_id}) -[:DETECTED]-> (r:` + dummy.NodeType() + `)
			WHERE r.` + req.FieldName + ` =~ '^` + req.Completion + `.*'
			RETURN DISTINCT r.` + req.FieldName + `
			ORDER BY r.` + req.FieldName +
				req.Window.FetchWindow2CypherQuery()
		} else {
			query = `
			MATCH (n{node_id: $scan_id}) -[:DETECTED]-> (m) -[:IS]-> (r:` + dummy.NodeType() + `)
			WHERE r.` + req.FieldName + ` =~ '^` + req.Completion + `.*'
			RETURN DISTINCT r.` + req.FieldName + `
			ORDER BY r.` + req.FieldName +
				req.Window.FetchWindow2CypherQuery()
		}
	} else {
		query = `
		MATCH (n:` + dummy.NodeType() + `) 
		WHERE n.` + req.FieldName + ` =~ '^` + req.Completion + `.*'
		RETURN DISTINCT n.` + req.FieldName + `
		ORDER BY n.` + req.FieldName +
			req.Window.FetchWindow2CypherQuery()
	}

	log.Debug().Msgf("completion query: \n%v", query)
	r, err := tx.Run(ctx, query,
		map[string]interface{}{
			"scan_id": req.ScanID,
		})

	if err != nil {
		return res, err
	}

	recs, err := r.Collect(ctx)

	if err != nil {
		return res, err
	}

	for i := range recs {
		res = append(res, recs[i].Values[0].(string))
	}

	return res, nil
}

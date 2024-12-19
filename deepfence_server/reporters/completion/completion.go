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
	"github.com/samber/mo"
)

type CompletionNodeFieldReq struct {
	Completion   string                   `json:"completion" required:"true"`
	FieldName    string                   `json:"field_name" required:"true"`
	IsArrayField bool                     `json:"is_array_field" required:"false"`
	Window       model.FetchWindow        `json:"window" required:"true"`
	ScanID       string                   `json:"scan_id" required:"false"` //TODO: deprecate in favor of Filters
	Filters      *reporters.FieldsFilters `json:"filters" required:"false"`
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

	filterClauses := mo.None[reporters.FieldsFilters]()
	if req.Filters != nil {
		filterClauses = mo.Some(*req.Filters)
	}

	var cypherNodeName string
	if req.ScanID != "" {
		cypherNodeName = "r"
	} else {
		cypherNodeName = "n"
	}
	var fieldName string
	var substringMatch string
	if req.IsArrayField {
		fieldName = "field_name"
		substringMatch = `UNWIND ` + cypherNodeName + `.` + req.FieldName + ` as ` + fieldName + `
		WITH ` + fieldName + `
		WHERE ` + fieldName + ` =~ '^` + req.Completion + `.*'`
	} else {
		fieldName = cypherNodeName + `.` + req.FieldName
		substringMatch = `WHERE ` + fieldName + ` =~ '^` + req.Completion + `.*'`
	}

	if req.ScanID != "" {
		if dummy.NodeType() == "CloudCompliance" {
			query = `
			MATCH (n{node_id: $scan_id}) -[:DETECTED]-> (r:` + dummy.NodeType() + `)
			` + substringMatch + `
			` + reporters.ParseFieldFilters2CypherWhereConditions(`n`, filterClauses, false) + `
			RETURN DISTINCT ` + fieldName + `
			ORDER BY ` + fieldName + req.Window.FetchWindow2CypherQuery()
		} else {
			query = `
			MATCH (n{node_id: $scan_id}) -[:DETECTED]-> (m) -[:IS]-> (r:` + dummy.NodeType() + `)
			` + substringMatch + `
			` + reporters.ParseFieldFilters2CypherWhereConditions(`n`, filterClauses, false) + `
			RETURN DISTINCT ` + fieldName + `
			ORDER BY ` + fieldName + req.Window.FetchWindow2CypherQuery()
		}
	} else {
		query = `
		MATCH (n:` + dummy.NodeType() + `) 
		` + substringMatch + `
		` + reporters.ParseFieldFilters2CypherWhereConditions(`n`, filterClauses, false) + `
		RETURN DISTINCT ` + fieldName + `
		ORDER BY ` + fieldName + req.Window.FetchWindow2CypherQuery()
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

package reporters_search //nolint:stylecheck

import (
	"testing"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"gotest.tools/assert"
)

func TestIndirectFilters(t *testing.T) {
	var dummy model.Vulnerability
	query := constructIndirectMatchInit(
		dummy.NodeType(),
		"",
		"n",
		SearchFilter{
			InFieldFilter: []string{},
			Filters: reporters.FieldsFilters{
				ContainsFilter: reporters.ContainsFilter{
					FieldsValues: map[string][]interface{}{"foo": {"bar"}},
				},
			},
			Window: model.FetchWindow{},
		},
		SearchFilter{
			InFieldFilter: []string{},
			Filters:       reporters.FieldsFilters{},
			Window:        model.FetchWindow{},
		},
		&ChainedSearchFilter{
			NodeFilter:   SearchFilter{},
			RelationShip: "DETECTED",
			NextFilter: &ChainedSearchFilter{
				NodeFilter: SearchFilter{
					InFieldFilter: []string{},
					Filters: reporters.FieldsFilters{
						ContainsFilter: reporters.ContainsFilter{
							FieldsValues: map[string][]interface{}{"foo": {"bar"}},
						},
					},
					Window: model.FetchWindow{},
				},
				RelationShip: "SCANNED",
				NextFilter:   nil,
			},
		},
		model.FetchWindow{},
		true,
	)
	assert.Equal(t, query,
		`MATCH (n1) WHERE  n1.foo IN ['bar']
MATCH (n0)-[:SCANNED]- (n1)
MATCH (n:Vulnerability) -[:DETECTED]- (n0) WHERE  n.foo IN ['bar'] RETURN n`, "should be equal")

}

func TestIndirectFiltersWithExtended(t *testing.T) {
	var dummy model.Vulnerability
	query := constructIndirectMatchInit(
		dummy.NodeType(),
		dummy.ExtendedField(),
		"n",
		SearchFilter{
			InFieldFilter: []string{},
			Filters: reporters.FieldsFilters{
				ContainsFilter: reporters.ContainsFilter{
					FieldsValues: map[string][]interface{}{"foo": {"bar"}},
				},
			},
			Window: model.FetchWindow{},
		},
		SearchFilter{
			InFieldFilter: []string{},
			Filters:       reporters.FieldsFilters{},
			Window:        model.FetchWindow{},
		},
		&ChainedSearchFilter{
			NodeFilter:   SearchFilter{},
			RelationShip: "DETECTED",
			NextFilter: &ChainedSearchFilter{
				NodeFilter: SearchFilter{
					InFieldFilter: []string{},
					Filters: reporters.FieldsFilters{
						ContainsFilter: reporters.ContainsFilter{
							FieldsValues: map[string][]interface{}{"foo": {"bar"}},
						},
					},
					Window: model.FetchWindow{},
				},
				RelationShip: "SCANNED",
				NextFilter:   nil,
			},
		},
		model.FetchWindow{},
		true,
	)
	assert.Equal(t, query,
		`MATCH (n1) WHERE  n1.foo IN ['bar']
MATCH (n0)-[:SCANNED]- (n1)
MATCH (n:Vulnerability) -[:DETECTED]- (n0) WHERE  n.foo IN ['bar']
MATCH (n) -[:IS]-> (e)  RETURN n, e`, "should be equal")
}

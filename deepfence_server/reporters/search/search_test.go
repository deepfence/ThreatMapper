package reporters_search

import (
	"testing"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"gotest.tools/assert"
)

func TestIndirectFilters(t *testing.T) {
	query := constructIndirectMatchInit[model.Vulnerability](SearchFilter{
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
	)
	assert.Equal(t, query,
		`MATCH (n1) WHERE  n1.foo IN ['bar']
MATCH (n0)-[:SCANNED]- (n1)
MATCH (n:Vulnerability) -[:DETECTED]- (n0) WHERE  n.foo IN ['bar'] RETURN n`, "should be equal")
	println(query)

}

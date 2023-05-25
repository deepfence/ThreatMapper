package reporters

import (
	"testing"

	"github.com/samber/mo"
	"gotest.tools/assert"
)

func TestFilterFieldsToCypher(t *testing.T) {
	node_name := "n"
	cypher := FieldFilterCypher(node_name, []string{})
	assert.Equal(t, cypher, node_name, "should be equal")

	cypher = FieldFilterCypher(node_name, []string{"bar", "foo"})
	assert.Equal(t, cypher, "n.bar,n.foo", "should be equal")
}

func TestParseFieldFilters2CypherWhereConditions(t *testing.T) {
	node_name := "n"
	cypher := ParseFieldFilters2CypherWhereConditions(node_name, mo.None[FieldsFilters](), true)
	assert.Equal(t, cypher, "", "should be equal")

	ff := FieldsFilters{
		ContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{},
		},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, "", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"toto": {"foo", "bar"}},
		},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IN ['foo','bar']", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"toto": {"foo", "bar"}},
		},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{{FieldName: "toto"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IN ['foo','bar'] AND n.toto IS NOT NULL", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{{FieldName: "toto"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IS NOT NULL", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{{FieldName: "toto"}, {FieldName: "titi"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IS NOT NULL AND n.titi IS NOT NULL", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{{FieldName: "toto", Descending: true}, {FieldName: "titi", Descending: true}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IS NOT NULL AND n.titi IS NOT NULL", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"node_type": {"host", "image"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n:Node OR n:ContainerImage", "should be equal")

}

func TestNotContainersFieldFilters2CypherWhereConditions(t *testing.T) {
	node_name := "n"
	cypher := ParseFieldFilters2CypherWhereConditions(node_name, mo.None[FieldsFilters](), true)
	assert.Equal(t, cypher, "", "should be equal")

	ff := FieldsFilters{
		NotContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, "", "should be equal")

	ff = FieldsFilters{
		NotContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"toto": {"foo", "bar"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE   NOT coalesce(n.toto, '') IN ['foo','bar']", "should be equal")

	ff = FieldsFilters{
		NotContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"node_type": {"host", "image"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE   NOT n:Node AND  NOT n:ContainerImage", "should be equal")
}

func TestOrderFilter2CypherCondition(t *testing.T) {
	node_name := "n"

	ff := OrderFilter{
		OrderFields: []OrderSpec{},
	}

	cypher := OrderFilter2CypherCondition(node_name, ff)
	assert.Equal(t, cypher, "", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: ""}},
	}

	cypher = OrderFilter2CypherCondition(node_name, ff)
	assert.Equal(t, cypher, "", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto"}},
	}

	cypher = OrderFilter2CypherCondition(node_name, ff)
	assert.Equal(t, cypher, " WITH n ORDER BY n.toto ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto", Descending: true}},
	}

	cypher = OrderFilter2CypherCondition(node_name, ff)
	assert.Equal(t, cypher, " WITH n ORDER BY n.toto DESC ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto"}, {FieldName: "titi"}},
	}

	cypher = OrderFilter2CypherCondition(node_name, ff)
	assert.Equal(t, cypher, " WITH n ORDER BY n.toto \n WITH n ORDER BY n.titi ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto", Descending: true}, {FieldName: "titi", Descending: true}},
	}

	cypher = OrderFilter2CypherCondition(node_name, ff)
	assert.Equal(t, cypher, " WITH n ORDER BY n.toto DESC \n WITH n ORDER BY n.titi DESC ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto"}, {FieldName: "titi", Descending: true}},
	}

	cypher = OrderFilter2CypherCondition(node_name, ff)
	assert.Equal(t, cypher, " WITH n ORDER BY n.toto \n WITH n ORDER BY n.titi DESC ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto", Size: 10}, {FieldName: "titi", Descending: true, Size: 5}},
	}

	cypher = OrderFilter2CypherCondition(node_name, ff)
	assert.Equal(t, cypher, " WITH n LIMIT 10 ORDER BY n.toto \n WITH n LIMIT 5 ORDER BY n.titi DESC ", "should be equal")

}

func TestContainsFilter2CypherWhereConditions(t *testing.T) {
	node_name := "n"

	ff := ContainsFilter{
		FieldsValues: map[string][]interface{}{},
	}

	cypher := ContainsFilter2CypherWhereConditions(node_name, ff, true)
	assert.Equal(t, cypher, "", "should be equal")

	ff = ContainsFilter{
		FieldsValues: map[string][]interface{}{"toto": {"foo", false}},
	}

	cypher = ContainsFilter2CypherWhereConditions(node_name, ff, true)
	assert.Equal(t, cypher, " WHERE  n.toto IN ['foo',false]", "should be equal")

}

func TestMatchFilter2CypherWhereConditions(t *testing.T) {
	node_name := "n"

	ff := MatchFilter{
		FieldsValues: map[string][]interface{}{},
	}

	cypher := matchFilter2CypherConditions(node_name, ff)
	assert.Equal(t, len(cypher), 0, "should be equal")

	ff = MatchFilter{
		FieldsValues: map[string][]interface{}{"toto": {"foo", "bar"}},
	}

	cypher = matchFilter2CypherConditions(node_name, ff)
	assert.Equal(t, cypher[0], "n.toto =~ '(.*foo.*|.*bar.*)'", "should be equal")
}

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
			OrderField: "",
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, "", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"toto": []interface{}{"foo", "bar"}},
		},
		OrderFilter: OrderFilter{
			OrderField: "",
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IN ['foo','bar']", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"toto": []interface{}{"foo", "bar"}},
		},
		OrderFilter: OrderFilter{
			OrderField: "toto",
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IN ['foo','bar'] AND n.toto IS NOT NULL", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{},
		OrderFilter: OrderFilter{
			OrderField: "toto",
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(node_name, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IS NOT NULL", "should be equal")

}

func TestOrderFilter2CypherCondition(t *testing.T) {
	node_name := "n"

	ff := OrderFilter{
		OrderField: "",
	}

	cypher := OrderFilter2CypherCondition(node_name, ff)
	assert.Equal(t, cypher, "", "should be equal")

	ff = OrderFilter{
		OrderField: "toto",
	}

	cypher = OrderFilter2CypherCondition(node_name, ff)
	assert.Equal(t, cypher, " ORDER BY n.toto ", "should be equal")

}

func TestContainsFilter2CypherWhereConditions(t *testing.T) {
	node_name := "n"

	ff := ContainsFilter{
		FieldsValues: map[string][]interface{}{},
	}

	cypher := ContainsFilter2CypherWhereConditions(node_name, ff, true)
	assert.Equal(t, cypher, "", "should be equal")

	ff = ContainsFilter{
		FieldsValues: map[string][]interface{}{"toto": []interface{}{"foo", "bar"}},
	}

	cypher = ContainsFilter2CypherWhereConditions(node_name, ff, true)
	assert.Equal(t, cypher, " WHERE  n.toto IN ['foo','bar']", "should be equal")

}

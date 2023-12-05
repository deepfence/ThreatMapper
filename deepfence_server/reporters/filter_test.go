package reporters

import (
	"testing"

	"github.com/samber/mo"
	"gotest.tools/assert"
)

func TestFilterFieldsToCypher(t *testing.T) {
	nodeName := "n"
	cypher := FieldFilterCypher(nodeName, []string{})
	assert.Equal(t, cypher, nodeName, "should be equal")

	cypher = FieldFilterCypher(nodeName, []string{"bar", "foo"})
	assert.Equal(t, cypher, "n.bar,n.foo", "should be equal")
}

func TestParseFieldFilters2CypherWhereConditions(t *testing.T) {
	nodeName := "n"
	cypher := ParseFieldFilters2CypherWhereConditions(nodeName, mo.None[FieldsFilters](), true)
	assert.Equal(t, cypher, "", "should be equal")

	ff := FieldsFilters{
		ContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{},
		},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(nodeName, mo.Some(ff), true)
	assert.Equal(t, cypher, "", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"toto": {"foo", "bar"}},
		},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(nodeName, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IN ['foo','bar']", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"toto": {"foo", "bar"}},
		},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{{FieldName: "toto"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(nodeName, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IN ['foo','bar'] AND n.toto IS NOT NULL", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{{FieldName: "toto"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(nodeName, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IS NOT NULL", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{{FieldName: "toto"}, {FieldName: "titi"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(nodeName, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IS NOT NULL AND n.titi IS NOT NULL", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{},
		OrderFilter: OrderFilter{
			OrderFields: []OrderSpec{{FieldName: "toto", Descending: true}, {FieldName: "titi", Descending: true}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(nodeName, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  n.toto IS NOT NULL AND n.titi IS NOT NULL", "should be equal")

	ff = FieldsFilters{
		ContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"node_type": {"host", "image"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(nodeName, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  (n:Node OR n:ContainerImage)", "should be equal")

}

func TestNotContainersFieldFilters2CypherWhereConditions(t *testing.T) {
	nodeName := "n"
	cypher := ParseFieldFilters2CypherWhereConditions(nodeName, mo.None[FieldsFilters](), true)
	assert.Equal(t, cypher, "", "should be equal")

	ff := FieldsFilters{
		NotContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(nodeName, mo.Some(ff), true)
	assert.Equal(t, cypher, "", "should be equal")

	ff = FieldsFilters{
		NotContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"toto": {"foo", "bar"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(nodeName, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE   NOT coalesce(n.toto, '') IN ['foo','bar']", "should be equal")

	ff = FieldsFilters{
		NotContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"node_type": {"host", "image"}},
		},
	}
	cypher = ParseFieldFilters2CypherWhereConditions(nodeName, mo.Some(ff), true)
	assert.Equal(t, cypher, " WHERE  ( NOT n:Node AND  NOT n:ContainerImage)", "should be equal")
}

func TestOrderFilter2CypherCondition(t *testing.T) {
	nodeName := "n"

	ff := OrderFilter{
		OrderFields: []OrderSpec{},
	}

	cypher := OrderFilter2CypherCondition(nodeName, ff, nil)
	assert.Equal(t, cypher, "", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: ""}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, nil)
	assert.Equal(t, cypher, "", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto"}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, nil)
	assert.Equal(t, cypher, " WITH n ORDER BY n.toto ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto", Descending: true}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, nil)
	assert.Equal(t, cypher, " WITH n ORDER BY n.toto DESC ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto"}, {FieldName: "titi"}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, nil)
	assert.Equal(t, cypher, " WITH n ORDER BY n.toto \n WITH n ORDER BY n.titi ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto", Descending: true}, {FieldName: "titi", Descending: true}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, nil)
	assert.Equal(t, cypher, " WITH n ORDER BY n.toto DESC \n WITH n ORDER BY n.titi DESC ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto"}, {FieldName: "titi", Descending: true}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, nil)
	assert.Equal(t, cypher, " WITH n ORDER BY n.toto \n WITH n ORDER BY n.titi DESC ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto", Size: 10}, {FieldName: "titi", Descending: true, Size: 5}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, nil)
	assert.Equal(t, cypher, " WITH n ORDER BY n.toto LIMIT 10 \n WITH n ORDER BY n.titi DESC LIMIT 5 ", "should be equal")

}

func TestOrderFilter2CypherConditionWithNodes(t *testing.T) {
	nodeName := "n"

	ff := OrderFilter{
		OrderFields: []OrderSpec{},
	}

	cypher := OrderFilter2CypherCondition(nodeName, ff, []string{"a"})
	assert.Equal(t, cypher, "", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: ""}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, []string{"a"})
	assert.Equal(t, cypher, "", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto"}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, []string{"a"})
	assert.Equal(t, cypher, " WITH a,n ORDER BY n.toto ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto", Descending: true}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, []string{"a"})
	assert.Equal(t, cypher, " WITH a,n ORDER BY n.toto DESC ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto"}, {FieldName: "titi"}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, []string{"a"})
	assert.Equal(t, cypher, " WITH a,n ORDER BY n.toto \n WITH a,n ORDER BY n.titi ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto", Descending: true}, {FieldName: "titi", Descending: true}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, []string{"a"})
	assert.Equal(t, cypher, " WITH a,n ORDER BY n.toto DESC \n WITH a,n ORDER BY n.titi DESC ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto"}, {FieldName: "titi", Descending: true}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, []string{"a"})
	assert.Equal(t, cypher, " WITH a,n ORDER BY n.toto \n WITH a,n ORDER BY n.titi DESC ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "toto", Size: 10}, {FieldName: "titi", Descending: true, Size: 5}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, []string{"a"})
	assert.Equal(t, cypher, " WITH a,n ORDER BY n.toto LIMIT 10 \n WITH a,n ORDER BY n.titi DESC LIMIT 5 ", "should be equal")

}

func TestOrderFilter2CypherConditionWithSeverity(t *testing.T) {
	nodeName := "n"

	ff := OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "cve_severity"}},
	}

	cypher := OrderFilter2CypherCondition(nodeName, ff, nil)
	assert.Equal(t, cypher, " WITH n,CASE n.cve_severity WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 WHEN 'critical' THEN 3 ELSE -1 END AS severity0 ORDER BY severity0 ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "cve_severity"}, {FieldName: "level"}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, nil)
	assert.Equal(t, cypher, " WITH n,CASE n.cve_severity WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 WHEN 'critical' THEN 3 ELSE -1 END AS severity0 ORDER BY severity0 \n WITH n,CASE n.level WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 WHEN 'critical' THEN 3 ELSE -1 END AS severity1 ORDER BY severity1 ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "cve_severity"}, {FieldName: "random"}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, nil)
	assert.Equal(t, cypher, " WITH n,CASE n.cve_severity WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 WHEN 'critical' THEN 3 ELSE -1 END AS severity0 ORDER BY severity0 \n WITH n ORDER BY n.random ", "should be equal")

}

func TestOrderFilter2CypherConditionWithSeverityWithCarry(t *testing.T) {
	nodeName := "n"

	ff := OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "cve_severity"}},
	}

	cypher := OrderFilter2CypherCondition(nodeName, ff, []string{"a"})
	assert.Equal(t, cypher, " WITH a,n,CASE n.cve_severity WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 WHEN 'critical' THEN 3 ELSE -1 END AS severity0 ORDER BY severity0 ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "cve_severity"}, {FieldName: "level"}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, []string{"a"})
	assert.Equal(t, cypher, " WITH a,n,CASE n.cve_severity WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 WHEN 'critical' THEN 3 ELSE -1 END AS severity0 ORDER BY severity0 \n WITH a,n,CASE n.level WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 WHEN 'critical' THEN 3 ELSE -1 END AS severity1 ORDER BY severity1 ", "should be equal")

	ff = OrderFilter{
		OrderFields: []OrderSpec{{FieldName: "cve_severity"}, {FieldName: "random"}},
	}

	cypher = OrderFilter2CypherCondition(nodeName, ff, []string{"a"})
	assert.Equal(t, cypher, " WITH a,n,CASE n.cve_severity WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 WHEN 'critical' THEN 3 ELSE -1 END AS severity0 ORDER BY severity0 \n WITH a,n ORDER BY n.random ", "should be equal")

}

func TestContainsFilter2CypherWhereConditions(t *testing.T) {
	nodeName := "n"

	ff := ContainsFilter{
		FieldsValues: map[string][]interface{}{},
	}

	cypher := ContainsFilter2CypherWhereConditions(nodeName, ff, true)
	assert.Equal(t, cypher, "", "should be equal")

	ff = ContainsFilter{
		FieldsValues: map[string][]interface{}{"toto": {"foo", false}},
	}

	cypher = ContainsFilter2CypherWhereConditions(nodeName, ff, true)
	assert.Equal(t, cypher, " WHERE  n.toto IN ['foo',false]", "should be equal")

}

func TestMatchFilter2CypherWhereConditions(t *testing.T) {
	nodeName := "n"

	ff := MatchFilter{
		FieldsValues: map[string][]interface{}{},
	}

	cypher := matchFilter2CypherConditions(nodeName, ff, false)
	assert.Equal(t, len(cypher), 0, "should be equal")

	ff = MatchFilter{
		FieldsValues: map[string][]interface{}{"toto": {"foo", "bar"}},
	}

	cypher = matchFilter2CypherConditions(nodeName, ff, false)
	assert.Equal(t, cypher[0], "n.toto =~ '(.*foo.*|.*bar.*)'", "should be equal")
}

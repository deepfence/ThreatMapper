package reporters

import (
	"testing"

	"github.com/samber/mo"
	"gotest.tools/assert"
)

func TestParseFieldFilters2CypherWhereConditions(t *testing.T) {
	node_name := "n"

	clause := parseFieldFilters2CypherWhereConditions(node_name, mo.None[FieldsFilters](), false)

	assert.Equal(t, clause, "", "Must be equal")

	clause = parseFieldFilters2CypherWhereConditions(node_name, mo.Some(FieldsFilters{}), false)

	assert.Equal(t, clause, "", "Must be equal")

	filters := FieldsFilters{
		ContainsFilter: ContainsFilter{
			FieldsValues: map[string][]interface{}{"foo": {"bar", "toto"}, "bar": {"foo", "titi"}},
		},
	}
	clause = parseFieldFilters2CypherWhereConditions(node_name, mo.Some(filters), false)

	res1 := "AND n.foo IN ['bar','toto'] AND n.bar IN ['foo','titi']"
	res2 := "AND n.bar IN ['foo','titi'] AND n.foo IN ['bar','toto']"

	assert.Check(t, clause == res1 || clause == res2)

	clause = parseFieldFilters2CypherWhereConditions(node_name, mo.Some(filters), true)

	res1 = "WHERE n.foo IN ['bar','toto'] AND n.bar IN ['foo','titi']"
	res2 = "WHERE n.bar IN ['foo','titi'] AND n.foo IN ['bar','toto']"

	assert.Check(t, clause == res1 || clause == res2)
}

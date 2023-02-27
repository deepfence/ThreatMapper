package reporters

import (
	"fmt"
	"strings"

	"github.com/samber/mo"
)

type FilterOperations string

const (
	CONTAINS FilterOperations = "contains"
)

type ContainsFilter struct {
	FieldsValues map[string][]interface{} `json:"filter_in" required:"true"`
}

type MatchFilter struct {
	FieldsValues map[string][]interface{} `json:"filter_in" required:"true"`
}

type OrderFilter struct {
	OrderField string `json:"order_field" required:"true"`
}

type FieldsFilters struct {
	ContainsFilter ContainsFilter `json:"contains_filter" required:"true"`
	MatchFilter    MatchFilter    `json:"match_filter" required:"true"`
	OrderFilter    OrderFilter    `json:"order_filter" required:"true"`
}

func containsFilter2CypherConditions(cypherNodeName string, filter ContainsFilter) []string {
	conditions := []string{}
	for k, vs := range filter.FieldsValues {
		var values []string
		for i := range vs {
			if str, ok := vs[i].(string); ok {
				values = append(values, fmt.Sprintf("'%s'", str))
			} else {
				values = append(values, fmt.Sprintf("%v", vs[i]))
			}
		}

		conditions = append(conditions, fmt.Sprintf("%s.%s IN [%s]", cypherNodeName, k, strings.Join(values, ",")))
	}
	return conditions
}

func OrderFilter2CypherCondition(cypherNodeName string, filter OrderFilter) string {
	if len(filter.OrderField) == 0 {
		return ""
	}
	return fmt.Sprintf(" ORDER BY %s.%s ", cypherNodeName, filter.OrderField)
}

func orderFilter2CypherWhere(cypherNodeName string, filter OrderFilter) []string {
	if filter.OrderField != "" {
		return []string{fmt.Sprintf("%s.%s IS NOT NULL", cypherNodeName, filter.OrderField)}
	}
	return []string{}
}

func ParseFieldFilters2CypherWhereConditions(cypherNodeName string, filters mo.Option[FieldsFilters], starts_where_clause bool) string {

	f, has := filters.Get()
	if !has {
		return ""
	}

	conditions := containsFilter2CypherConditions(cypherNodeName, f.ContainsFilter)

	conditions = append(conditions, matchFilter2CypherConditions(cypherNodeName, f.MatchFilter)...)

	conditions = append(conditions, orderFilter2CypherWhere(cypherNodeName, f.OrderFilter)...)

	if len(conditions) == 0 {
		return ""
	}

	first_clause := " AND "
	if starts_where_clause {
		first_clause = " WHERE "
	}

	return fmt.Sprintf("%s %s", first_clause, strings.Join(conditions, " AND "))
}

func ContainsFilter2CypherWhereConditions(cypherNodeName string, filter ContainsFilter, starts_where_clause bool) string {
	if len(filter.FieldsValues) == 0 {
		return ""
	}

	conditions := containsFilter2CypherConditions(cypherNodeName, filter)

	if len(conditions) == 0 {
		return ""
	}

	first_clause := " AND "
	if starts_where_clause {
		first_clause = " WHERE "
	}

	return fmt.Sprintf("%s %s", first_clause, strings.Join(conditions, " AND "))
}

func FieldFilterCypher(node_name string, fields []string) string {
	tmp := []string{}
	if len(fields) != 0 {
		for i := range fields {
			if fields[i] != "" {
				tmp = append(tmp, fmt.Sprintf("%s.%s", node_name, fields[i]))
			}
		}
		if len(tmp) != 0 {
			return strings.Join(tmp, ",")
		}
	}
	return node_name
}

func matchFilter2CypherConditions(cypherNodeName string, filter MatchFilter) []string {
	conditions := []string{}
	for k, vs := range filter.FieldsValues {
		var values []string
		for i := range vs {
			values = append(values, fmt.Sprintf(".*%v.*", vs[i]))
		}

		conditions = append(conditions, fmt.Sprintf("%s.%s =~ '(%s)'", cypherNodeName, k, strings.Join(values, "|")))
	}
	return conditions
}

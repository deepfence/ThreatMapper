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

type OrderSpec struct {
	FieldName  string `json:"field_name" required:"true"`
	Descending bool   `json:"descending" required:"true"`
}

type CompareFilter struct {
	FieldName   string      `json:"field_name" required:"true"`
	FieldValue  interface{} `json:"field_value" required:"true"`
	GreaterThan bool        `json:"greater_than" required:"true"`
}

type OrderFilter struct {
	OrderFields []OrderSpec `json:"order_fields" required:"true"`
}

type FieldsFilters struct {
	ContainsFilter    ContainsFilter  `json:"contains_filter" required:"true"`
	NotContainsFilter ContainsFilter  `json:"not_contains_filter"`
	MatchFilter       MatchFilter     `json:"match_filter" required:"true"`
	OrderFilter       OrderFilter     `json:"order_filter" required:"true"`
	CompareFilters    []CompareFilter `json:"compare_filter" required:"true"`
}

func containsFilter2CypherConditions(cypherNodeName string, filter ContainsFilter, in bool) []string {
	conditions := []string{}

	reverse_operator := ""
	if !in {
		reverse_operator = " NOT "
	}
	for k, vs := range filter.FieldsValues {
		if k == "node_type" {
			labels := []string{}
			for i := range vs {
				switch vs[i] {
				case "host":
					labels = append(labels, fmt.Sprintf("%s%s:Node", reverse_operator, cypherNodeName))
				case "image":
					labels = append(labels, fmt.Sprintf("%s%s:ContainerImage", reverse_operator, cypherNodeName))
				case "container_image":
					labels = append(labels, fmt.Sprintf("%s%s:ContainerImage", reverse_operator, cypherNodeName))
				case "container":
					labels = append(labels, fmt.Sprintf("%s%s:Container", reverse_operator, cypherNodeName))
				}
			}
			if in {
				conditions = append(conditions, strings.Join(labels, " OR "))
			} else {
				conditions = append(conditions, strings.Join(labels, " AND "))
			}
		} else {
			var values []string
			for i := range vs {
				if str, ok := vs[i].(string); ok {
					values = append(values, fmt.Sprintf("'%s'", str))
				} else {
					values = append(values, fmt.Sprintf("%v", vs[i]))
				}
			}

			conditions = append(conditions, fmt.Sprintf("%s.%s %sIN [%s]", cypherNodeName, k, reverse_operator, strings.Join(values, ",")))
		}
	}
	return conditions
}

func compareFilter2CypherConditions(cypherNodeName string, filters []CompareFilter) []string {
	var conditions []string
	for _, filter := range filters {
		compareOperator := ">"
		if !filter.GreaterThan {
			compareOperator = "<"
		}
		conditions = append(conditions, fmt.Sprintf("%s.%s %s %s", cypherNodeName, filter.FieldName, compareOperator, filter.FieldValue))
	}
	return conditions
}

func extractOrderDescFormattedField(field string, descending bool) string {
	if descending {
		return field + " DESC"
	}
	return field
}

func formatOrderField(format string, input []OrderSpec, ignoreOrder bool) []string {
	res := []string{}
	if len(input) == 0 {
		return res
	}

	for i := range input {
		if len(input[i].FieldName) == 0 {
			continue
		}
		orderByEntry := fmt.Sprintf(format, extractOrderDescFormattedField(input[i].FieldName, input[i].Descending && !ignoreOrder))
		res = append(res, orderByEntry)
	}

	return res
}

func OrderFilter2CypherCondition(cypherNodeName string, filter OrderFilter) string {
	if len(filter.OrderFields) == 0 {
		return ""
	}

	var list []string
	if cypherNodeName == "" {
		list = formatOrderField("%s", filter.OrderFields, false)
	} else {
		list = formatOrderField(cypherNodeName+".%s", filter.OrderFields, false)
	}

	if len(list) == 0 {
		return ""
	}

	return fmt.Sprintf(" ORDER BY %s ", strings.Join(list, ","))
}

func orderFilter2CypherWhere(cypherNodeName string, filter OrderFilter) []string {
	if len(filter.OrderFields) == 0 {
		return []string{}
	}

	return formatOrderField(cypherNodeName+".%s IS NOT NULL", filter.OrderFields, true)
}

func ParseFieldFilters2CypherWhereConditions(cypherNodeName string, filters mo.Option[FieldsFilters], starts_where_clause bool) string {

	f, has := filters.Get()
	if !has {
		return ""
	}

	conditions := containsFilter2CypherConditions(cypherNodeName, f.ContainsFilter, true)

	conditions = append(conditions, containsFilter2CypherConditions(cypherNodeName, f.NotContainsFilter, false)...)

	conditions = append(conditions, matchFilter2CypherConditions(cypherNodeName, f.MatchFilter)...)

	conditions = append(conditions, orderFilter2CypherWhere(cypherNodeName, f.OrderFilter)...)

	conditions = append(conditions, compareFilter2CypherConditions(cypherNodeName, f.CompareFilters)...)

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

	conditions := containsFilter2CypherConditions(cypherNodeName, filter, true)

	if len(conditions) == 0 {
		return ""
	}

	first_clause := " AND "
	if starts_where_clause {
		first_clause = " WHERE "
	}

	return fmt.Sprintf("%s %s", first_clause, strings.Join(conditions, " AND "))
}

func FieldFilterCypher(nodeName string, fields []string) string {
	tmp := []string{}
	if len(fields) != 0 {
		for i := range fields {
			if fields[i] != "" {
				if nodeName == "" {
					tmp = append(tmp, fmt.Sprintf("%s", fields[i]))
				} else {
					tmp = append(tmp, fmt.Sprintf("%s.%s", nodeName, fields[i]))
				}
			}
		}
		if len(tmp) != 0 {
			return strings.Join(tmp, ",")
		}
	}
	return nodeName
}

func FieldFilterCypherWithAlias(nodeName string, fields []string) string {
	tmp := []string{}
	if len(fields) != 0 {
		for i := range fields {
			if fields[i] != "" {
				tmp = append(tmp, fmt.Sprintf("%s.%s AS %s", nodeName, fields[i], fields[i]))
			}
		}
		if len(tmp) != 0 {
			return strings.Join(tmp, ",")
		}
	}
	return nodeName
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

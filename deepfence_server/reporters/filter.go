package reporters

import (
	"fmt"
	"strconv"
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
	Size       int    `json:"size"`
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

var severity_fields = map[string]struct{}{"cve_severity": {}, "file_severity": {}, "level": {}}

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
				case "cluster":
					labels = append(labels, fmt.Sprintf("%s%s:KubernetesCluster", reverse_operator, cypherNodeName))
				case "aws", "gcp", "azure":
					labels = append(labels, fmt.Sprintf("%s%s:CloudNode", reverse_operator, cypherNodeName))
					conditions = append(conditions, fmt.Sprintf("%s%s.cloud_provider = '%s' ", reverse_operator, cypherNodeName, vs[i]))
				}
			}
			if in {
				conditions = append(conditions, fmt.Sprintf("(%s)", strings.Join(labels, " OR ")))
			} else {
				conditions = append(conditions, fmt.Sprintf("(%s)", strings.Join(labels, " AND ")))
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

			if in {
				conditions = append(conditions, fmt.Sprintf("%s.%s IN [%s]", cypherNodeName, k, strings.Join(values, ",")))
			} else {
				conditions = append(conditions, fmt.Sprintf(" NOT coalesce(%s.%s, '') IN [%s]", cypherNodeName, k, strings.Join(values, ",")))
			}
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
		conditions = append(conditions, fmt.Sprintf("%s.%s %s %v", cypherNodeName, filter.FieldName, compareOperator, filter.FieldValue))
	}
	return conditions
}

func extractOrderDescFormattedField(field string, descending bool) string {
	if descending {
		return field + " DESC"
	}
	return field
}

func formatOrderField(format string, input []OrderSpec, ignoreOrder bool, ignoreSort bool) []string {
	res := []string{}
	if len(input) == 0 {
		return res
	}

	sevSortFieldsNum := 0
	for i := range input {
		if len(input[i].FieldName) == 0 {
			continue
		}
		orderByEntry := ""
		if _, has := severity_fields[input[i].FieldName]; has && !ignoreSort {
			fieldName := "severity" + strconv.Itoa(sevSortFieldsNum)
			sevSortFieldsNum += 1
			orderByEntry = fmt.Sprintf("%s", extractOrderDescFormattedField(fieldName, input[i].Descending && !ignoreOrder))
		} else {
			fieldName := input[i].FieldName
			orderByEntry = fmt.Sprintf(format, extractOrderDescFormattedField(fieldName, input[i].Descending && !ignoreOrder))
		}
		res = append(res, orderByEntry)
	}

	return res
}

func severityCypherValues(cypherNodeName, field string, num *int) string {
	if _, has := severity_fields[field]; has {
		res := `,CASE ` + cypherNodeName + `.` + field + ` WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 WHEN 'critical' THEN 3 ELSE -1 END AS severity` + strconv.Itoa(*num)
		*num += 1
		return res
	}
	return ""
}

func OrderFilter2CypherCondition(cypherNodeName string, filter OrderFilter, otherNodes []string) string {
	if len(filter.OrderFields) == 0 {
		return ""
	}

	var list []string
	if cypherNodeName == "" {
		list = formatOrderField("%s", filter.OrderFields, false, true)
		if len(list) == 0 {
			return ""
		}

		return fmt.Sprintf(" ORDER BY %s ", strings.Join(list, ","))
	}

	list = formatOrderField(cypherNodeName+".%s", filter.OrderFields, false, false)
	if len(list) == 0 {
		return ""
	}

	all_nodes := append(otherNodes, cypherNodeName)

	var list2 []string
	sevNum := 0
	for i, orderby := range list {
		size := filter.OrderFields[i].Size
		if size != 0 {
			list2 = append(list2, fmt.Sprintf(" WITH %s%s ORDER BY %s LIMIT %d ", strings.Join(all_nodes, ","), severityCypherValues(cypherNodeName, filter.OrderFields[i].FieldName, &sevNum), orderby, size))
		} else {
			list2 = append(list2, fmt.Sprintf(" WITH %s%s ORDER BY %s ", strings.Join(all_nodes, ","), severityCypherValues(cypherNodeName, filter.OrderFields[i].FieldName, &sevNum), orderby))
		}
	}

	return strings.Join(list2, "\n")
}

func orderFilter2CypherWhere(cypherNodeName string, filter OrderFilter) []string {
	if len(filter.OrderFields) == 0 {
		return []string{}
	}

	return formatOrderField(cypherNodeName+".%s IS NOT NULL", filter.OrderFields, true, true)
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

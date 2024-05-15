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
	ContainsFilter        ContainsFilter  `json:"contains_filter" required:"true"`
	NotContainsFilter     ContainsFilter  `json:"not_contains_filter"`
	ContainsInArrayFilter ContainsFilter  `json:"contains_in_array_filter"`
	MatchFilter           MatchFilter     `json:"match_filter" required:"true"`
	MatchInArrayFilter    MatchFilter     `json:"match_in_array_filter"`
	OrderFilter           OrderFilter     `json:"order_filter" required:"true"`
	CompareFilters        []CompareFilter `json:"compare_filter" required:"true"`
}

var severityFields = map[string]struct{}{"cve_severity": {}, "file_severity": {}, "level": {}}

var (
	nodeLabelsAvailableForNodeType = map[string]struct{}{
		"host":            struct{}{},
		"image":           struct{}{},
		"container_image": struct{}{},
		"container":       struct{}{},
		"cluster":         struct{}{},
		"aws":             struct{}{},
		"gcp":             struct{}{},
		"azure":           struct{}{},
	}
)

func containsFilter2CypherConditions(cypherNodeName string, filter ContainsFilter, in bool, isArrayProperty bool) []string {
	conditions := []string{}

	reverseOperator := ""
	if !in {
		reverseOperator = " NOT "
	}
	for k, vs := range filter.FieldsValues {
		acceptedNodeTypesFound := true
		if k == "node_type" {
			for _, v := range vs {
				_, acceptedNodeTypesFound = nodeLabelsAvailableForNodeType[v.(string)]
				if !acceptedNodeTypesFound {
					break
				}
			}
		}
		if k == "node_type" && acceptedNodeTypesFound {
			// If node types are part of supported list, use node label filter (better in performance) instead of field filter
			// MATCH (:VulnerabilityScan) -[:SCANNED]-> (m) WHERE (m:Container)
			// vs
			// MATCH (:VulnerabilityScan) -[:SCANNED]-> (m) WHERE m.node_type IN ['container']
			labels := []string{}
			for i := range vs {
				switch vs[i] {
				case "host":
					labels = append(labels, fmt.Sprintf("%s%s:Node", reverseOperator, cypherNodeName))
				case "image":
					labels = append(labels, fmt.Sprintf("%s%s:ContainerImage", reverseOperator, cypherNodeName))
				case "container_image":
					labels = append(labels, fmt.Sprintf("%s%s:ContainerImage", reverseOperator, cypherNodeName))
				case "container":
					labels = append(labels, fmt.Sprintf("%s%s:Container", reverseOperator, cypherNodeName))
				case "cluster":
					labels = append(labels, fmt.Sprintf("%s%s:KubernetesCluster", reverseOperator, cypherNodeName))
				case "aws", "gcp", "azure":
					labels = append(labels, fmt.Sprintf("%s%s:CloudNode", reverseOperator, cypherNodeName))
					conditions = append(conditions, fmt.Sprintf("%s%s.cloud_provider = '%s' ", reverseOperator, cypherNodeName, vs[i]))
				}
			}
			if in {
				conditions = append(conditions, fmt.Sprintf("(%s)", strings.Join(labels, " OR ")))
			} else {
				conditions = append(conditions, fmt.Sprintf("(%s)", strings.Join(labels, " AND ")))
			}
		} else {
			queryNodeName := ""
			if cypherNodeName != "" {
				queryNodeName = cypherNodeName + "."
			}
			var values []string
			for i := range vs {
				if str, ok := vs[i].(string); ok {
					values = append(values, fmt.Sprintf("'%s'", str))
				} else {
					values = append(values, fmt.Sprintf("%v", vs[i]))
				}
			}

			if in {
				if isArrayProperty {
					conditions = append(conditions, fmt.Sprintf("any(prop in %s%s WHERE prop IN [%s])", queryNodeName, k, strings.Join(values, ",")))
				} else {
					conditions = append(conditions, fmt.Sprintf("%s%s IN [%s]", queryNodeName, k, strings.Join(values, ",")))
				}
			} else {
				conditions = append(conditions, fmt.Sprintf(" NOT coalesce(%s%s, '') IN [%s]", queryNodeName, k, strings.Join(values, ",")))
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
		if _, has := severityFields[input[i].FieldName]; has && !ignoreSort {
			fieldName := "severity" + strconv.Itoa(sevSortFieldsNum)
			sevSortFieldsNum += 1
			orderByEntry = extractOrderDescFormattedField(fieldName, input[i].Descending && !ignoreOrder)
		} else {
			fieldName := input[i].FieldName
			orderByEntry = fmt.Sprintf(format, extractOrderDescFormattedField(fieldName, input[i].Descending && !ignoreOrder))
		}
		res = append(res, orderByEntry)
	}

	return res
}

func severityCypherValues(cypherNodeName, field string, num *int) string {
	if _, has := severityFields[field]; has {
		res := `,CASE ` + cypherNodeName + `.` + field + ` WHEN 'low' THEN 0 WHEN 'medium' THEN 1 WHEN 'high' THEN 2 WHEN 'critical' THEN 3 ELSE -1 END AS severity` + strconv.Itoa(*num)
		*num += 1
		return res
	}
	return ""
}

func OrderFilter2CypherCondition(cypherNodeName string, filter OrderFilter, allNodes []string) string {
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

	allNodes = append(allNodes, cypherNodeName)

	var list2 []string
	sevNum := 0
	for i, orderby := range list {
		size := filter.OrderFields[i].Size
		if size != 0 {
			list2 = append(list2, fmt.Sprintf(" WITH %s%s ORDER BY %s LIMIT %d ", strings.Join(allNodes, ","), severityCypherValues(cypherNodeName, filter.OrderFields[i].FieldName, &sevNum), orderby, size))
		} else {
			list2 = append(list2, fmt.Sprintf(" WITH %s%s ORDER BY %s ", strings.Join(allNodes, ","), severityCypherValues(cypherNodeName, filter.OrderFields[i].FieldName, &sevNum), orderby))
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

func ParseFieldFilters2CypherWhereConditions(cypherNodeName string, filters mo.Option[FieldsFilters], startsWhereClause bool) string {

	f, has := filters.Get()
	if !has {
		return ""
	}

	conditions := containsFilter2CypherConditions(cypherNodeName, f.ContainsFilter, true, false)

	conditions = append(conditions, containsFilter2CypherConditions(cypherNodeName, f.NotContainsFilter, false, false)...)

	conditions = append(conditions, containsFilter2CypherConditions(cypherNodeName, f.ContainsInArrayFilter, true, true)...)

	conditions = append(conditions, matchFilter2CypherConditions(cypherNodeName, f.MatchFilter, false)...)

	conditions = append(conditions, matchFilter2CypherConditions(cypherNodeName, f.MatchInArrayFilter, true)...)

	conditions = append(conditions, orderFilter2CypherWhere(cypherNodeName, f.OrderFilter)...)

	conditions = append(conditions, compareFilter2CypherConditions(cypherNodeName, f.CompareFilters)...)

	if len(conditions) == 0 {
		return ""
	}

	firstClause := " AND "
	if startsWhereClause {
		firstClause = " WHERE "
	}

	return fmt.Sprintf("%s %s", firstClause, strings.Join(conditions, " AND "))
}

func ContainsFilter2CypherWhereConditions(cypherNodeName string, filter ContainsFilter, startsWhereClause bool) string {
	if len(filter.FieldsValues) == 0 {
		return ""
	}

	conditions := containsFilter2CypherConditions(cypherNodeName, filter, true, false)

	if len(conditions) == 0 {
		return ""
	}

	firstClause := " AND "
	if startsWhereClause {
		firstClause = " WHERE "
	}

	return fmt.Sprintf("%s %s", firstClause, strings.Join(conditions, " AND "))
}

func FieldFilterCypher(nodeName string, fields []string) string {
	tmp := []string{}
	if len(fields) != 0 {
		for i := range fields {
			if fields[i] != "" {
				if nodeName == "" {
					tmp = append(tmp, fields[i])
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

func matchFilter2CypherConditions(cypherNodeName string, filter MatchFilter, isArrayProperty bool) []string {
	conditions := []string{}
	arrCond := "any(prop in %s.%s WHERE prop =~ '(%s)')"
	nonArrCond := "%s.%s =~ '(%s)'"
	for k, vs := range filter.FieldsValues {
		var values []string
		for i := range vs {
			values = append(values, fmt.Sprintf(".*%v.*", vs[i]))
		}

		if isArrayProperty {
			conditions = append(conditions, fmt.Sprintf(arrCond, cypherNodeName, k, strings.Join(values, "|")))
		} else {
			conditions = append(conditions, fmt.Sprintf(nonArrCond, cypherNodeName, k, strings.Join(values, "|")))
		}
	}
	return conditions
}

package reporters_lookup

import (
	"testing"

	"gotest.tools/assert"
)

func TestFilterFieldsToCypher(t *testing.T) {
	node_name := "n"
	cypher := fieldFilterCypher(node_name, []string{})
	assert.Equal(t, cypher, node_name, "should be equal")

	cypher = fieldFilterCypher(node_name, []string{"bar", "foo"})
	assert.Equal(t, cypher, "n.bar,n.foo", "should be equal")
}

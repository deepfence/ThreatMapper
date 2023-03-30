package report

import (
	"bytes"
	"fmt"
	"sort"

	"github.com/weaveworks/scope/ps"
)

// Helper functions for ps.Map, without considering what is inside

// Return a new map containing all the elements of the two input maps
// and where the same Key is in both, pick 'b' where prefer(a,b) is true
func mergeMaps(m, n *ps.Tree, prefer func(a, b interface{}) bool) *ps.Tree {
	switch {
	case m == nil:
		return n
	case n == nil:
		return m
	case m.Size() < n.Size():
		m, n = n, m
	}

	n.ForEach(func(Key string, val interface{}) {
		if existingVal, found := m.Lookup(Key); found {
			if prefer(existingVal, val) {
				m = m.Set(Key, val)
			}
		} else {
			m = m.Set(Key, val)
		}
	})

	return m
}

func mapEqual(m, n *ps.Tree, equalf func(a, b interface{}) bool) bool {
	var mSize, nSize int
	if m != nil {
		mSize = m.Size()
	}
	if n != nil {
		nSize = n.Size()
	}
	if mSize != nSize {
		return false
	}
	if mSize == 0 {
		return true
	}
	equal := true
	m.ForEach(func(k string, val interface{}) {
		if otherValue, ok := n.Lookup(k); !ok {
			equal = false
		} else {
			equal = equal && equalf(val, otherValue)
		}
	})
	return equal
}

// very similar to ps.Map.String() but with keys sorted
func mapToString(m *ps.Tree) string {
	buf := bytes.NewBufferString("{")
	for _, Key := range mapKeys(m) {
		val, _ := m.Lookup(Key)
		fmt.Fprintf(buf, "%s: %s,\n", Key, val)
	}
	fmt.Fprintf(buf, "}")
	return buf.String()
}

func mapKeys(m *ps.Tree) []string {
	if m == nil {
		return nil
	}
	keys := m.Keys()
	sort.Strings(keys)
	return keys
}

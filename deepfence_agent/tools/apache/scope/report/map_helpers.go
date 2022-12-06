package report

import (
	"bytes"
	"fmt"
	"sort"
	"time"

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

// constants from https://github.com/ugorji/go/blob/master/codec/helper.go#L207
const (
	containerMapKey   = 2
	containerMapValue = 3
	containerMapEnd   = 4
	// from https://github.com/ugorji/go/blob/master/codec/helper.go#L152
	cUTF8 = 2
)

// This implementation does not use the intermediate form as that was a
// performance issue; skipping it saved almost 10% CPU.  Note this means
// we are using undocumented, internal APIs, which could break in the future.
// See https://github.com/weaveworks/scope/pull/1709 for more information.
//func mapRead(decoder *codec.Decoder, decodeValue func(isNil bool) interface{}) ps.Map {
//	decoder.Decode()
//	z, r := codec.GenHelper().Decoder(decoder)
//	if r.TryDecodeAsNil() {
//		return ps.NewMap()
//	}
//
//	length := r.ReadMapStart()
//	out := ps.NewMap()
//	for i := 0; length < 0 || i < length; i++ {
//		if length < 0 && r.CheckBreak() {
//			break
//		}
//
//		var Key string
//		z.DecSendContainerState(containerMapKey)
//		if !r.TryDecodeAsNil() {
//			Key = lookupCommonKey(r.DecodeStringAsBytes())
//		}
//
//		z.DecSendContainerState(containerMapValue)
//		value := decodeValue(r.TryDecodeAsNil())
//		out = out.UnsafeMutableSet(Key, value)
//	}
//	z.DecSendContainerState(containerMapEnd)
//	return out
//}

// Inverse of mapRead, done for performance. Same comments about
// undocumented internal APIs apply.
//func mapWrite(m ps.Map, encoder *codec.Encoder, encodeValue func(*codec.Encoder, interface{})) {
//	z, r := codec.GenHelperEncoder(encoder)
//	if m == nil || m.IsNil() {
//		r.EncodeNil()
//		return
//	}
//	r.EncodeMapStart(m.Size())
//	m.ForEach(func(Key string, val interface{}) {
//		z.EncSendContainerState(containerMapKey)
//		r.EncodeString(cUTF8, Key)
//		z.EncSendContainerState(containerMapValue)
//		encodeValue(encoder, val)
//	})
//	z.EncSendContainerState(containerMapEnd)
//}

// Now follow helpers for StringLatestMap

// These let us sort a StringLatestMap strings by Key
func (m StringLatestMap) Len() int           { return len(m) }
func (m StringLatestMap) Swap(i, j int)      { m[i], m[j] = m[j], m[i] }
func (m StringLatestMap) Less(i, j int) bool { return m[i].Key < m[j].Key }

// sort entries and shuffle down any duplicates. NOTE: may modify contents of m.
func (m StringLatestMap) sortedAndDeduplicated() StringLatestMap {
	sort.Sort(m)
	for i := 1; i < len(m); {
		if m[i-1].Key == m[i].Key {
			if m[i-1].Timestamp.Before(m[i].Timestamp) {
				m = append(m[:i-1], m[i:]...)
			} else {
				m = append(m[:i], m[i+1:]...)
			}
		} else {
			i++
		}
	}
	return m
}

// add several entries at the same timestamp
func (m StringLatestMap) addMapEntries(ts time.Time, n map[string]string) StringLatestMap {
	out := make(StringLatestMap, len(m), len(m)+len(n))
	copy(out, m)
	for k, v := range n {
		out = append(out, stringLatestEntry{Key: k, Value: v, Timestamp: ts})
	}
	return out.sortedAndDeduplicated()
}

// Propagate a set of latest values from one set to another.
func (m StringLatestMap) Propagate(from StringLatestMap, keys ...string) StringLatestMap {
	out := make(StringLatestMap, len(m), len(m)+len(keys))
	copy(out, m)
	for _, k := range keys {
		if v, ts, ok := from.LookupEntry(k); ok {
			out = append(out, stringLatestEntry{Key: k, Value: v, Timestamp: ts})
		}
	}
	return out.sortedAndDeduplicated()
}

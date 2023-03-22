// Generated file, do not edit.
// To regenerate, run ../extras/generate_latest_map ./latest_map_generated.go string

package report

import (
	"bytes"
	"fmt"
	"sort"
	"time"
)

type stringLatestEntry struct {
	Key       string    `json:"key"`
	Timestamp time.Time `json:"timestamp"`
	Value     string    `json:"value"`
}

// String returns the StringLatestEntry's string representation.
func (e *stringLatestEntry) String() string {
	return fmt.Sprintf("%v (%s)", e.Value, e.Timestamp.Format(time.RFC3339))
}

// Equal returns true if the supplied StringLatestEntry is equal to this one.
func (e *stringLatestEntry) Equal(e2 *stringLatestEntry) bool {
	return e.Timestamp.Equal(e2.Timestamp) && e.Value == e2.Value
}

// StringLatestMap holds latest string instances, as a slice sorted by Key.
type StringLatestMap []stringLatestEntry

// MakeStringLatestMap makes an empty StringLatestMap.
func MakeStringLatestMap() StringLatestMap {
	return StringLatestMap{}
}

// Size returns the number of elements.
func (m StringLatestMap) Size() int {
	return len(m)
}

// Merge produces a StringLatestMap containing the keys from both inputs.
// When both inputs contain the same Key, the newer value is used.
// Tries to return one of its inputs, if that already holds the correct result.
func (m StringLatestMap) Merge(n StringLatestMap) StringLatestMap {
	switch {
	case len(m) == 0:
		return n
	case len(n) == 0:
		return m
	}
	if len(n) > len(m) {
		m, n = n, m //swap so m is always at least as long as n
	} else if len(n) == len(m) && m[0].Timestamp.Before(n[0].Timestamp) {
		// Optimise common case where we merge two nodes with the same contents
		// sampled at different times.
		m, n = n, m // swap equal-length arrays so first element of m is newer
	}

	i, j := 0, 0
loop:
	for i < len(m) {
		switch {
		case j >= len(n):
			return m
		case m[i].Key == n[j].Key:
			if m[i].Timestamp.Before(n[j].Timestamp) {
				break loop
			}
			i++
			j++
		case m[i].Key < n[j].Key:
			i++
		default:
			break loop
		}
	}
	if i >= len(m) && j >= len(n) {
		return m
	}

	out := make([]stringLatestEntry, i, len(m))
	copy(out, m[:i])

	for i < len(m) {
		switch {
		case j >= len(n):
			out = append(out, m[i:]...)
			return out
		case m[i].Key == n[j].Key:
			if m[i].Timestamp.Before(n[j].Timestamp) {
				out = append(out, n[j])
			} else {
				out = append(out, m[i])
			}
			i++
			j++
		case m[i].Key < n[j].Key:
			out = append(out, m[i])
			i++
		default:
			out = append(out, n[j])
			j++
		}
	}
	out = append(out, n[j:]...)
	return out
}

// Lookup the value for the given Key.
func (m StringLatestMap) Lookup(Key string) (string, bool) {
	v, _, ok := m.LookupEntry(Key)
	if !ok {
		var zero string
		return zero, false
	}
	return v, true
}

// LookupEntry returns the raw entry for the given Key.
func (m StringLatestMap) LookupEntry(Key string) (string, time.Time, bool) {
	i := sort.Search(len(m), func(i int) bool {
		return m[i].Key >= Key
	})
	if i < len(m) && m[i].Key == Key {
		return m[i].Value, m[i].Timestamp, true
	}
	var zero string
	return zero, time.Time{}, false
}

// locate the position where Key should go, and make room for it if not there already
func (m *StringLatestMap) locate(Key string) int {
	i := sort.Search(len(*m), func(i int) bool {
		return (*m)[i].Key >= Key
	})
	// i is now the position where Key should go, either at the end or in the middle
	if i == len(*m) || (*m)[i].Key != Key {
		*m = append(*m, stringLatestEntry{})
		copy((*m)[i+1:], (*m)[i:])
		(*m)[i] = stringLatestEntry{}
	}
	return i
}

// Set the value for the given Key.
func (m StringLatestMap) Set(Key string, timestamp time.Time, value string) StringLatestMap {
	i := sort.Search(len(m), func(i int) bool {
		return m[i].Key >= Key
	})
	// i is now the position where Key should go, either at the end or in the middle
	oldEntries := m
	if i == len(m) {
		m = make([]stringLatestEntry, len(oldEntries)+1)
		copy(m, oldEntries)
	} else if m[i].Key == Key {
		m = make([]stringLatestEntry, len(oldEntries))
		copy(m, oldEntries)
	} else {
		m = make([]stringLatestEntry, len(oldEntries)+1)
		copy(m, oldEntries[:i])
		copy(m[i+1:], oldEntries[i:])
	}
	m[i] = stringLatestEntry{Key: Key, Timestamp: timestamp, Value: value}
	return m
}

// ForEach executes fn on each Key value pair in the map.
func (m StringLatestMap) ForEach(fn func(k string, timestamp time.Time, v string)) {
	for _, value := range m {
		fn(value.Key, value.Timestamp, value.Value)
	}
}

// String returns the StringLatestMap's string representation.
func (m StringLatestMap) String() string {
	buf := bytes.NewBufferString("{")
	for _, val := range m {
		fmt.Fprintf(buf, "%s: %s,\n", val.Key, val.String())
	}
	fmt.Fprintf(buf, "}")
	return buf.String()
}

// DeepEqual tests equality with other StringLatestMap.
func (m StringLatestMap) DeepEqual(n StringLatestMap) bool {
	if m.Size() != n.Size() {
		return false
	}
	for i := range m {
		if m[i].Key != n[i].Key || !m[i].Equal(&n[i]) {
			return false
		}
	}
	return true
}

// EqualIgnoringTimestamps returns true if all keys and values are the same.
func (m StringLatestMap) EqualIgnoringTimestamps(n StringLatestMap) bool {
	if m.Size() != n.Size() {
		return false
	}
	for i := range m {
		if m[i].Key != n[i].Key || m[i].Value != n[i].Value {
			return false
		}
	}
	return true
}

// CodecEncodeSelf implements codec.Selfer.
// Duplicates the output for a built-in map without generating an
// intermediate copy of the data structure, to save time.  Note this
// means we are using undocumented, internal APIs, which could break
// in the future.  See https://github.com/weaveworks/scope/pull/1709
// for more information.
//func (m StringLatestMap) CodecEncodeSelf(encoder *codec.Encoder) {
//	encoder.Encode(m)
//}

// CodecDecodeSelf implements codec.Selfer.
// Decodes the input as for a built-in map, without creating an
// intermediate copy of the data structure to save time. Uses
// undocumented, internal APIs as for CodecEncodeSelf.
//func (m *StringLatestMap) CodecDecodeSelf(decoder *codec.Decoder) {
//	decoder.Decode(m)
//}

// MarshalJSON shouldn't be used, use CodecEncodeSelf instead.
//func (StringLatestMap) MarshalJSON() ([]byte, error) {
//	panic("MarshalJSON shouldn't be used, use CodecEncodeSelf instead")
//}
//
//// UnmarshalJSON shouldn't be used, use CodecDecodeSelf instead.
//func (*StringLatestMap) UnmarshalJSON(b []byte) error {
//	panic("UnmarshalJSON shouldn't be used, use CodecDecodeSelf instead")
//}

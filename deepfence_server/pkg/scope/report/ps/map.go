// Fully persistent data structures. A persistent data structure is a data
// structure that always preserves the previous version of itself when
// it is modified. Such data structures are effectively immutable,
// as their operations do not update the structure in-place, but instead
// always yield a new structure.
//
// Persistent
// data structures typically share structure among themselves.  This allows
// operations to avoid copying the entire data structure.
package ps

import (
	"bytes"
	"fmt"
	"unsafe"
)

// A Map associates unique keys (type string) with values (type Any).
type Map interface {
	// IsNil returns true if the Map is empty
	IsNil() bool

	// Set returns a new map in which Key and Value are associated.
	// If the Key didn't exist before, it's created; otherwise, the
	// associated Value is changed.
	// This operation is O(log N) in the number of keys.
	Set(Key string, Value interface{}) Map

	// UnsafeMutableSet returns the same map in which Key and Value are associated in-place.
	// If the Key didn't exist before, it's created; otherwise, the
	// associated Value is changed.
	// This operation is O(log N) in the number of keys.
	// Only use UnsafeMutableSet if you are the only reference-holder of the Map.
	UnsafeMutableSet(Key string, Value interface{}) Map

	// Delete returns a new map with the association for Key, if any, removed.
	// This operation is O(log N) in the number of keys.
	Delete(Key string) Map

	// Lookup returns the Value associated with a Key, if any.  If the Key
	// exists, the second return Value is true; otherwise, false.
	// This operation is O(log N) in the number of keys.
	Lookup(Key string) (interface{}, bool)

	// Size returns the number of Key Value pairs in the map.
	// This takes O(1) time.
	Size() int

	// ForEach executes a callback on each Key Value pair in the map.
	ForEach(f func(Key string, val interface{}))

	// Keys returns a slice with all keys in this map.
	// This operation is O(N) in the number of keys.
	Keys() []string

	String() string
}

type Tree struct {
	Map map[string]interface{} `json:"map"`
}

// Delete implements Map
func (t *Tree) Delete(Key string) *Tree {
	delete(t.Map, Key)
	return t

}

// ForEach implements Map
func (t *Tree) ForEach(f func(Key string, val interface{})) {
	for k, v := range t.Map {
		f(k, v)
	}
}

// IsNil implements Map
func (t *Tree) IsNil() bool {
	return t == nil
}

// Keys implements Map
func (t *Tree) Keys() []string {
	keys := []string{}
	for k := range t.Map {
		keys = append(keys, k)
	}
	return keys
}

// Lookup implements Map
func (t *Tree) Lookup(Key string) (interface{}, bool) {
	v, ok := t.Map[Key]
	return v, ok
}

// Set implements Map
func (t *Tree) Set(Key string, Value interface{}) *Tree {
	t.Map[Key] = Value
	return t
}

// Size implements Map
func (t *Tree) Size() int {
	return len(t.Map)
}

// String implements Map
func (t *Tree) String() string {
	return "unimpl"
}

// UnsafeMutableSet implements Map
func (t *Tree) UnsafeMutableSet(Key string, Value interface{}) *Tree {
	t.Map[Key] = Value
	return t
}

// Immutable (i.e. persistent) associative array
const childCount = 8
const shiftSize = 3

type Tree3 struct {
	Count    int                `json:"count"`
	Hash     uint64             `json:"hash"` // Hash of the Key (used for Tree3 balancing)
	Key      string             `json:"key"`
	Value    interface{}        `json:"value"`
	Children [childCount]*Tree3 `json:"children"`
}

var nilMap = &Tree3{}

// Recursively set nilMap's subtrees to point at itself.
// This eliminates all nil pointers in the map structure.
// All map nodes are created by cloning this structure so
// they avoid the problem too.
func init() {
	for i := range nilMap.Children {
		nilMap.Children[i] = nilMap
	}
}

// NewMap allocates a new, persistent map from strings to values of
// any type.
// This is currently implemented as a path-copying binary Tree3.
func NewMap() *Tree {
	return &Tree{
		Map: map[string]interface{}{},
	}
}

func (self *Tree3) IsNil() bool {
	return self == nilMap
}

// clone returns an exact duplicate of a Tree3 node
func (self *Tree3) clone() *Tree3 {
	var m Tree3
	m = *self
	return &m
}

// constants for FNV-1a Hash algorithm
const (
	offset64 uint64 = 14695981039346656037
	prime64  uint64 = 1099511628211
)

type unsafeString struct {
	Data uintptr
	Len  int
}

type unsafeSlice struct {
	Data uintptr
	Len  int
	Cap  int
}

var zeroByteSlice = []byte{}

// bytesView returns a view of the string as a []byte.
// It doesn't incur allocation and copying caused by conversion but it's
// unsafe, use with care.
func bytesView(v string) []byte {
	if len(v) == 0 {
		return zeroByteSlice
	}

	sx := (*unsafeString)(unsafe.Pointer(&v))
	bx := unsafeSlice{sx.Data, sx.Len, sx.Len}
	return *(*[]byte)(unsafe.Pointer(&bx))
}

// hashKey returns a Hash code for a given string
func hashKey(Key string) uint64 {
	Hash := offset64

	for _, b := range bytesView(Key) {
		Hash ^= uint64(b)
		Hash *= prime64
	}
	return Hash
}

// Set returns a new map similar to this one but with Key and Value
// associated.  If the Key didn't exist, it's created; otherwise, the
// associated Value is changed.
func (self *Tree3) Set(Key string, Value interface{}) *Tree3 {
	Hash := hashKey(Key)
	return setLowLevel(self, Hash, Hash, Key, Value)
}

func setLowLevel(self *Tree3, partialHash, Hash uint64, Key string, Value interface{}) *Tree3 {
	if self == nil {
		m := nilMap
		m.Count = 1
		m.Hash = Hash
		m.Key = Key
		m.Value = Value
		return m
	} else if self.IsNil() { // an empty Tree3 is easy
		m := self.clone()
		m.Count = 1
		m.Hash = Hash
		m.Key = Key
		m.Value = Value
		return m
	}

	if Hash != self.Hash {
		m := self.clone()
		i := partialHash % childCount
		m.Children[i] = setLowLevel(self.Children[i], partialHash>>shiftSize, Hash, Key, Value)
		// update Count if we added a new object
		if m.Children[i].Count > self.Children[i].Count {
			m.Count++
		}
		return m
	}

	// did we find a Hash collision?
	if Key != self.Key {
		oops := fmt.Sprintf("Hash collision between: '%s' and '%s'.  Please report to https://github.com/mndrix/ps/issues/new", self.Key, Key)
		panic(oops)
	}

	// replacing a Key's previous Value
	m := self.clone()
	m.Value = Value
	return m
}

// UnsafeMutableSet is the in-place mutable version of Set. Only use if
// you are the only reference-holder of the Map.
func (self *Tree3) UnsafeMutableSet(Key string, Value interface{}) *Tree3 {
	Hash := hashKey(Key)
	return mutableSetLowLevel(self, Hash, Hash, Key, Value)
}

func mutableSetLowLevel(self *Tree3, partialHash, Hash uint64, Key string, Value interface{}) *Tree3 {
	if self == nil {
		m := nilMap
		m.Count = 1
		m.Hash = Hash
		m.Key = Key
		m.Value = Value
		return m
	} else if self.IsNil() { // an empty Tree3 is easy
		m := self.clone()
		m.Count = 1
		m.Hash = Hash
		m.Key = Key
		m.Value = Value
		return m
	}

	if Hash != self.Hash {
		i := partialHash % childCount
		oldChildCount := self.Children[i].Count
		self.Children[i] = mutableSetLowLevel(self.Children[i], partialHash>>shiftSize, Hash, Key, Value)
		// update Count if we added a new object
		if oldChildCount < self.Children[i].Count {
			self.Count++
		}
		return self
	}

	// did we find a Hash collision?
	if Key != self.Key {
		oops := fmt.Sprintf("Hash collision between: '%s' and '%s'.  Please report to https://github.com/mndrix/ps/issues/new", self.Key, Key)
		panic(oops)
	}

	// replacing a Key's previous Value
	self.Value = Value
	return self
}

// modifies a map by recalculating its Key Count based on the counts
// of its subtrees
func recalculateCount(m *Tree3) {
	Count := 0
	for _, t := range m.Children {
		Count += t.Size()
	}
	m.Count = Count + 1 // add one to Count ourself
}

func (m *Tree3) Delete(Key string) *Tree3 {
	Hash := hashKey(Key)
	newMap, _ := deleteLowLevel(m, Hash, Hash)
	return newMap
}

func deleteLowLevel(self *Tree3, partialHash, Hash uint64) (*Tree3, bool) {
	// empty trees are easy
	if self.IsNil() || self == nil {
		return self, false
	}

	if Hash != self.Hash {
		i := partialHash % childCount
		child, found := deleteLowLevel(self.Children[i], partialHash>>shiftSize, Hash)
		if !found {
			return self, false
		}
		newMap := self.clone()
		newMap.Children[i] = child
		recalculateCount(newMap)
		return newMap, true // ? this wasn't in the original code
	}

	// we must delete our own node
	if self.isLeaf() { // we have no Children
		return nilMap, true
	}
	/*
	   if self.subtreeCount() == 1 { // only one subtree
	       for _, t := range self.Children {
	           if t != nilMap {
	               return t, true
	           }
	       }
	       panic("Tree3 with 1 subtree actually had no subtrees")
	   }
	*/

	// find a node to replace us
	i := -1
	size := -1
	for j, t := range self.Children {
		if t.Size() > size {
			i = j
			size = t.Size()
		}
	}

	// make chosen leaf smaller
	replacement, child := self.Children[i].deleteLeftmost()
	newMap := replacement.clone()
	for j := range self.Children {
		if j == i {
			newMap.Children[j] = child
		} else {
			newMap.Children[j] = self.Children[j]
		}
	}
	recalculateCount(newMap)
	return newMap, true
}

// delete the leftmost node in a Tree3 returning the node that
// was deleted and the Tree3 left over after its deletion
func (m *Tree3) deleteLeftmost() (*Tree3, *Tree3) {
	if m.isLeaf() {
		return m, nilMap
	}

	for i, t := range m.Children {
		if t != nilMap {
			deleted, child := t.deleteLeftmost()
			newMap := m.clone()
			newMap.Children[i] = child
			recalculateCount(newMap)
			return deleted, newMap
		}
	}
	panic("Tree3 isn't a leaf but also had no Children. How does that happen?")
}

// isLeaf returns true if this is a leaf node
func (m *Tree3) isLeaf() bool {
	return m.Size() == 1
}

// returns the number of child subtrees we have
func (m *Tree3) subtreeCount() int {
	Count := 0
	for _, t := range m.Children {
		if t != nilMap {
			Count++
		}
	}
	return Count
}

func (m *Tree3) Lookup(Key string) (interface{}, bool) {
	Hash := hashKey(Key)
	return lookupLowLevel(m, Hash, Hash)
}

func lookupLowLevel(self *Tree3, partialHash, Hash uint64) (interface{}, bool) {
	if self.IsNil() || self == nil { // an empty Tree3 is easy
		return nil, false
	}

	if Hash != self.Hash {
		i := partialHash % childCount
		return lookupLowLevel(self.Children[i], partialHash>>shiftSize, Hash)
	}

	// we found it
	return self.Value, true
}

func (m *Tree3) Size() int {
	return m.Count
}

func (m *Tree3) ForEach(f func(Key string, val interface{})) {
	if m.IsNil() || m == nil {
		return
	}

	// ourself
	f(m.Key, m.Value)

	// Children
	for _, t := range m.Children {
		if t != nilMap {
			t.ForEach(f)
		}
	}
}

func (m *Tree3) Keys() []string {
	keys := make([]string, m.Size())
	i := 0
	m.ForEach(func(k string, v interface{}) {
		keys[i] = k
		i++
	})
	return keys
}

// make it easier to display maps for debugging
func (m *Tree3) String() string {
	keys := m.Keys()
	buf := bytes.NewBufferString("{")
	for _, Key := range keys {
		val, _ := m.Lookup(Key)
		fmt.Fprintf(buf, "%s: %s, ", Key, val)
	}
	fmt.Fprintf(buf, "}\n")
	return buf.String()
}

//func (m *Tree3) MarshalJSON() ([]byte, error) {
//	tmp := map[string]interface{}{}
//	m.ForEach(func(k string, v interface{}) {
//		tmp[k] = v
//	})
//	return json.Marshal(tmp)
//}
//
//// UnmarshalJSON shouldn't be used, use CodecDecodeSelf instead
//func (m *Tree3) UnmarshalJSON(b []byte) error {
//	tmp := map[string]interface{}{}
//	err := json.Unmarshal(b, &tmp)
//	if err != nil {
//		return err
//	}
//	m = &Tree3{}
//	for k, v := range tmp {
//		m = m.Set(k, v)
//	}
//	return nil
//}

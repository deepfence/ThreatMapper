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
func (t *Tree) Delete(key string) *Tree {
	delete(t.Map, key)
	return t

}

// ForEach implements Map
func (t *Tree) ForEach(f func(key string, val interface{})) {
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
func (t *Tree) Lookup(key string) (interface{}, bool) {
	v, ok := t.Map[key]
	return v, ok
}

// Set implements Map
func (t *Tree) Set(key string, value interface{}) *Tree {
	t.Map[key] = value
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
func (t *Tree) UnsafeMutableSet(key string, value interface{}) *Tree {
	t.Map[key] = value
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

func (t *Tree3) IsNil() bool {
	return t == nilMap
}

// clone returns an exact duplicate of a Tree3 node
func (t *Tree3) clone() *Tree3 {
	m := *t
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
func hashKey(key string) uint64 {
	hash := offset64

	for _, b := range bytesView(key) {
		hash ^= uint64(b)
		hash *= prime64
	}
	return hash
}

// Set returns a new map similar to this one but with Key and Value
// associated.  If the Key didn't exist, it's created; otherwise, the
// associated Value is changed.
func (t *Tree3) Set(key string, value interface{}) *Tree3 {
	hash := hashKey(key)
	return setLowLevel(t, hash, hash, key, value)
}

func setLowLevel(self *Tree3, partialHash, hash uint64, key string, value interface{}) *Tree3 {
	if self == nil {
		m := nilMap
		m.Count = 1
		m.Hash = hash
		m.Key = key
		m.Value = value
		return m
	} else if self.IsNil() { // an empty Tree3 is easy
		m := self.clone()
		m.Count = 1
		m.Hash = hash
		m.Key = key
		m.Value = value
		return m
	}

	if hash != self.Hash {
		m := self.clone()
		i := partialHash % childCount
		m.Children[i] = setLowLevel(self.Children[i], partialHash>>shiftSize, hash, key, value)
		// update Count if we added a new object
		if m.Children[i].Count > self.Children[i].Count {
			m.Count++
		}
		return m
	}

	// did we find a Hash collision?
	if key != self.Key {
		oops := fmt.Sprintf("Hash collision between: '%s' and '%s'.  Please report to https://github.com/mndrix/ps/issues/new", self.Key, key)
		panic(oops)
	}

	// replacing a Key's previous Value
	m := self.clone()
	m.Value = value
	return m
}

// UnsafeMutableSet is the in-place mutable version of Set. Only use if
// you are the only reference-holder of the Map.
func (t *Tree3) UnsafeMutableSet(key string, value interface{}) *Tree3 {
	hash := hashKey(key)
	return mutableSetLowLevel(t, hash, hash, key, value)
}

func mutableSetLowLevel(t *Tree3, partialHash, hash uint64, key string, value interface{}) *Tree3 {
	if t == nil {
		m := nilMap
		m.Count = 1
		m.Hash = hash
		m.Key = key
		m.Value = value
		return m
	} else if t.IsNil() { // an empty Tree3 is easy
		m := t.clone()
		m.Count = 1
		m.Hash = hash
		m.Key = key
		m.Value = value
		return m
	}

	if hash != t.Hash {
		i := partialHash % childCount
		oldChildCount := t.Children[i].Count
		t.Children[i] = mutableSetLowLevel(t.Children[i], partialHash>>shiftSize, hash, key, value)
		// update Count if we added a new object
		if oldChildCount < t.Children[i].Count {
			t.Count++
		}
		return t
	}

	// did we find a Hash collision?
	if key != t.Key {
		oops := fmt.Sprintf("Hash collision between: '%s' and '%s'.  Please report to https://github.com/mndrix/ps/issues/new", t.Key, key)
		panic(oops)
	}

	// replacing a Key's previous Value
	t.Value = value
	return t
}

// modifies a map by recalculating its Key Count based on the counts
// of its subtrees
func recalculateCount(t *Tree3) {
	count := 0
	for _, t := range t.Children {
		count += t.Size()
	}
	t.Count = count + 1 // add one to Count ourself
}

func (t *Tree3) Delete(key string) *Tree3 {
	hash := hashKey(key)
	newMap, _ := deleteLowLevel(t, hash, hash)
	return newMap
}

func deleteLowLevel(t *Tree3, partialHash, hash uint64) (*Tree3, bool) {
	// empty trees are easy
	if t.IsNil() || t == nil {
		return t, false
	}

	if hash != t.Hash {
		i := partialHash % childCount
		child, found := deleteLowLevel(t.Children[i], partialHash>>shiftSize, hash)
		if !found {
			return t, false
		}
		newMap := t.clone()
		newMap.Children[i] = child
		recalculateCount(newMap)
		return newMap, true // ? this wasn't in the original code
	}

	// we must delete our own node
	if t.isLeaf() { // we have no Children
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
	for j, t := range t.Children {
		if t.Size() > size {
			i = j
			size = t.Size()
		}
	}

	// make chosen leaf smaller
	replacement, child := t.Children[i].deleteLeftmost()
	newMap := replacement.clone()
	for j := range t.Children {
		if j == i {
			newMap.Children[j] = child
		} else {
			newMap.Children[j] = t.Children[j]
		}
	}
	recalculateCount(newMap)
	return newMap, true
}

// delete the leftmost node in a Tree3 returning the node that
// was deleted and the Tree3 left over after its deletion
func (t *Tree3) deleteLeftmost() (*Tree3, *Tree3) {
	if t.isLeaf() {
		return t, nilMap
	}

	for i, t := range t.Children {
		if t != nilMap {
			deleted, child := t.deleteLeftmost()
			newMap := t.clone()
			newMap.Children[i] = child
			recalculateCount(newMap)
			return deleted, newMap
		}
	}
	panic("Tree3 isn't a leaf but also had no Children. How does that happen?")
}

// isLeaf returns true if this is a leaf node
func (t *Tree3) isLeaf() bool {
	return t.Size() == 1
}

func (t *Tree3) Lookup(key string) (interface{}, bool) {
	hash := hashKey(key)
	return lookupLowLevel(t, hash, hash)
}

func lookupLowLevel(t *Tree3, partialHash, hash uint64) (interface{}, bool) {
	if t.IsNil() || t == nil { // an empty Tree3 is easy
		return nil, false
	}

	if hash != t.Hash {
		i := partialHash % childCount
		return lookupLowLevel(t.Children[i], partialHash>>shiftSize, hash)
	}

	// we found it
	return t.Value, true
}

func (t *Tree3) Size() int {
	return t.Count
}

func (t *Tree3) ForEach(f func(key string, val interface{})) {
	if t.IsNil() || t == nil {
		return
	}

	// ourself
	f(t.Key, t.Value)

	// Children
	for _, t := range t.Children {
		if t != nilMap {
			t.ForEach(f)
		}
	}
}

func (t *Tree3) Keys() []string {
	keys := make([]string, t.Size())
	i := 0
	t.ForEach(func(k string, v interface{}) {
		keys[i] = k
		i++
	})
	return keys
}

// make it easier to display maps for debugging
func (t *Tree3) String() string {
	keys := t.Keys()
	buf := bytes.NewBufferString("{")
	for _, Key := range keys {
		val, _ := t.Lookup(Key)
		fmt.Fprintf(buf, "%s: %s, ", Key, val)
	}
	fmt.Fprintf(buf, "}\n")
	return buf.String()
}

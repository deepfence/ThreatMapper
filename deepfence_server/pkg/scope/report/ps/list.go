package ps

// List is a persistent list of possibly heterogenous values.
type List interface {
	// IsNil returns true if the list is empty
	IsNil() bool

	// Cons returns a new list with val as the head
	Cons(val interface{}) List

	// Head returns the first element of the list;
	// panics if the list is empty
	Head() interface{}

	// Tail returns a list with all elements except the head;
	// panics if the list is empty
	Tail() List

	// Size returns the list's length.  This takes O(1) time.
	Size() int

	// ForEach executes a callback for each value in the list.
	ForEach(f func(interface{}))

	// Reverse returns a list whose elements are in the opposite order as
	// the original list.
	Reverse() List
}

// Immutable (i.e. persistent) list
type list struct {
	depth int // the number of nodes after, and including, this one
	value interface{}
	tail  *list
}

// An empty list shared by all lists
var nilList = &list{}

// NewList returns a new, empty list.  The result is a singly linked
// list implementation.  All lists share an empty tail, so allocating
// empty lists is efficient in time and memory.
func NewList() List {
	return nilList
}

func (l *list) IsNil() bool {
	return l == nilList
}

func (l *list) Size() int {
	return l.depth
}

func (l *list) Cons(val interface{}) List {
	var xs list
	xs.depth = l.depth + 1
	xs.value = val
	xs.tail = l
	return &xs
}

func (l *list) Head() interface{} {
	if l.IsNil() {
		panic("Called Head() on an empty list")
	}

	return l.value
}

func (l *list) Tail() List {
	if l.IsNil() {
		panic("Called Tail() on an empty list")
	}

	return l.tail
}

// ForEach executes a callback for each value in the list
func (l *list) ForEach(f func(interface{})) {
	if l.IsNil() {
		return
	}
	f(l.Head())
	l.Tail().ForEach(f)
}

// Reverse returns a list with elements in opposite order as this list
func (l *list) Reverse() List {
	reversed := NewList()
	l.ForEach(func(v interface{}) { reversed = reversed.Cons(v) })
	return reversed
}

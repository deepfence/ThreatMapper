package controls

import (
	"testing"

	"gotest.tools/assert"
)

func TestWorkloadAlloc(t *testing.T) {
	alloc := NewWorkloadAllocator(5)
	alloc.Reserve(3)
	assert.Equal(t, alloc.MaxAllocable(), int32(2), "Reserved space not equal")
	alloc.Reserve(2)
	assert.Equal(t, alloc.MaxAllocable(), int32(0), "Reserved space not equal")
	alloc.Free()
	assert.Equal(t, alloc.MaxAllocable(), int32(1), "Reserved space not equal")
}

func TestWorkloadOvercommit(t *testing.T) {
	alloc := NewWorkloadAllocator(5)
	alloc.Reserve(6)
	assert.Equal(t, alloc.MaxAllocable(), int32(0), "Reserved space not equal")
	alloc.Free()
	assert.Equal(t, alloc.MaxAllocable(), int32(0), "Reserved space not equal")
	alloc.Free()
	assert.Equal(t, alloc.MaxAllocable(), int32(1), "Reserved space not equal")
}

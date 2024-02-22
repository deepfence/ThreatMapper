package controls

import (
	"errors"
	"sync"
)

var ErrNotEnoughRoom = errors.New("not enough room")
var ErrCtxAllocatorNotFound = errors.New("error allocator context key not found")

const ContextAllocatorKey = "scan-workload-allocator"

type WorkloadAllocator struct {
	currentWorkload int32
	maxWorkload     int32
	access          sync.Mutex
}

func (wa *WorkloadAllocator) Reserve(delta int32) {
	wa.access.Lock()
	defer wa.access.Unlock()
	wa.currentWorkload += delta
}

func (wa *WorkloadAllocator) Free() {
	wa.access.Lock()
	defer wa.access.Unlock()
	wa.currentWorkload -= 1
}

func (wa *WorkloadAllocator) MaxAllocable() int32 {
	wa.access.Lock()
	defer wa.access.Unlock()
	delta := wa.maxWorkload - wa.currentWorkload
	if delta < 0 {
		return 0
	}
	return delta
}

func NewWorkloadAllocator(maxWorkload int32) *WorkloadAllocator {
	return &WorkloadAllocator{
		currentWorkload: 0,
		maxWorkload:     maxWorkload,
		access:          sync.Mutex{},
	}
}

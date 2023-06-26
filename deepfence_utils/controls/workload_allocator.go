package controls

import (
	"errors"
	"sync"
)

var (
	NotEnoughRoomError = errors.New("Not enough room")
)

type WorkloadAllocator struct {
	currentWorkload int32
	maxWorkload     int32
	access          sync.Mutex
}

func (wa *WorkloadAllocator) Reserve(delta int32) error {
	wa.access.Lock()
	defer wa.access.Unlock()
	if wa.currentWorkload+delta <= wa.maxWorkload {
		wa.currentWorkload += delta
		return nil
	}

	return NotEnoughRoomError
}

func (wa *WorkloadAllocator) Free() {
	wa.access.Lock()
	defer wa.access.Unlock()
	wa.currentWorkload -= 1
}

func (wa *WorkloadAllocator) MaxAllocable() int32 {
	wa.access.Lock()
	defer wa.access.Unlock()
	return wa.maxWorkload - wa.currentWorkload
}

func NewWorkloadAllocator(maxWorkload int32) *WorkloadAllocator {
	return &WorkloadAllocator{
		currentWorkload: 0,
		maxWorkload:     maxWorkload,
		access:          sync.Mutex{},
	}
}

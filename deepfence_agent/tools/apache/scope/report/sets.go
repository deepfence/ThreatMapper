package report

import (
	"reflect"

	"github.com/weaveworks/scope/ps"
)

// Sets is a string->set-of-strings map.
// It is immutable.
type Sets struct {
	PsMap *ps.Tree `json:"ps_map,omitempty"`
}

// MakeSets returns EmptySets
func MakeSets() Sets {
	return Sets{ps.NewMap()}
}

// Keys returns the keys for this set
func (s Sets) Keys() []string {
	if s.PsMap == nil {
		return nil
	}
	return s.PsMap.Keys()
}

// Add the given value to the Sets.
func (s Sets) Add(key string, value StringSet) Sets {
	if s.PsMap == nil {
		s = MakeSets()
	}
	if existingValue, ok := s.PsMap.Lookup(key); ok {
		var unchanged bool
		value, unchanged = existingValue.(StringSet).Merge(value)
		if unchanged {
			return s
		}
	}
	return Sets{
		PsMap: s.PsMap.Set(key, value),
	}
}

// AddString adds a single string under a key, creating a new StringSet if necessary.
func (s Sets) AddString(key string, str string) Sets {
	if s.PsMap == nil {
		s = MakeSets()
	}
	value, found := s.Lookup(key)
	if found && value.Contains(str) {
		return s
	}
	value = value.Add(str)
	return Sets{
		PsMap: s.PsMap.Set(key, value),
	}
}

// Delete the given set from the Sets.
func (s Sets) Delete(key string) Sets {
	if s.PsMap == nil {
		return MakeSets()
	}
	PsMap := s.PsMap.Delete(key)
	if PsMap.IsNil() {
		return MakeSets()
	}
	return Sets{PsMap: PsMap}
}

// Lookup returns the sets stored under key.
func (s Sets) Lookup(key string) (StringSet, bool) {
	if s.PsMap == nil {
		return MakeStringSet(), false
	}
	if value, ok := s.PsMap.Lookup(key); ok {
		return value.(StringSet), true
	}
	return MakeStringSet(), false
}

// Size returns the number of elements
func (s Sets) Size() int {
	if s.PsMap == nil {
		return 0
	}
	return s.PsMap.Size()
}

// Merge merges two sets maps into a fresh set, performing set-union merges as
// appropriate.
func (s Sets) Merge(other Sets) Sets {
	var (
		sSize     = s.Size()
		otherSize = other.Size()
		result    = s.PsMap
		iter      = other.PsMap
	)
	switch {
	case sSize == 0:
		return other
	case otherSize == 0:
		return s
	case sSize < otherSize:
		result, iter = iter, result
	}

	iter.ForEach(func(key string, value interface{}) {
		set := value.(StringSet)
		if existingSet, ok := result.Lookup(key); ok {
			var unchanged bool
			set, unchanged = existingSet.(StringSet).Merge(set)
			if unchanged {
				return
			}
		}
		result = result.Set(key, set)
	})

	return Sets{result}
}

func (s Sets) String() string {
	return mapToString(s.PsMap)
}

// DeepEqual tests equality with other Sets
func (s Sets) DeepEqual(t Sets) bool {
	return mapEqual(s.PsMap, t.PsMap, reflect.DeepEqual)
}

//func (s *Sets) CodecEncodeSelf(encoder *codec.Encoder) {
//	mapWrite(s.PsMap, encoder, func(encoder *codec.Encoder, val interface{}) {
//		encoder.Encode(val.(StringSet))
//	})
//}
//
//func (s *Sets) CodecDecodeSelf(decoder *codec.Decoder) {
//	decoder.Decode(s)
//	out := mapRead(decoder, func(isNil bool) interface{} {
//		var value StringSet
//		if !isNil {
//			decoder.Decode(&value)
//		}
//		return value
//	})
//	*s = Sets{out}
//}

// MarshalJSON shouldn't be used, use CodecEncodeSelf instead
//func (Sets) MarshalJSON() ([]byte, error) {
//	panic("MarshalJSON shouldn't be used, use CodecEncodeSelf instead")
//}
//
//// UnmarshalJSON shouldn't be used, use CodecDecodeSelf instead
//func (*Sets) UnmarshalJSON(b []byte) error {
//	panic("UnmarshalJSON shouldn't be used, use CodecDecodeSelf instead")
//}

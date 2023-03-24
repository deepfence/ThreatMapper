package report

import (
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report/ps"
)

// Sets is a string->set-of-strings map.
// It is immutable.
type Sets struct {
	PsMap *ps.Tree `json:"ps_map"`
}

// Keys returns the keys for this set
func (s Sets) Keys() []string {
	if s.PsMap == nil {
		return nil
	}
	return s.PsMap.Keys()
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

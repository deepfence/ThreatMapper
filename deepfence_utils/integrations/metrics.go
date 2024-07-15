package integrations

import (
	"database/sql/driver"
	"encoding/json"
)

type Metrics struct {
	Ok        int64 `json:"ok,omitempty"`
	Error     int64 `json:"error,omitempty"`
	IsSummary bool  `json:"is_summary,omitempty"`
}

func (m *Metrics) Update(n Metrics) *Metrics {
	if n.Ok > 0 {
		m.Ok += n.Ok
	}
	if n.Error > 0 {
		m.Error += n.Error
	}
	m.IsSummary = n.IsSummary
	return m
}

func (m *Metrics) Scan(src interface{}) error {
	var data []byte

	if b, ok := src.([]byte); ok {
		data = b
	} else if s, ok := src.(string); ok {
		data = []byte(s)
	} else if src == nil {
		return nil
	}

	return json.Unmarshal(data, m)
}

func (m Metrics) Value() (driver.Value, error) {
	return json.Marshal(m)
}

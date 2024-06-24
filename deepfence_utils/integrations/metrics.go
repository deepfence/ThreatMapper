package integrations

import "encoding/json"

type Metrics struct {
	Ok    int64
	Error int64
}

func (m *Metrics) Update(ok, error int64) {
	if ok >= 0 {
		m.Ok += ok
	}
	if error >= 0 {
		m.Error += error
	}
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

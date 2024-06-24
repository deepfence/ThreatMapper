package integrations

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

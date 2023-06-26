package report

type RawReport struct {
	Payload string `json:"payload" required:"true"`
}

func (o *RawReport) GetPayload() string {
	if o == nil {
		return ""
	}
	return o.Payload
}

package model

type RawReport struct {
	Payload string `json:"payload" required:"true"`
}

type AgentId struct {
	NodeId string `json:"node_id" required:"true"`
}

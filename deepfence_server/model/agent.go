package model

type AgentId struct {
	NodeId string `json:"node_id" required:"true"`
}

type AgentUpgrade struct {
	Version string `json:"version" required:"true"`
	NodeId  string `json:"node_id" required:"true"`
}

package model

type InitAgentReq struct {
	AgentId
	Version  string `json:"version" required:"true"`
	NodeType string `json:"node_type" required:"true"`
}

type AgentId struct {
	NodeId            string `json:"node_id" required:"true"`
	AvailableWorkload int    `json:"available_workload" required:"true"`
}

type AgentUpgrade struct {
	Version string `json:"version" required:"true"`
	NodeId  string `json:"node_id" required:"true"`
}

type AgentPluginEnable struct {
	PluginName string `json:"plugin_name" required:"true"`
	Version    string `json:"version" required:"true"`
	NodeId     string `json:"node_id" required:"true"`
}

type AgentPluginDisable struct {
	PluginName string `json:"plugin_name" required:"true"`
	NodeId     string `json:"node_id" required:"true"`
}

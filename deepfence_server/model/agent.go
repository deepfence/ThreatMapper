package model

import "mime/multipart"

type InitAgentReq struct {
	AgentID
	Version string `json:"version" required:"true"`
}

type AgentID struct {
	NodeID            string `json:"node_id" required:"true"`
	AvailableWorkload int    `json:"available_workload" required:"true"`
}

type AgentUpgrade struct {
	Version string   `json:"version" required:"true"`
	NodeIDs []string `json:"node_ids" required:"true"`
}

type AgentPluginEnable struct {
	PluginName string `json:"plugin_name" required:"true"`
	Version    string `json:"version" required:"true"`
	NodeID     string `json:"node_id" required:"true"`
}

type AgentPluginDisable struct {
	PluginName string `json:"plugin_name" required:"true"`
	NodeID     string `json:"node_id" required:"true"`
}

type ListAgentVersionResp struct {
	Versions []string `json:"versions" required:"true"`
}

type BinUploadRequest struct {
	Tarball multipart.File `formData:"tarball" json:"tarball" validate:"required" required:"true"`
}

package model

type AgentId struct {
	NodeId string `json:"node_id" required:"true"`
}

type AgentImageMetadata struct {
	Version   string `json:"version" required:"true"`
	ImageName string `json:"image_name" required:"true"`
	ImageTag  string `json:"image_tag" required:"true"`
}

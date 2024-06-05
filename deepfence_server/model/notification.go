package model

type NotificationGetScanResponse struct {
	VulnerabilityScan []Scan `json:"vulnerability_scan"`
	SecretScan        []Scan `json:"secret_scan"`
	MalwareScan       []Scan `json:"malware_scan"`
	PostureScan       []Scan `json:"posture_scan"`
}

type Scan struct {
	CreatedAt     int64  `json:"created_at"`
	UpdatedAt     int64  `json:"updated_at"`
	NodeID        string `json:"node_id"`
	IsPriority    bool   `json:"is_priority"`
	Status        string `json:"status"`
	StatusMessage string `json:"status_message"`
	TriggerAction string `json:"trigger_action"`
	Retries       int64  `json:"retries"`
}

// TODO: later
type TriggerAction struct {
	ID             int    `json:"id"`
	RequestPayload string `json:"request_payload"`
}
type RequestPayload struct {
	NodeID   string `json:"node_id"`
	NodeType int    `json:"node_type"`
	BinArgs  struct {
		NodeID     string `json:"node_id"`
		NodeType   string `json:"node_type"`
		RegistryID string `json:"registry_id"`
		ScanID     string `json:"scan_id"`
		ScanType   string `json:"scan_type"`
	} `json:"bin_args"`
}

type NotificationGetScanRequest struct {
	ScanTypes []string `json:"scan_types"`
	Statuses  []string `json:"status"`
	Page      int      `json:"page"`
	Limit     int      `json:"limit"`
}

type NotificationMarkScanReadRequest struct {
	ScanType string   `json:"scan_type"`
	NodeIDs  []string `json:"node_ids"`
}

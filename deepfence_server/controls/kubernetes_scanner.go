package controls

type KubernetesScannerControlRequest struct {
	NodeID string `query:"node_id" validate:"required,uuid4" required:"true"`
}

type KubernetesScannerControlResponse struct {
	Data KubernetesScannerPendingScans `json:"data"`
}

type KubernetesScannerPendingScanMap map[string]KubernetesScannerPendingScan

type KubernetesScannerPendingScans struct {
	Scans   KubernetesScannerPendingScanMap `json:"scans"`
	Refresh string                          `json:"refresh"`
}

type KubernetesScannerPendingScan struct {
	ScanId    string   `json:"scan_id"`
	AccountId string   `json:"account_id"`
	ScanType  string   `json:"scan_type"`
	Controls  []string `json:"controls"`
}

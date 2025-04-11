package ingesters

type SecretScanStatus struct {
	ScanID      string `json:"scan_id"`
	ScanStatus  string `json:"scan_status"`
	ScanMessage string `json:"scan_message"`
}

type Secret struct {
	Match struct {
		StartingIndex         int    `json:"starting_index"`
		RelativeStartingIndex int    `json:"relative_starting_index"`
		RelativeEndingIndex   int    `json:"relative_ending_index"`
		FullFilename          string `json:"full_filename"`
		MatchedContent        string `json:"matched_content"`
	} `json:"match"`
	Rule struct {
		ID               int    `json:"id"`
		Name             string `json:"name"`
		Part             string `json:"part"`
		SignatureToMatch string `json:"signature_to_match"`
	} `json:"rule"`
	Severity struct {
		Level string  `json:"level"`
		Score float64 `json:"score"`
	} `json:"severity"`
	ScanID string `json:"scan_id"`
}

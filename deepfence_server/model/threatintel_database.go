package model

import "time"

type DatabaseInfoResponse struct {
	VulnerabilityDBUpdatedAt time.Time `json:"vulnerability_db_updated_at"`
	SecretsRulesUpdatedAt    time.Time `json:"secrets_rules_updated_at"`
	MalwareRulesUpdatedAt    time.Time `json:"malware_rules_updated_at"`
	PostureControlsUpdatedAt time.Time `json:"posture_controls_updated_at"`
}

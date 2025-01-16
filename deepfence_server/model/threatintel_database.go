package model

import "time"

type DatabaseInfoResponse struct {
	LatestVulnerabilityDBUpdatedAt time.Time `json:"latest_vulnerability_db_updated_at"`
}

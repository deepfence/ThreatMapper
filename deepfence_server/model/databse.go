package model

import (
	"encoding/json"
	"mime/multipart"
	"time"
)

type DBUploadRequest struct {
	Database multipart.File `formData:"database" json:"database" validate:"required,nospace" required:"true"`
}

type VulnerabilityDBListing struct {
	Available map[string][]Database `json:"available"`
}

type Database struct {
	Built    time.Time `json:"built"`
	Version  int       `json:"version"`
	URL      string    `json:"url"`
	Checksum string    `json:"checksum"`
}

func NewVulnerabilityDBListing() *VulnerabilityDBListing {
	return &VulnerabilityDBListing{
		Available: map[string][]Database{
			"3": make([]Database, 0),
			"5": make([]Database, 0),
		},
	}
}

func LoadListing(d []byte) (*VulnerabilityDBListing, error) {
	var v VulnerabilityDBListing
	if err := json.Unmarshal(d, &v); err != nil {
		return nil, err
	}
	return &v, nil
}

func (v *VulnerabilityDBListing) Bytes() ([]byte, error) {
	return json.Marshal(v)
}

func (v *VulnerabilityDBListing) Append(db Database) {
	v.Available["5"] = append(v.Available["5"], db)
}

package model

import (
	"encoding/json"
	"mime/multipart"
	"path"
	"sort"
	"time"
)

const (
	Version3 = "3"
	Version5 = "5"
)

var (
	ListingJson                = "listing.json"
	VulnerabilityDbStore       = "vulnerability"
	ListingPath                = path.Join(VulnerabilityDbStore, ListingJson)
	DEEPFENCE_THREAT_INTEL_URL = "https://threat-intel.deepfence.io/vulnerability-db/listing.json"
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
			Version3: make([]Database, 0),
			Version5: make([]Database, 0),
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

func (v *VulnerabilityDBListing) Append(db Database, version string) {
	v.Available[version] = append(v.Available[version], db)
}

func (v *VulnerabilityDBListing) Sort(version string) {
	v5db := v.Available[version]

	sort.Slice(v5db[:], func(i, j int) bool {
		return v5db[i].Built.Before(v5db[j].Built)
	})

	v.Available[version] = v5db
}

func (v *VulnerabilityDBListing) Latest(version string) *Database {
	v.Sort(version)
	dbs, ok := v.Available[version]
	if !ok {
		return nil

	}
	return &dbs[len(dbs)-1]
}

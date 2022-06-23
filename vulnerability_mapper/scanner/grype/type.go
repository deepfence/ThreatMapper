package grype

type Cvss struct {
	Version        string      `json:"version"`
	Vector         string      `json:"vector"`
	Metrics        CvssMetrics `json:"metrics"`
	VendorMetadata interface{} `json:"vendorMetadata"`
}

type CvssMetrics struct {
	BaseScore           float64  `json:"baseScore"`
	ExploitabilityScore *float64 `json:"exploitabilityScore,omitempty"`
	ImpactScore         *float64 `json:"impactScore,omitempty"`
}

// Document represents the JSON document to be presented
type Document struct {
	Matches        []Match        `json:"matches"`
	IgnoredMatches []IgnoredMatch `json:"ignoredMatches,omitempty"`
	Source         *source        `json:"source"`
	Distro         distribution   `json:"distro"`
	Descriptor     descriptor     `json:"descriptor"`
}

// Match is a single item for the JSON array reported
type Match struct {
	Vulnerability          Vulnerability           `json:"vulnerability"`
	RelatedVulnerabilities []VulnerabilityMetadata `json:"relatedVulnerabilities"`
	MatchDetails           []MatchDetails          `json:"matchDetails"`
	Artifact               Package                 `json:"artifact"`
}

type Vulnerability struct {
	VulnerabilityMetadata
	Fix        Fix        `json:"fix"`
	Advisories []Advisory `json:"advisories"`
}

type VulnerabilityMetadata struct {
	ID          string   `json:"id"`
	DataSource  string   `json:"dataSource"`
	Namespace   string   `json:"namespace,omitempty"`
	Severity    string   `json:"severity,omitempty"`
	URLs        []string `json:"urls"`
	Description string   `json:"description,omitempty"`
	Cvss        []Cvss   `json:"cvss"`
}

type MetadataType string
type Type string
type Language string

type Package struct {
	Name         string            `json:"name"`
	Version      string            `json:"version"`
	Type         Type              `json:"type"`
	Locations    []Coordinates     `json:"locations"`
	Language     Language          `json:"language"`
	Licenses     []string          `json:"licenses"`
	CPEs         []string          `json:"cpes"`
	PURL         string            `json:"purl"`
	Upstreams    []UpstreamPackage `json:"upstreams"`
	MetadataType MetadataType      `json:"metadataType,omitempty"`
	Metadata     interface{}       `json:"metadata,omitempty"`
}

type Coordinates struct {
	RealPath     string `json:"path" cyclonedx:"path"`                 // The path where all path ancestors have no hardlinks / symlinks
	FileSystemID string `json:"layerID,omitempty" cyclonedx:"layerID"` // An ID representing the filesystem. For container images, this is a layer digest. For directories or a root filesystem, this is blank.
}

type UpstreamPackage struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

type Fix struct {
	Versions []string `json:"versions"`
	State    string   `json:"state"`
}

type Advisory struct {
	ID   string `json:"id"`
	Link string `json:"link"`
}

// MatchDetails contains all data that indicates how the result match was found
type MatchDetails struct {
	Type       string      `json:"type"`
	Matcher    string      `json:"matcher"`
	SearchedBy interface{} `json:"searchedBy"`
	Found      interface{} `json:"found"`
}

type IgnoredMatch struct {
	Match
	AppliedIgnoreRules []IgnoreRule `json:"appliedIgnoreRules"`
}

type IgnoreRule struct {
	Vulnerability string             `json:"vulnerability,omitempty"`
	FixState      string             `json:"fix-state,omitempty"`
	Package       *IgnoreRulePackage `json:"package,omitempty"`
}

type IgnoreRulePackage struct {
	Name     string `json:"name,omitempty"`
	Version  string `json:"version,omitempty"`
	Type     string `json:"type,omitempty"`
	Location string `json:"location,omitempty"`
}

type source struct {
	Type   string      `json:"type"`
	Target interface{} `json:"target"`
}

type distribution struct {
	Name    string   `json:"name"`    // Name of the Linux distribution
	Version string   `json:"version"` // Version of the Linux distribution (major or major.minor version)
	IDLike  []string `json:"idLike"`  // the ID_LIKE field found within the /etc/os-release file
}

type descriptor struct {
	Name                  string      `json:"name"`
	Version               string      `json:"version"`
	Configuration         interface{} `json:"configuration,omitempty"`
	VulnerabilityDBStatus interface{} `json:"db,omitempty"`
}

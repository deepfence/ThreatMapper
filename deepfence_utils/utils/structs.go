package utils

import (
	"encoding/json"
	"encoding/xml"
	"time"
)

type MinioError struct {
	XMLName    xml.Name `xml:"Error"`
	Text       string   `xml:",chardata"`
	Code       string   `xml:"Code"`
	Message    string   `xml:"Message"`
	Key        string   `xml:"Key"`
	BucketName string   `xml:"BucketName"`
	Resource   string   `xml:"Resource"`
	RequestID  string   `xml:"RequestID"`
	HostID     string   `xml:"HostID"`
}

type ScanSbomRequest struct {
	SbomParameters
	SbomBody
}

type SbomParameters struct {
	ImageName             string `json:"image_name"`
	ImageID               string `json:"image_id"`
	ScanID                string `json:"scan_id" required:"true"`
	KubernetesClusterName string `json:"kubernetes_cluster_name"`
	HostName              string `json:"host_name"`
	NodeID                string `json:"node_id"`
	NodeType              string `json:"node_type"`
	ScanType              string `json:"scan_type"`
	ContainerName         string `json:"container_name"`
	SBOMFilePath          string `json:"sbom_file_path"`
	Mode                  string `json:"mode,omitempty"`
	RegistryID            string `json:"registry_id,omitempty"`
	SkipScan              bool   `json:"skip_scan,omitempty"`
}

type SbomBody struct {
	SBOM string `json:"sbom" required:"true"`
}

type AutoFetchGenerativeAIIntegrationsParameters struct {
	CloudProvider string `json:"cloud_provider"`
	UserID        int64  `json:"user_id"`
}

type SecretScanParameters struct {
	ImageName             string `json:"image_name"`
	ImageID               string `json:"image_id"`
	ScanID                string `json:"scan_id" required:"true"`
	KubernetesClusterName string `json:"kubernetes_cluster_name"`
	HostName              string `json:"host_name"`
	NodeID                string `json:"node_id"`
	NodeType              string `json:"node_type"`
	ScanType              string `json:"scan_type"`
	ContainerName         string `json:"container_name"`
	Mode                  string `json:"mode,omitempty"`
	RegistryID            string `json:"registry_id,omitempty"`
}

type MalwareScanParameters struct {
	ImageName             string `json:"image_name"`
	ImageID               string `json:"image_id"`
	ScanID                string `json:"scan_id" required:"true"`
	KubernetesClusterName string `json:"kubernetes_cluster_name"`
	HostName              string `json:"host_name"`
	NodeID                string `json:"node_id"`
	NodeType              string `json:"node_type"`
	ScanType              string `json:"scan_type"`
	ContainerName         string `json:"container_name"`
	Mode                  string `json:"mode,omitempty"`
	RegistryID            string `json:"registry_id,omitempty"`
}

type ReportParams struct {
	ReportID      string        `json:"report_id"`
	ReportType    string        `json:"report_type"`
	FromTimestamp time.Time     `json:"from_timestamp"`
	ToTimestamp   time.Time     `json:"to_timestamp"`
	Filters       ReportFilters `json:"filters"`
	Options       ReportOptions `json:"options,omitempty"`
	ZippedReport  bool          `json:"zipped_report"`
}

type ReportOptions struct {
	// SBOMFormat Applicable if ReportType is sbom
	SBOMFormat string `json:"sbom_format" validate:"omitempty,oneof=syft-json cyclonedx-json@1.5 spdx-json@2.2 spdx-json@2.3" enum:"syft-json,cyclonedx-json@1.5,spdx-json@2.2,spdx-json@2.3"`
}

type ReportFilters struct {
	ScanID                string                `json:"scan_id"`
	ScanType              string                `json:"scan_type" validate:"required" required:"true" enum:"vulnerability,secret,malware,compliance,cloud_compliance"`
	NodeType              []string              `json:"node_type" validate:"required,gt=0,dive,min=1" required:"true" enum:"host,container,container_image,linux,cluster,aws,gcp,azure"`
	SeverityOrCheckType   []string              `json:"severity_or_check_type" enum:"critical,high,medium,low,cis,gdpr,nist,hipaa,pci,soc_2,aws_foundational_security"`
	IncludeDeadNode       bool                  `json:"include_dead_nodes"`
	MostExploitableReport bool                  `json:"most_exploitable_report"`
	AdvancedReportFilters AdvancedReportFilters `json:"advanced_report_filters,omitempty"`
}

type RegistrySyncParams struct {
	PgID int32 `json:"pg_id"`
}

type AdvancedReportFilters struct {
	Masked                []bool   `json:"masked,omitempty"`
	ScanStatus            []string `json:"scan_status,omitempty"`
	PodName               []string `json:"pod_name,omitempty"`
	ContainerName         []string `json:"container_name,omitempty"`
	ImageName             []string `json:"image_name,omitempty"`
	HostName              []string `json:"host_name,omitempty"`
	AccountID             []string `json:"node_id,omitempty"`
	KubernetesClusterName []string `json:"kubernetes_cluster_name,omitempty"`
}

func (r ReportFilters) String() string {
	if b, err := json.Marshal(r); err != nil {
		return ""
	} else {
		return string(b)
	}
}

func (ar AdvancedReportFilters) String() string {
	if b, err := json.Marshal(ar); err != nil {
		return ""
	} else {
		return string(b)
	}
}

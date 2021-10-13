package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

type dfVulnStruct struct {
	Type                       string  `json:"type"`
	Masked                     string  `json:"masked"`
	Host                       string  `json:"host"`
	NodeType                   string  `json:"node_type"`
	HostName                   string  `json:"host_name"`
	KubernetesClusterName      string  `json:"kubernetes_cluster_name"`
	Scan_id                    string  `json:"scan_id"`
	Cve_id                     string  `json:"cve_id"`
	Cve_type                   string  `json:"cve_type"`
	Cve_container_image        string  `json:"cve_container_image"`
	Cve_container_image_id     string  `json:"cve_container_image_id"`
	Cve_container_name         string  `json:"cve_container_name"`
	Cve_severity               string  `json:"cve_severity"`
	Cve_caused_by_package      string  `json:"cve_caused_by_package"`
	Cve_caused_by_package_path string  `json:"cve_caused_by_package_path"`
	Cve_container_layer        string  `json:"cve_container_layer"`
	Cve_fixed_in               string  `json:"cve_fixed_in"`
	Cve_link                   string  `json:"cve_link"`
	Cve_description            string  `json:"cve_description"`
	Cve_cvss_score             float64 `json:"cve_cvss_score"`
	Cve_overall_score          float64 `json:"cve_overall_score"`
	Cve_attack_vector          string  `json:"cve_attack_vector"`
}

// Pass a dfVulnStruct and this prints in JSON format. Null values are taken care of
func formatCveJson(data dfVulnStruct) (string, error) {
	if data.Cve_id == "" {
		data.Cve_id = "Security_Advisory"
	}
	if data.Cve_type == "" {
		data.Cve_type = "base"
	}
	if data.Cve_severity == "" {
		data.Cve_severity = "Unknown"
	}
	if data.Cve_caused_by_package == "" {
		data.Cve_caused_by_package = "Unknown"
	}
	if data.Cve_container_layer == "" {
		data.Cve_container_layer = layer_found
		if layer_found == "" {
			//host scan
			data.Cve_container_layer = strings.Split(tmp_path, "/")[2]
		}
	}
	if data.Cve_fixed_in == "" {
		data.Cve_fixed_in = "Unknown"
	}
	if data.Cve_link == "" {
		data.Cve_link = "Unknown"
	}
	if data.Cve_description == "" {
		data.Cve_description = "Please refer the URL provided"
	}
	if data.Cve_attack_vector == "" {
		data.Cve_attack_vector = "Unknown"
	}
	data.Cve_severity = strings.ToLower(data.Cve_severity)

	dfVulnerabilities := dfVulnStruct{
		Type:                       "cve",
		Masked:                     data.Masked,
		Host:                       hostName,
		HostName:                   hostName,
		KubernetesClusterName:      kubernetesClusterName,
		NodeType:                   node_type,
		Scan_id:                    scanId,
		Cve_id:                     data.Cve_id,
		Cve_type:                   data.Cve_type,
		Cve_container_image:        data.Cve_container_image,
		Cve_container_image_id:     data.Cve_container_image_id,
		Cve_container_name:         data.Cve_container_name,
		Cve_severity:               data.Cve_severity,
		Cve_caused_by_package:      data.Cve_caused_by_package,
		Cve_caused_by_package_path: data.Cve_caused_by_package_path,
		Cve_container_layer:        data.Cve_container_layer,
		Cve_fixed_in:               data.Cve_fixed_in,
		Cve_link:                   data.Cve_link,
		Cve_description:            strings.Replace(data.Cve_description, "\"", "'", -1),
		Cve_cvss_score:             data.Cve_cvss_score,
		Cve_overall_score:          data.Cve_overall_score,
		Cve_attack_vector:          data.Cve_attack_vector,
	}
	dfVulnerabilitiesStr, err := json.Marshal(dfVulnerabilities)
	if err != nil {
		fmt.Println("Could not write json vulnerability output")
		return "", err
	}
	return string(dfVulnerabilitiesStr), nil
}

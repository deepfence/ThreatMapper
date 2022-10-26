package types

import "encoding/json"

type ComplianceDoc struct {
	DocId                 string `json:"doc_id"`
	Type                  string `json:"type"`
	TimeStamp             int64  `json:"time_stamp"`
	Timestamp             string `json:"@timestamp"`
	Masked                string `json:"masked"`
	NodeId                string `json:"node_id"`
	NodeType              string `json:"node_type"`
	KubernetesClusterName string `json:"kubernetes_cluster_name"`
	KubernetesClusterId   string `json:"kubernetes_cluster_id"`
	NodeName              string `json:"node_name"`
	TestCategory          string `json:"test_category"`
	TestNumber            string `json:"test_number"`
	TestInfo              string `json:"description"`
	RemediationScript     string `json:"remediation_script,omitempty"`
	RemediationAnsible    string `json:"remediation_ansible,omitempty"`
	RemediationPuppet     string `json:"remediation_puppet,omitempty"`
	Resource              string `json:"resource"`
	TestRationale         string `json:"test_rationale"`
	TestSeverity          string `json:"test_severity"`
	TestDesc              string `json:"test_desc"`
	Status                string `json:"status"`
	ComplianceCheckType   string `json:"compliance_check_type"`
	ScanId                string `json:"scan_id"`
	ComplianceNodeType    string `json:"compliance_node_type"`
}

type CloudComplianceDoc struct {
	DocId               string `json:"doc_id"`
	Timestamp           string `json:"@timestamp"`
	Count               int    `json:"count,omitempty"`
	Reason              string `json:"reason"`
	Resource            string `json:"resource"`
	Status              string `json:"status"`
	Region              string `json:"region"`
	AccountID           string `json:"account_id"`
	Group               string `json:"group"`
	Service             string `json:"service"`
	Title               string `json:"title"`
	ComplianceCheckType string `json:"compliance_check_type"`
	CloudProvider       string `json:"cloud_provider"`
	NodeName            string `json:"node_name"`
	NodeID              string `json:"node_id"`
	ScanID              string `json:"scan_id"`
	Masked              string `json:"masked"`
	Type                string `json:"type"`
	ControlID           string `json:"control_id"`
	Description         string `json:"description"`
	Severity            string `json:"severity"`
}

type Secret struct {
	DocId               string `json:"doc_id"`
	Timestamp           string `json:"@timestamp"`
	Count               int    `json:"count,omitempty"`
	Reason              string `json:"reason"`
	Resource            string `json:"resource"`
	Status              string `json:"status"`
	Region              string `json:"region"`
	AccountID           string `json:"account_id"`
	Group               string `json:"group"`
	Service             string `json:"service"`
	Title               string `json:"title"`
	ComplianceCheckType string `json:"compliance_check_type"`
	CloudProvider       string `json:"cloud_provider"`
	NodeName            string `json:"node_name"`
	NodeID              string `json:"node_id"`
	ScanID              string `json:"scan_id"`
	Masked              string `json:"masked"`
	Type                string `json:"type"`
	ControlID           string `json:"control_id"`
	Description         string `json:"description"`
	Severity            string `json:"severity"`
}

type DfCveStruct struct {
	Count                      int      `json:"count"`
	Timestamp                  string   `json:"@timestamp"`
	CveTuple                   string   `json:"cve_id_cve_severity_cve_container_image"`
	DocId                      string   `json:"doc_id"`
	Masked                     string   `json:"masked"`
	Type                       string   `json:"type"`
	Host                       string   `json:"host"`
	HostName                   string   `json:"host_name"`
	KubernetesClusterName      string   `json:"kubernetes_cluster_name"`
	NodeType                   string   `json:"node_type"`
	Scan_id                    string   `json:"scan_id"`
	Cve_id                     string   `json:"cve_id"`
	Cve_type                   string   `json:"cve_type"`
	Cve_container_image        string   `json:"cve_container_image"`
	Cve_container_image_id     string   `json:"cve_container_image_id"`
	Cve_container_name         string   `json:"cve_container_name"`
	Cve_severity               string   `json:"cve_severity"`
	Cve_caused_by_package      string   `json:"cve_caused_by_package"`
	Cve_caused_by_package_path string   `json:"cve_caused_by_package_path"`
	Cve_container_layer        string   `json:"cve_container_layer"`
	Cve_fixed_in               string   `json:"cve_fixed_in"`
	Cve_link                   string   `json:"cve_link"`
	Cve_description            string   `json:"cve_description"`
	Cve_cvss_score             float64  `json:"cve_cvss_score"`
	Cve_overall_score          float64  `json:"cve_overall_score"`
	Cve_attack_vector          string   `json:"cve_attack_vector"`
	URLs                       []string `json:"urls"`
	ExploitPOC                 string   `json:"exploit_poc"`
}

type CloudResource struct {
	AccountID             string `json:"account_id"`
	Arn                   string `json:"arn"`
	BlockPublicAcls       bool   `json:"block_public_acls,omitempty"`
	BlockPublicPolicy     bool   `json:"block_public_policy,omitempty"`
	BucketPolicyIsPublic  bool   `json:"bucket_policy_is_public,omitempty"`
	RestrictPublicBuckets bool   `json:"restrict_public_buckets,omitempty"`
	ID                    string `json:"id"`
	IgnorePublicAcls      bool   `json:"ignore_public_acls,omitempty"`
	Name                  string `json:"name"`
	//Policy                interface{} `json:"policy"`
	Region         string `json:"region"`
	ResourceID     string `json:"resource_id"`
	InstanceID     string `json:"instance_id"`
	SecurityGroups []struct {
		GroupName string `json:"GroupName"`
		GroupID   string `json:"GroupId"`
	} `json:"security_groups"`
	//SecurityGroups []map[string]string `json:"security_groups"`
	VpcID string `json:"vpc_id,omitempty"`
}

type SecretStruct struct {
	Rule     map[string]interface{} `json:"Rule"`
	Severity map[string]interface{} `json:"Severity"`
	Match    map[string]interface{} `json:"Match"`
}

func CompliancesToMaps(ms []ComplianceDoc) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, v.ToMap())
	}
	return res
}

func CloudCompliancesToMaps(ms []CloudComplianceDoc) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, v.ToMap())
	}
	return res
}

func CVEsToMaps(ms []DfCveStruct) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, v.ToMap())
	}
	return res
}

func ResourceToMaps(ms []CloudResource) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, v.ToMap())
	}
	return res
}

func ResourceToMapsStrip(ms []CloudResource) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, v.ToMapStrip())
	}
	return res
}

func (c *ComplianceDoc) ToMap() map[string]interface{} {
	out, err := json.Marshal(*c)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	err = json.Unmarshal(out, &bb)
	return bb
}

func (c *CloudComplianceDoc) ToMap() map[string]interface{} {
	out, err := json.Marshal(*c)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	err = json.Unmarshal(out, &bb)
	return bb
}

func (c *DfCveStruct) ToMap() map[string]interface{} {
	out, err := json.Marshal(*c)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	err = json.Unmarshal(out, &bb)
	return bb
}

func (c *CloudResource) ToMap() map[string]interface{} {
	out, err := json.Marshal(*c)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	err = json.Unmarshal(out, &bb)
	return bb
}

func (c *CloudResource) ToMapStrip() map[string]interface{} {
	out, err := json.Marshal(*c)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	err = json.Unmarshal(out, &bb)
	delete(bb, "security_groups")
	return bb
}

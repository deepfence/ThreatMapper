package ingesters

import (
	"encoding/json"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type CloudComplianceScanStatus struct {
	Timestamp             time.Time `json:"@timestamp"`
	ContainerName         string    `json:"container_name"`
	HostName              string    `json:"host_name"`
	KubernetesClusterName string    `json:"kubernetes_cluster_name"`
	Masked                string    `json:"masked"`
	NodeID                string    `json:"node_id"`
	NodeName              string    `json:"node_name"`
	NodeType              string    `json:"node_type"`
	ScanID                string    `json:"scan_id"`
	ScanStatus            string    `json:"scan_status"`
}

type CloudCompliance struct {
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

func CommitFuncCloudCompliance(ns string, data []CloudCompliance) error {
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(ns))
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run("UNWIND $batch as row MERGE (n:CloudCompliance{resource:row.resource, reason: row.reason}) MERGE (m:CloudResource{node_id:row.resource}) MERGE (n) -[:SCANNED]-> (m) SET n+= row",
		map[string]interface{}{"batch": CloudCompliancesToMaps(data)}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudCompliance) MERGE (m:CloudComplianceScan{node_id: n.scan_id, time_stamp: timestamp()}) MERGE (m) -[:DETECTED]-> (n)",
		map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}

func CommitFuncCloudComplianceScanStatus(ns string, data []CloudComplianceScanStatus) error {
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(ns))
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	// TODO: add query to commit for scan status
	log.Error().Msg("Not implemented")

	return tx.Commit()
}

func CloudCompliancesToMaps(ms []CloudCompliance) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, utils.ToMap(v))
	}
	return res
}

func (c CloudCompliance) ToMap() map[string]interface{} {
	out, err := json.Marshal(c)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	_ = json.Unmarshal(out, &bb)
	return bb
}

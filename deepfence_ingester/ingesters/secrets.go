package ingesters

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type SecretScanStatus struct {
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

type Secret struct {
	DocId               string                 `json:"doc_id"`
	Timestamp           string                 `json:"@timestamp"`
	Count               int                    `json:"count,omitempty"`
	Reason              string                 `json:"reason"`
	Resource            string                 `json:"resource"`
	Status              string                 `json:"status"`
	Region              string                 `json:"region"`
	AccountID           string                 `json:"account_id"`
	Group               string                 `json:"group"`
	Service             string                 `json:"service"`
	Title               string                 `json:"title"`
	ComplianceCheckType string                 `json:"compliance_check_type"`
	CloudProvider       string                 `json:"cloud_provider"`
	NodeName            string                 `json:"node_name"`
	HostName            string                 `json:"host_name"`
	NodeID              string                 `json:"node_id"`
	ScanID              string                 `json:"scan_id"`
	Masked              string                 `json:"masked"`
	Type                string                 `json:"type"`
	ControlID           string                 `json:"control_id"`
	Description         string                 `json:"description"`
	Rule                map[string]interface{} `json:"Rule"`
	Severity            map[string]interface{} `json:"Severity"`
	Match               map[string]interface{} `json:"Match"`
}

func CommitFuncSecrets(ns string, data []Secret) error {
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

	if _, err = tx.Run("UNWIND $batch as row MERGE (n:Secret{node_id:row.rule_id}) MERGE (m:SecretScan{node_id: row.scan_id, host_name: row.host_name, time_stamp: timestamp()}) WITH n, m, row MATCH (l:Node{node_id: row.host_name}) MERGE (m) -[:DETECTED]-> (n) MERGE (m) -[:SCANNED]-> (l) SET n+= row",
		map[string]interface{}{"batch": secretsToMaps(data)}); err != nil {
		return err
	}

	return tx.Commit()
}

func CommitFuncSecretScanStatuses(ns string, data []SecretScanStatus) error {
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(ns))
	driver, err := directory.Neo4jClient(ctx)

	if len(data) == 0 {
		return nil
	}

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

	last_status := data[len(data)-1]

	if _, err = tx.Run("MERGE (n:SecretScan{node_id: $scan_id}) SET n.status = $status",
		map[string]interface{}{"status": last_status.ScanStatus, "scan_id": last_status.ScanID}); err != nil {
		return err
	}

	return tx.Commit()
}

func secretsToMaps(data []Secret) []map[string]interface{} {
	secrets := []map[string]interface{}{}
	for _, i := range data {
		tmp := i.ToMap()
		secret := map[string]interface{}{}
		match := i.Match
		severity := i.Severity
		rule := i.Rule

		for k, v := range tmp {
			if k == "Match" || k == "Severity" || k == "Rule" {
				continue
			}
			secret[k] = v
		}

		for k, v := range rule {
			secret[k] = v
		}
		for k, v := range severity {
			secret[k] = v
		}
		for k, v := range match {
			secret[k] = v
		}
		secret["rule_id"] = fmt.Sprintf("%v:%v", rule["id"], tmp["host_name"])
		secrets = append(secrets, secret)
	}
	return secrets
}

func (c Secret) ToMap() map[string]interface{} {
	out, err := json.Marshal(c)
	if err != nil {
		log.Error().Msgf("ToMap err: %v", err)
		return nil
	}
	bb := map[string]interface{}{}
	_ = json.Unmarshal(out, &bb)
	return bb
}

package cronjobs

import (
	"sync/atomic"

	"github.com/ThreeDotsLabs/watermill/message"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

var threatGraphRunning atomic.Bool

func ComputeThreat(msg *message.Message) error {
	namespace := msg.Metadata.Get(directory.NamespaceKey)
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(namespace))
	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	if err := computeThreatExploitability(session); err != nil {
		return err
	}

	if threatGraphRunning.CompareAndSwap(false, true) {
		defer threatGraphRunning.Store(false)
		return computeThreatGraph(session)
	}

	return nil

}

func computeThreatExploitability(session neo4j.Session) error {
	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	// Following cypher queries applies to Vulnerabilities
	if _, err = tx.Run(`
		MATCH (v:Vulnerability)
		WITH v, CASE WHEN v.cve_attack_vector =~ ".*AV:N.*" THEN 2 ELSE CASE WHEN v.cve_severity = 'critical' THEN 1 ELSE 0 END END as score
		SET v.exploitability_score = score,
		v.parsed_attack_vector = CASE WHEN score = 2 THEN 'network' ELSE 'local' END,
		v.has_live_connection = false`,
		map[string]interface{}{}); err != nil {
		return err
	}

	// Following cypher request applies to Images & Containers
	if _, err = tx.Run(`
		MATCH (n:Node{node_id:"in-the-internet"}) -[:CONNECTS*]-> (m:Node)
		WITH DISTINCT m
		MATCH (m) -[:HOSTS]-> (o) <-[:SCANNED]- (s)
		WITH DISTINCT o, max(s.updated_at) as latest, s
		MATCH (s) -[:DETECTED]-> (v:Vulnerability)
		SET v.exploitability_score = CASE WHEN v.exploitability_score = 2 THEN 3 ELSE v.exploitability_score END, v.has_live_connection = true`,
		map[string]interface{}{}); err != nil {
		return err
	}

	// Following cypher request applies to Hosts
	if _, err = tx.Run(`
		MATCH (n:Node{node_id:"in-the-internet"}) -[:CONNECTS*]-> (m:Node)
		WITH DISTINCT m
		MATCH (m) <-[:SCANNED]- (s)
		WITH DISTINCT m, max(s.updated_at) as latest, s
		MATCH (s) -[:DETECTED]-> (v:Vulnerability)
		SET v.exploitability_score = CASE WHEN v.exploitability_score = 2 THEN 3 ELSE v.exploitability_score END, v.has_live_connection = true`,
		map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}

func computeThreatGraph(session neo4j.Session) error {
	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run(`
		MATCH (s:VulnerabilityScan) -[:SCANNED]-> (m)
		WITH distinct m, max(s.updated_at) as most_recent
		MATCH (m) <-[:SCANNED]- (s:VulnerabilityScan{updated_at: most_recent})-[:DETECTED]->(c:Vulnerability)
		WITH m, count(distinct c) as num_cve
		SET m.num_cve = num_cve`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (s:SecretScan) -[:SCANNED]-> (m)
		WITH distinct m, max(s.updated_at) as most_recent
		MATCH (m) <-[:SCANNED]- (s:SecretScan{updated_at: most_recent})-[:DETECTED]->(c:Secret)
		WITH m, count(distinct c) as num_secrets
		SET m.num_secrets = num_secrets`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (s:MalwareScan) -[:SCANNED]-> (m)
		WITH distinct m, max(s.updated_at) as most_recent
		MATCH (m) <-[:SCANNED]- (s:MalwareScan{updated_at: most_recent})-[:DETECTED]->(c:Malware)
		WITH m, count(distinct c) as num_malware
		SET m.num_malware = num_malware`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (s:ComplianceScan) -[:SCANNED]-> (m)
		WITH distinct m, max(s.updated_at) as most_recent
		MATCH (m) <-[:SCANNED]- (s:ComplianceScan{updated_at: most_recent})-[:DETECTED]->(c:Compliance)
		WITH m, count(distinct c) as num_compliance
		SET m.num_compliance = num_compliance`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Node)
		SET n.num_cve = COALESCE(n.num_cve, 0),
		n.num_secrets = COALESCE(n.num_secrets, 0),
		n.num_malware = COALESCE(n.num_malware, 0),
		n.num_compliance = COALESCE(n.num_compliance, 0)`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Node)
		SET n.sum_cve = COALESCE(n.num_cve, 0),
		n.sum_secrets = COALESCE(n.num_secrets, 0),
		n.sum_malware = COALESCE(n.num_malware, 0),
		n.sum_compliance = COALESCE(n.num_compliance, 0)`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Node) -[:HOSTS]-> (m)
		SET n.sum_cve = n.sum_cve + COALESCE(m.num_cve, 0),
		n.sum_secrets = n.sum_secrets + COALESCE(m.num_secrets, 0),
		n.sum_malware = n.sum_malware + COALESCE(n.num_malware, 0),
		n.sum_compliance = n.sum_compliance + COALESCE(m.num_compliance, 0)`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Node) -[:CONNECTED]->(m:Node)
		SET n.sum_cve = COALESCE(n.sum_cve, 0) + COALESCE(m.sum_cve, m.num_cve, 0),
		n.sum_secrets = COALESCE(n.sum_secrets, 0) + COALESCE(m.sum_secrets, m.num_secrets, 0),
		n.sum_malware = COALESCE(n.sum_malware, 0) + COALESCE(m.sum_malware, m.num_malware, 0),
		n.sum_compliance = COALESCE(n.sum_compliance, 0) + COALESCE(m.sum_compliance, m.num_compliance, 0)`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Node {node_id:'in-the-internet'})-[d:CONNECTS*]->(m:Node)
		WITH SIZE(d) as depth, m with min(depth) as min_depth, m
		SET m.depth = min_depth`, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Node {node_id:'in-the-internet'})-[d:PUBLIC|USES|IS|HOSTS|balances*]->(m:CloudResource)
		WITH SIZE(d) as depth, m
		WITH min(depth) as min_depth, m
		SET m.depth = min_depth `, map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Node) -[:CONNECTS]->(m:Node)
		WITH n, m
		SET n.sum_cve = COALESCE(n.sum_cve, 0) + COALESCE(m.sum_cve, m.num_cve, 0),
		n.sum_malware = COALESCE(n.sum_malware, 0) + COALESCE(m.sum_malware, m.num_malware, 0) ,
		n.sum_secrets = COALESCE(n.sum_secrets, 0) + COALESCE(m.sum_secrets, m.num_secrets, 0),
		n.sum_compliance = COALESCE(n.sum_compliance, 0) + COALESCE(m.sum_compliance, m.num_compliance, 0)`, map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}

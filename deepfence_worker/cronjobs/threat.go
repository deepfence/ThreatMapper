package cronjobs

import (
	"context"
	"sync/atomic"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

var threatGraphRunning atomic.Bool
var exploitabilityRunning atomic.Bool

func ComputeThreat(ctx context.Context, task *asynq.Task) error {

	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	if exploitabilityRunning.CompareAndSwap(false, true) {
		defer exploitabilityRunning.Store(false)
		if err := computeThreatExploitability(session); err != nil {
			return err
		}
	}

	if threatGraphRunning.CompareAndSwap(false, true) {
		defer threatGraphRunning.Store(false)
		return computeThreatGraph(session)
	}

	return nil

}

func computeThreatExploitability(session neo4j.Session) error {
	log.Info().Msgf("Compute threat Starting")
	defer log.Info().Msgf("Compute threat Done")
	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(600 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run(`
		MATCH (n:Secret)
		WHERE n.exploitability_score IS NULL
		SET n.exploitability_score = 0`,
		map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Malware)
		WHERE n.exploitability_score IS NULL
		SET n.exploitability_score = 0`,
		map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Compliance)
		WHERE n.exploitability_score IS NULL
		SET n.exploitability_score = 0`,
		map[string]interface{}{}); err != nil {
		return err
	}

	//Reset the exploitability_score to its original value
	if _, err = tx.Run(`
    MATCH (v:Vulnerability)
    WHERE v.exploitability_score <> v.init_exploitability_score
    SET v.exploitability_score = v.init_exploitability_score,
    v.has_live_connection = false`,
		map[string]interface{}{}); err != nil {
		return err
	}

	// Following cypher request applies to Images & Containers
	if _, err = tx.Run(`
		MATCH (n:Node{node_id:"in-the-internet"}) -[:CONNECTS*1..3]-> (m:Node)
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
		MATCH (n:Node{node_id:"in-the-internet"}) -[:CONNECTS*1..3]-> (m:Node)
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
	txConfig := neo4j.WithTxTimeout(600 * time.Second)

	var err error

	if _, err = session.Run(`
		MATCH (s:VulnerabilityScan) -[:SCANNED]-> (m)
		WHERE s.status = "`+utils.ScanStatusSuccess+`"
		WITH distinct m, max(s.updated_at) as most_recent
		MATCH (m) <-[:SCANNED]- (s:VulnerabilityScan{updated_at: most_recent})-[:DETECTED]->(c:Vulnerability)
		WITH  m, most_recent, count(distinct c) as vulnerabilities_count
        MATCH (m) <-[:SCANNED]- (s:VulnerabilityScan{updated_at: most_recent})-[:DETECTED]->(c:Vulnerability)
        WITH c, m, vulnerabilities_count
        MATCH (c)
        WHERE c.exploitability_score IS NOT NULL AND c.exploitability_score IN [1,2,3]
        WITH m, count(distinct c) as exploitable_vulnerabilities_count, vulnerabilities_count
        SET m.exploitable_vulnerabilities_count = exploitable_vulnerabilities_count, 
        m.vulnerabilities_count = vulnerabilities_count`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (s:SecretScan) -[:SCANNED]-> (m)
		WHERE s.status = "`+utils.ScanStatusSuccess+`"
		WITH distinct m, max(s.updated_at) as most_recent
		MATCH (m) <-[:SCANNED]- (s:SecretScan{updated_at: most_recent})-[:DETECTED]->(c:Secret)
		WITH  m, most_recent, count(distinct c) as secrets_count
        MATCH (m) <-[:SCANNED]- (s:SecretScan{updated_at: most_recent})-[:DETECTED]->(c:Secret)
		WITH c, m, secrets_count
        MATCH (c)
        WHERE c.level IN ['critical', 'high']
        WITH m, secrets_count, count(distinct c) as exploitable_secret_count
        SET m.secrets_count = secrets_count, m.exploitable_secret_count = exploitable_secret_count`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (s:MalwareScan) -[:SCANNED]-> (m)
		WHERE s.status = "`+utils.ScanStatusSuccess+`"
		WITH distinct m, max(s.updated_at) as most_recent
		MATCH (m) <-[:SCANNED]- (s:MalwareScan{updated_at: most_recent})-[:DETECTED]->(c:Malware)
        WITH m, most_recent, count(distinct c) as malwares_count
        MATCH (m) <-[:SCANNED]- (s:MalwareScan{updated_at: most_recent})-[:DETECTED]->(c:Malware)
		WITH c, m, malwares_count
        MATCH (c)                      
        WHERE c.file_severity IN ['critical', 'high']
        WITH m, malwares_count, count(distinct c) as exploitable_malware_count
        SET m.malwares_count = malwares_count, m.exploitable_malware_count = exploitable_malware_count`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (s:ComplianceScan) -[:SCANNED]-> (m)
		WHERE s.status = "`+utils.ScanStatusSuccess+`"
		WITH distinct m, max(s.updated_at) as most_recent
		MATCH (m) <-[:SCANNED]- (s:ComplianceScan{updated_at: most_recent})-[:DETECTED]->(c:Compliance)
		WITH m, most_recent, count(distinct c) as compliances_count
        MATCH (m) <-[:SCANNED]- (s:ComplianceScan{updated_at: most_recent})-[:DETECTED]->(c:Compliance)
		WITH c, m, compliances_count
		MATCH (c)
		WHERE c.status IN ['warn', 'alarm']
		WITH m, compliances_count, count(distinct c) as warn_alarm_count
		SET m.compliances_count = compliances_count, m.warn_alarm_count = warn_alarm_count
	`, map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (s:CloudComplianceScan) -[:SCANNED]-> (p:CloudNode)
		WHERE s.status = "`+utils.ScanStatusSuccess+`"
		WITH distinct p, max(s.updated_at) as most_recent
		MATCH (s:CloudComplianceScan{updated_at: most_recent})-[:DETECTED]->(c:CloudCompliance) -[:SCANNED]->(m:CloudResource)
		WITH c, m, count(distinct c) as cloud_compliances_count
		MATCH (c)
		WHERE c.status IN ['warn', 'alarm']
		WITH m, cloud_compliances_count, count(distinct c) as cloud_warn_alarm_count
		SET m.cloud_compliances_count = cloud_compliances_count, m.cloud_warn_alarm_count = cloud_warn_alarm_count
	`, map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	// Define depths
	if _, err = session.Run(`
		MATCH (n)
		WHERE n:Node OR n:CloudResource
		AND NOT n.depth IS NULL
		SET n.depth = null`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Node {node_id:'in-the-internet'})-[d:CONNECTS*1..3]->(m:Node)
		WITH SIZE(d) as depth, m with min(depth) as min_depth, m
		SET m.depth = min_depth`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Node {node_id:'in-the-internet'})-[d:PUBLIC|IS|HOSTS|SECURED*1..3]->(m:CloudResource)
		WITH SIZE(d) as depth, m
		WITH min(depth) as min_depth, m
		SET m.depth = min_depth`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	// Compute counts & sums
	if _, err = session.Run(`
		MATCH (n)
		WHERE n:Node OR n:CloudResource
		AND NOT n.depth IS NULL
		SET n.sum_cve = COALESCE(n.vulnerabilities_count, 0),
			n.sum_secrets = COALESCE(n.secrets_count, 0),
			n.sum_malware = COALESCE(n.malwares_count, 0),
			n.sum_compliance = COALESCE(n.compliances_count, 0),
			n.sum_cloud_compliance = COALESCE(n.cloud_compliances_count, 0),
			n.sum_exploitable_cve = COALESCE(n.exploitable_vulnerabilities_count, 0),
			n.sum_exploitable_secrets = COALESCE(n.exploitable_secret_count, 0),
			n.sum_exploitable_malwares = COALESCE(n.exploitable_malware_count, 0),
			n.sum_warn_alarm = COALESCE(n.warn_alarm_count, 0),
			n.sum_cloud_warn_alarm = COALESCE(n.cloud_warn_alarm_count, 0)`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	if _, err = session.Run(`
		MATCH (n:Node) -[:CONNECTS]->(m:Node)
		WHERE n.depth = m.depth - 1
		WITH n, m
		SET n.sum_cve = COALESCE(n.sum_cve, 0) + COALESCE(m.sum_cve, m.vulnerabilities_count, 0),
			n.sum_malware = COALESCE(n.sum_malware, 0) + COALESCE(m.sum_malware, m.malwares_count, 0) ,
			n.sum_secrets = COALESCE(n.sum_secrets, 0) + COALESCE(m.sum_secrets, m.secrets_count, 0),
			n.sum_compliance = COALESCE(n.sum_compliance, 0) + COALESCE(m.sum_compliance, m.compliances_count, 0),
			n.sum_cloud_compliance = COALESCE(n.sum_cloud_compliance, 0) + COALESCE(m.sum_cloud_compliance, m.cloud_compliances_count, 0),
			n.sum_exploitable_cve = COALESCE(n.sum_exploitable_cve, 0) + COALESCE(m.sum_exploitable_cve, m.exploitable_vulnerabilities_count, 0),
			n.sum_exploitable_secrets = COALESCE(n.sum_exploitable_secrets, 0) + COALESCE(m.sum_exploitable_secrets, m.exploitable_secret_count, 0),
			n.sum_exploitable_malwares = COALESCE(n.sum_exploitable_malwares, 0) + COALESCE(m.sum_exploitable_malwares, m.exploitable_malware_count, 0),
			n.sum_warn_alarm = COALESCE(n.sum_warn_alarm, 0) + COALESCE(m.sum_warn_alarm, m.warn_alarm_count, 0),
			n.sum_cloud_warn_alarm = COALESCE(n.sum_cloud_warn_alarm, 0) + COALESCE(m.sum_cloud_warn_alarm, m.cloud_warn_alarm_count, 0)`,
		map[string]interface{}{}, txConfig); err != nil {
		return err
	}

	return nil
}

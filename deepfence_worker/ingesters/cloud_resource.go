package ingesters

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

const (
	NodeTypeHost              = "host"
	NodeTypeKubernetesCluster = "kubernetes_cluster"
	Ec2DnsSuffix              = ".compute.amazonaws.com"
	AwsEc2ResourceId          = "aws_ec2_instance"
	GcpComputeResourceId      = "gcp_compute_instance"
	AzureComputeResourceId    = "azure_compute_virtual_machine"
	DeepfenceVersion          = "v2.0.0"
)

func CommitFuncCloudResource(ns string, cs []ingestersUtil.CloudResource) error {
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(ns))
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	batch, hosts, clusters := ResourceToMaps(cs)

	start := time.Now()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	// Add everything
	_, err = tx.Run(`
		UNWIND $batch as row
		WITH row, row.node_type IN $shown_types as show
		MERGE (n:CloudResource{node_id:row.node_id})
		SET n+=row, n.updated_at = TIMESTAMP(), n.active = true, n.linked = false, n.is_shown = show`,
		map[string]interface{}{
			"batch":       batch,
			"shown_types": ingestersUtil.TopologyCloudResourceTypes,
		},
	)
	if err != nil {
		return err
	}

	if len(hosts) > 0 {
		if _, err = tx.Run(`
		UNWIND $batch as row
		OPTIONAL MATCH (n:Node{node_id:row.node_id})
		WITH n, row as row
		WHERE n IS NULL or n.active=false
		MERGE (m:Node{node_id:row.node_id})
		SET m+=row, m.updated_at = TIMESTAMP()`,
			map[string]interface{}{"batch": hosts}); err != nil {
			return err
		}
	}

	if len(clusters) > 0 {
		if _, err = tx.Run(`
		UNWIND $batch as row
		OPTIONAL MATCH (n:KubernetesCluster{node_id:row.node_id})
		WITH n, row as row
		WHERE n IS NULL or n.active=false
		MERGE (m:KubernetesCluster{node_id:row.node_id})
		SET m+=row, m.updated_at = TIMESTAMP()`,
			map[string]interface{}{"batch": clusters}); err != nil {
			return err
		}

		if _, err := tx.Run(`
		MATCH (k:KubernetesCluster)
		WHERE not (k) -[:INSTANCIATE]-> (:Node)
		MATCH (n:Node{kubernetes_cluster_id:k.kubernetes_cluster_id})
		MERGE (k) -[:INSTANCIATE]-> (n)`,
			map[string]interface{}{}); err != nil {
			return err
		}
	}

	log.Debug().Msgf("cloud resource ingest took: %v", time.Until(start))

	return tx.Commit()
}

func ResourceToMaps(ms []ingestersUtil.CloudResource) ([]map[string]interface{}, []map[string]interface{}, []map[string]interface{}) {
	res := make([]map[string]interface{}, 0, len(ms))
	hosts := make([]map[string]interface{}, 0)
	clusters := make([]map[string]interface{}, 0)
	timestampNow := time.Now().UTC().Format(time.RFC3339Nano)
	for _, v := range ms {
		newmap, err := v.ToMap()
		if err != nil {
			log.Error().Msgf("ToMap err:%v", err)
			continue
		}
		res = append(res, newmap)

		if v.ResourceID == AwsEc2ResourceId || v.ResourceID == GcpComputeResourceId || v.ResourceID == AzureComputeResourceId {
			var publicIP, privateIP []string
			if v.PublicIpAddress != "" {
				publicIP = []string{v.PublicIpAddress}
			}
			if v.PrivateIpAddress != "" {
				privateIP = []string{v.PrivateIpAddress}
			}
			var k8sClusterName string
			var tags map[string]interface{}
			if v.Tags != nil {
				err = json.Unmarshal(*v.Tags, &tags)
				if err == nil {
					if clusterName, ok := tags["eks:cluster-name"]; ok {
						k8sClusterName = fmt.Sprintf("%v", clusterName)
					} else if clusterName, ok = tags["goog-k8s-cluster-name"]; ok {
						k8sClusterName = fmt.Sprintf("%v", clusterName)
					}
				}
			}
			// Add hosts as regular `Node`
			hosts = append(hosts, map[string]interface{}{
				"public_ip":               publicIP,
				"cloud_region":            newmap["cloud_region"],
				"kubernetes_cluster_name": k8sClusterName,
				"private_ip":              privateIP,
				"node_type":               NodeTypeHost,
				"pseudo":                  false,
				"timestamp":               timestampNow,
				"kubernetes_cluster_id":   k8sClusterName,
				"node_name":               v.Name,
				"active":                  true,
				"cloud_provider":          v.CloudProvider,
				"agent_running":           false,
				"version":                 DeepfenceVersion,
				"instance_id":             newmap["node_id"],
				"host_name":               v.Name,
				"node_id":                 v.Name,
			})
			if k8sClusterName != "" {
				clusters = append(clusters, map[string]interface{}{
					"timestamp":               timestampNow,
					"node_id":                 k8sClusterName,
					"node_name":               k8sClusterName,
					"node_type":               NodeTypeKubernetesCluster,
					"kubernetes_cluster_name": k8sClusterName,
					"kubernetes_cluster_id":   k8sClusterName,
					"active":                  true,
					"cloud_provider":          v.CloudProvider,
					"agent_running":           false,
				})
			}
		}
	}
	return res, hosts, clusters
}

// TODO: Call somewhere
func LinkNodesWithCloudResources(ctx context.Context) error {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run(`
		MATCH (n:Node) -[r:IS]-> (m:CloudResource)
		DELETE r`,
		map[string]interface{}{}); err != nil {
		log.Error().Msgf("error: %+v", err)
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Node)
		WITH apoc.convert.fromJsonMap(n.cloud_metadata) as map, n
		WHERE map.label = 'AWS'
		WITH map.id as id, n
		MATCH (m:CloudResource)
		WHERE m.node_type = 'aws_ec2_instance'
		AND m.instance_id = id
		MERGE (n) -[:IS]-> (m)`, map[string]interface{}{}); err != nil {
		log.Error().Msgf("error: %+v", err)
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Node)
		WITH apoc.convert.fromJsonMap(n.cloud_metadata) as map, n
		WHERE map.label = 'GCP'
		WITH map.hostname as hostname, n
		MATCH (m:CloudResource)
		WHERE m.node_type = 'gcp_compute_instance'
		AND m.hostname = hostname
		MERGE (n) -[:IS]-> (m)`, map[string]interface{}{}); err != nil {
		log.Error().Msgf("error: %+v", err)
		return err
	}

	if _, err = tx.Run(`
		MATCH (n:Node)
		WITH apoc.convert.fromJsonMap(n.cloud_metadata) as map, n
		WHERE map.label = 'AZURE'
		WITH map.vmId as vm, n
		MATCH (m:CloudResource)
		WHERE m.node_type = 'azure_compute_virtual_machine'
		AND m.arn = vm
		MERGE (n) -[:IS]-> (m)`, map[string]interface{}{}); err != nil {
		log.Error().Msgf("error: %+v", err)
		return err
	}

	return tx.Commit()
}

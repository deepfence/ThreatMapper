package ingesters

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/telemetry"
	ingestersUtil "github.com/deepfence/ThreatMapper/deepfence_utils/utils/ingesters"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const (
	NodeTypeHost              = "host"
	NodeTypeKubernetesCluster = "kubernetes_cluster"
	Ec2DnsSuffix              = ".compute.amazonaws.com"
	AwsEc2ResourceId          = "aws_ec2_instance"
	GcpComputeResourceId      = "gcp_compute_instance"
	AzureComputeResourceId    = "azure_compute_virtual_machine"
)

func CommitFuncCloudResource(ctx context.Context, ns string, cs []ingestersUtil.CloudResource) error {

	ctx = directory.ContextWithNameSpace(ctx, directory.NamespaceID(ns))

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "commit-func-cloud-resource")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	batch, hosts, clusters := ResourceToMaps(cs)

	start := time.Now()

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	// Add everything
	_, err = tx.Run(ctx, `
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
		if _, err = tx.Run(ctx, `
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
		if _, err = tx.Run(ctx, `
		UNWIND $batch as row
		OPTIONAL MATCH (n:KubernetesCluster{node_id:row.node_id})
		WITH n, row as row
		WHERE n IS NULL or n.active=false
		MERGE (m:KubernetesCluster{node_id:row.node_id})
		SET m+=row, m.updated_at = TIMESTAMP()`,
			map[string]interface{}{"batch": clusters}); err != nil {
			return err
		}

		if _, err := tx.Run(ctx, `
		MATCH (k:KubernetesCluster)
		WHERE not (k) -[:INSTANCIATE]-> (:Node)
		MATCH (n:Node{kubernetes_cluster_id:k.kubernetes_cluster_id})
		MERGE (k) -[:INSTANCIATE]-> (n)`,
			map[string]interface{}{}); err != nil {
			return err
		}
	}

	log.Debug().Ctx(ctx).Msgf("cloud resource ingest took: %v", time.Since(start))

	return tx.Commit(ctx)
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
			if v.PublicIPAddress != "" {
				publicIP = []string{v.PublicIPAddress}
			}
			if v.PrivateIPAddress != "" {
				privateIP = []string{v.PrivateIPAddress}
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
				"version":                 "",
				"instance_id":             newmap["node_id"],
				"host_name":               v.Name,
				"node_id":                 v.Name,
				"account_id":              newmap["account_id"],
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
					"account_id":              newmap["account_id"],
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

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	if _, err = tx.Run(ctx, `
		MATCH (n:Node) -[r:IS]-> (m:CloudResource)
		DELETE r`,
		map[string]interface{}{}); err != nil {
		log.Error().Msgf("error: %+v", err)
		return err
	}

	if _, err = tx.Run(ctx, `
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

	if _, err = tx.Run(ctx, `
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

	if _, err = tx.Run(ctx, `
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

	return tx.Commit(ctx)
}

func CommitFuncCloudResourceRefreshStatus(ctx context.Context, ns string, cs []ingestersUtil.CloudResourceRefreshStatus) error {

	ctx = directory.ContextWithNameSpace(ctx, directory.NamespaceID(ns))

	ctx, span := telemetry.NewSpan(ctx, "ingesters", "commit-func-cloud-resource")
	defer span.End()

	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(30*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	_, err = tx.Run(ctx, `
		UNWIND $batch as row
		MATCH (n:CloudNode{node_id: row.cloud_node_id})
		SET n.refresh_status = row.refresh_status,
			n.refresh_message = row.refresh_message,
			n.refresh_metadata = row.refresh_metadata,
			n.refresh_updated_at = row.updated_at`,
		map[string]interface{}{
			"batch": ResourceRefreshStatusToMaps(cs),
		},
	)

	return tx.Commit(ctx)
}

func ResourceRefreshStatusToMaps(data []ingestersUtil.CloudResourceRefreshStatus) []map[string]interface{} {
	statuses := make([]map[string]interface{}, len(data))

	sort.Slice(data, func(i, j int) bool {
		return data[i].UpdatedAt < data[j].UpdatedAt
	})

	for i, d := range data {
		statuses[i] = d.ToMap()
	}
	return statuses
}

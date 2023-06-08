package ingesters

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type CloudResource struct {
	AccountID                      string           `json:"account_id"`
	Arn                            string           `json:"arn"`
	BlockPublicAcls                bool             `json:"block_public_acls,omitempty"`
	BlockPublicPolicy              bool             `json:"block_public_policy,omitempty"`
	BucketPolicyIsPublic           bool             `json:"bucket_policy_is_public,omitempty"`
	CloudProvider                  string           `json:"cloud_provider,omitempty"`
	RestrictPublicBuckets          bool             `json:"restrict_public_buckets,omitempty"`
	ID                             string           `json:"id"`
	IgnorePublicAcls               bool             `json:"ignore_public_acls,omitempty"`
	Name                           string           `json:"name"`
	HostName                       string           `json:"host_name"`
	Region                         string           `json:"region"`
	ResourceID                     string           `json:"resource_id"`
	IsEgress                       bool             `json:"is_egress"`
	InstanceID                     string           `json:"instance_id"`
	NetworkMode                    string           `json:"network_mode,omitempty"`
	Scheme                         string           `json:"scheme,omitempty"`
	DbClusterIdentifier            string           `json:"db_cluster_identifier,omitempty"`
	ServiceName                    string           `json:"service_name,omitempty"`
	TaskDefinitionArn              string           `json:"task_definition_arn,omitempty"`
	VpcID                          string           `json:"vpc_id,omitempty"`
	AllowBlobPublicAccess          bool             `json:"allow_blob_public_access,omitempty"`
	PublicAccess                   string           `json:"public_access,omitempty"`
	GroupId                        string           `json:"group_id,omitempty"`
	CidrIpv4                       string           `json:"cidr_ipv4,omitempty"`
	PublicNetworkAccess            string           `json:"public_network_access,omitempty"`
	StorageAccountName             string           `json:"storage_account_name,omitempty"`
	IamInstanceProfileArn          string           `json:"iam_instance_profile_arn,omitempty"`
	IamInstanceProfileId           string           `json:"iam_instance_profile_id,omitempty"`
	PublicIpAddress                string           `json:"public_ip_address"`
	PolicyStd                      *json.RawMessage `json:"policy_std,omitempty"`
	Containers                     *json.RawMessage `json:"containers,omitempty"`
	TaskDefinition                 *json.RawMessage `json:"task_definition,omitempty"`
	VpcOptions                     *json.RawMessage `json:"vpc_options,omitempty"`
	Policy                         *json.RawMessage `json:"policy,omitempty"`
	PublicIps                      *json.RawMessage `json:"public_ips,omitempty"`
	NetworkInterfaces              *json.RawMessage `json:"network_interfaces,omitempty"`
	IamPolicy                      *json.RawMessage `json:"iam_policy,omitempty"`
	IpConfiguration                *json.RawMessage `json:"ip_configuration,omitempty"`
	IngressSettings                string           `json:"ingress_settings,omitempty"`
	SecurityGroups                 *json.RawMessage `json:"security_groups,omitempty"`
	VpcSecurityGroups              *json.RawMessage `json:"vpc_security_groups,omitempty"`
	ContainerDefinitions           *json.RawMessage `json:"container_definitions,omitempty"`
	EventNotificationConfiguration *json.RawMessage `json:"event_notification_configuration,omitempty"`
	ResourceVpcConfig              *json.RawMessage `json:"resource_vpc_config,omitempty"`
	NetworkConfiguration           *json.RawMessage `json:"network_configuration,omitempty"`
	AttachedPolicyArns             *json.RawMessage `json:"attached_policy_arns"`
	CreateDate                     string           `json:"create_date,omitempty"`
	Groups                         *json.RawMessage `json:"groups"`
	InlinePolicies                 *json.RawMessage `json:"inline_policies"`
	Path                           string           `json:"path"`
	UserId                         string           `json:"user_id"`
	AccessLevel                    string           `json:"access_level"`
	Action                         string           `json:"action"`
	Description                    string           `json:"description"`
	Privilege                      string           `json:"privilege"`
	OrganizationId                 string           `json:"organization_id"`
	OrganizationMasterAccountArn   string           `json:"organization_master_account_arn"`
	OrganizationMasterAccountEmail string           `json:"organization_master_account_email"`
	TargetHealthDescriptions       *json.RawMessage `json:"target_health_descriptions"`
	InstanceProfileArns            *json.RawMessage `json:"instance_profile_arns"`
	Instances                      *json.RawMessage `json:"instances"`
	TargetGroupArn                 string           `json:"target_group_arn"`
	VpcSecurityGroupIds            *json.RawMessage `json:"vpc_security_group_ids"`
	Users                          *json.RawMessage `json:"users"`
	UserGroups                     *json.RawMessage `json:"user-groups"`
	ResourcesVpcConfig             *json.RawMessage `json:"resources_vpc_config"`
}

var (
	resource_types = [...]string{"aws_ec2_instance", "aws_ec2_application_load_balancer", "aws_ec2_classic_load_balancer", "aws_ec2_network_load_balancer"}

	resource_lambda = [...]string{"aws_lambda_function"}
	resource_ecs    = [...]string{"aws_ecs_service"}
)

func CommitFuncCloudResource(ns string, cs []CloudResource) error {
	ctx := directory.NewContextWithNameSpace(directory.NamespaceID(ns))
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session, err := driver.Session(neo4j.AccessModeWrite)

	if err != nil {
		return err
	}
	defer session.Close()

	batch := ResourceToMaps(cs)

	skippableTx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}

	_, err = skippableTx.Run(`
		UNWIND $batch as row
		WITH row, COALESCE(row.region, 'global') as cloud_region
		MERGE (cp:CloudProvider{node_id:row.cloud_provider})
		MERGE (cr:CloudRegion{node_id:cloud_region})
		MERGE (cp) -[:HOSTS]-> (cr)
		SET cp.active = true, cr.active = true`,
		map[string]interface{}{
			"batch": batch,
		},
	)
	skippableTx.Commit()
	skippableTx.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return err
	}
	defer tx.Close()

	// Add everything
	_, err = tx.Run(`
		UNWIND $batch as row
		WITH row, COALESCE(row.region, 'global') as cloud_region
		MATCH (cr:CloudRegion{node_id:cloud_region})
		MATCH (m:CloudNode{node_id: row.account_id})
		MERGE (n:CloudResource{node_id:row.node_id})
		MERGE (m)-[:OWNS]->(n)
		MERGE (cr) -[:HOSTS]-> (n)
		SET n+=row, n.node_name = n.name, n.node_type = row.resource_id, n.cloud_region = cloud_region, n.updated_at = TIMESTAMP(), n.active = true`,
		map[string]interface{}{
			"batch": batch,
		},
	)

	if err != nil {
		log.Error().Msgf("error: %+v", err)
		return err
	}

	// Handle AWS EC2 & LBs
	subgroup := splitGroup(batch, resource_types[:])
	if len(subgroup) != 0 {
		if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (n:CloudResource{node_id:row.node_id})
		AND n.security_groups IS NOT NULL
		WITH n, apoc.convert.fromJsonList(n.security_groups) as groups
		UNWIND groups as subgroup
		WITH subgroup, CASE WHEN apoc.meta.type(subgroup) = "STRING" THEN subgroup ELSE subgroup.GroupName END as name,
		CASE WHEN apoc.meta.type(subgroup) = "STRING" THEN subgroup ELSE subgroup.GroupId END as node_id
		MERGE (m:SecurityGroup{node_id:node_id})
		MERGE (m)-[:SECURED]->(n)`,
			map[string]interface{}{
				"batch": subgroup,
			}); err != nil {
			log.Error().Msgf("error: %+v", err)
			return err
		}
	}

	// Handle AWS Lambda
	subgroup = splitGroup(batch, resource_lambda[:])
	if len(subgroup) != 0 {
		if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (n:CloudResource{node_id:row.node_id})
		WITH apoc.convert.fromJsonList(n.vpc_security_group_ids) as sec_group_ids,n
		UNWIND sec_group_ids as subgroup
		MERGE (m:SecurityGroup{node_id:subgroup})
		MERGE (m)-[:SECURED]->(n)`,
			map[string]interface{}{
				"batch": subgroup,
			}); err != nil {
			log.Error().Msgf("error: %+v", err)
			return err
		}
	}

	// Handle AWS ECS
	subgroup = splitGroup(batch, resource_ecs[:])
	if len(subgroup) != 0 {
		if _, err = tx.Run(`
		UNWIND $batch as row
		MATCH (n:CloudResource{node_id:row.node_id})
		WITH apoc.convert.fromJsonMap(n.network_configuration) as map,n
		UNWIND map.AwsvpcConfiguration.SecurityGroups as secgroup
		MERGE (m:SecurityGroup{node_id:secgroup})
		MERGE (m)-[:SECURED]->(n)`,
			map[string]interface{}{
				"batch": subgroup,
			}); err != nil {
			log.Error().Msgf("error: %+v", err)
			return err
		}
	}

	return tx.Commit()
}

func splitGroup(input []map[string]interface{}, types []string) []map[string]interface{} {
	res := []map[string]interface{}{}
	matcher := map[string]struct{}{}
	for i := range types {
		matcher[types[i]] = struct{}{}
	}

	for i := range input {
		if input[i]["node_type"] != nil {
			if _, has := matcher[input[i]["node_type"].(string)]; has {
				res = append(res, input[i])
			}
		}
	}
	return res
}

func ResourceToMaps(ms []CloudResource) []map[string]interface{} {
	res := make([]map[string]interface{}, 0, len(ms))
	for _, v := range ms {
		newmap, err := v.ToMap()
		if err != nil {
			log.Error().Msgf("ToMap err:%v", err)
		} else {
			res = append(res, newmap)
		}
	}
	fmt.Println("check ms size", len(res))
	return res
}

func (c *CloudResource) ToMap() (map[string]interface{}, error) {
	out, err := json.Marshal(*c)
	if err != nil {
		return nil, err
	}
	bb := map[string]interface{}{}
	err = json.Unmarshal(out, &bb)
	if err != nil {
		return nil, err
	}

	bb = convertStructFieldToJSONString(bb, "task_definition")
	bb = convertStructFieldToJSONString(bb, "vpc_options")
	bb = convertStructFieldToJSONString(bb, "policy")
	bb = convertStructFieldToJSONString(bb, "public_ips")
	bb = convertStructFieldToJSONString(bb, "network_interfaces")
	bb = convertStructFieldToJSONString(bb, "iam_policy")
	bb = convertStructFieldToJSONString(bb, "ip_configuration")
	bb = convertStructFieldToJSONString(bb, "security_groups")
	bb = convertStructFieldToJSONString(bb, "vpc_security_groups")
	bb = convertStructFieldToJSONString(bb, "container_definitions")
	bb = convertStructFieldToJSONString(bb, "event_notification_configuration")
	bb = convertStructFieldToJSONString(bb, "resource_vpc_config")
	bb = convertStructFieldToJSONString(bb, "network_configuration")
	bb = convertStructFieldToJSONString(bb, "policy_std")
	bb = convertStructFieldToJSONString(bb, "attached_policy_arns")
	bb = convertStructFieldToJSONString(bb, "groups")
	bb = convertStructFieldToJSONString(bb, "inline_policies")
	bb = convertStructFieldToJSONString(bb, "instances")
	bb = convertStructFieldToJSONString(bb, "containers")
	bb = convertStructFieldToJSONString(bb, "target_health_descriptions")
	bb = convertStructFieldToJSONString(bb, "instance_profile_arns")
	bb = convertStructFieldToJSONString(bb, "users")
	bb = convertStructFieldToJSONString(bb, "user-groups")
	bb = convertStructFieldToJSONString(bb, "vpc_security_group_ids")
	bb = convertStructFieldToJSONString(bb, "resources_vpc_config")

	if bb["resource_id"] == "aws_ecs_service" {
		bb["node_id"] = bb["service_name"]
	} else if bb["resource_id"] == "aws_lambda_function" {
		bb["node_id"] = bb["name"]
	} else if bb["resource_id"] == "aws_iam_access_key" {
		bb["node_id"] = bb["access_key_id"]
	} else if strings.Contains("azure", bb["resource_id"].(string)) {
		if bb["resource_id"].(string) == "azure_compute_virtual_machine" {
			bb["node_id"] = bb["vm_id"]
		} else {
			bb["node_id"] = bb["name"]
		}
	} else {
		if bb["arn"] != nil {
			bb["node_id"] = bb["arn"]
		} else if bb["id"] != nil {
			bb["node_id"] = bb["id"]
		} else if bb["resource_id"] != nil {
			bb["node_id"] = bb["resource_id"]
		} else {
			bb["node_id"] = "error"
		}
	}
	accountId, present := bb["account_id"]
	if present {
		splits := strings.Split(fmt.Sprintf("%v", accountId), "-")
		if len(splits) > 2 {
			bb["cloud_provider"] = splits[2]
		}
	}

	return bb, nil
}

// TODO: Call somewhere
func LinkNodesWithCloudResources(ctx context.Context) error {
	driver, err := directory.Neo4jClient(ctx)
	session, err := driver.Session(neo4j.AccessModeWrite)

	if err != nil {
		return err
	}
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

func convertStructFieldToJSONString(bb map[string]interface{}, key string) map[string]interface{} {
	if val, ok := bb[key]; ok && val != nil {
		v, e := json.Marshal(val)
		if e == nil {
			bb[key] = string(v)
		} else {
			bb[key] = "error"
		}
	}
	return bb
}

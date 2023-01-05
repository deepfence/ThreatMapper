package ingesters

import (
	"context"
	"encoding/json"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type CloudResourceIngester struct {
	driver neo4j.Driver
}

type CloudResource struct {
	AccountID                      string           `json:"account_id"`
	Arn                            string           `json:"arn"`
	BlockPublicAcls                bool             `json:"block_public_acls,omitempty"`
	BlockPublicPolicy              bool             `json:"block_public_policy,omitempty"`
	BucketPolicyIsPublic           bool             `json:"bucket_policy_is_public,omitempty"`
	RestrictPublicBuckets          bool             `json:"restrict_public_buckets,omitempty"`
	ID                             string           `json:"id"`
	IgnorePublicAcls               bool             `json:"ignore_public_acls,omitempty"`
	Name                           string           `json:"name"`
	Region                         string           `json:"region"`
	ResourceID                     string           `json:"resource_id"`
	InstanceID                     string           `json:"instance_id"`
	NetworkMode                    string           `json:"network_mode,omitempty"`
	Scheme                         string           `json:"scheme,omitempty"`
	DbClusterIdentifier            string           `json:"db_cluster_identifier,omitempty"`
	ServiceName                    string           `json:"service_name,omitempty"`
	TaskDefinitionArn              string           `json:"task_definition_arn,omitempty"`
	VpcID                          string           `json:"vpc_id,omitempty"`
	AllowBlobPublicAccess          string           `json:"allow_blob_public_access,omitempty"`
	PublicAccess                   string           `json:"public_access,omitempty"`
	IamInstanceProfileArn          string           `json:"iam_instance_profile_arn,omitempty"`
	GroupId                        string           `json:"group_id,omitempty"`
	CidrIpv4                       string           `json:"cidr_ipv4,omitempty"`
	IngressSettings                string           `json:"ingress_settings,omitempty"`
	TaskDefinition                 *json.RawMessage `json:"task_definition,omitempty"`
	AttachedPolicyArns             *json.RawMessage `json:"attached_policy_arns,omitempty"`
	VpcOptions                     *json.RawMessage `json:"vpc_options,omitempty"`
	Policy                         *json.RawMessage `json:"policy,omitempty"`
	PolicyStd                      *json.RawMessage `json:"policy_std,omitempty"`
	InstanceProfileArns            *json.RawMessage `json:"instance_profile_arns"`
	PublicIps                      *json.RawMessage `json:"public_ips,omitempty"`
	NetworkInterfaces              *json.RawMessage `json:"network_interfaces,omitempty"`
	IamPolicy                      *json.RawMessage `json:"iam_policy,omitempty"`
	IpConfiguration                *json.RawMessage `json:"ip_configuration,omitempty"`
	SecurityGroups                 *json.RawMessage `json:"security_groups,omitempty"`
	VpcSecurityGroups              *json.RawMessage `json:"vpc_security_groups,omitempty"`
	Containers                     *json.RawMessage `json:"containers,omitempty"`
	ContainerDefinitions           *json.RawMessage `json:"container_definitions,omitempty"`
	EventNotificationConfiguration *json.RawMessage `json:"event_notification_configuration,omitempty"`
	ResourcesVpcConfig             *json.RawMessage `json:"resource_vpc_config,omitempty"`
	NetworkConfiguration           *json.RawMessage `json:"network_configuration,omitempty"`
}

func NewCloudResourceIngester() Ingester[[]CloudResource] {
	return &CloudResourceIngester{}
}

func (tc *CloudResourceIngester) Ingest(ctx context.Context, cs []CloudResource) error {
	session, err := tc.driver.Session(neo4j.AccessModeWrite)

	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run("UNWIND $batch as row MERGE (m:CloudResource{node_id:row.arn, resource_type:row.resource_id}) SET m+=row WITH row UNWIND apoc.convert.fromJsonList(row.security_groups) as group WITH group, row WHERE group IS NOT NULL MERGE (n:SecurityGroup{node_id:group.GroupId, name:group.GroupName}) MERGE (m:CloudResource{node_id:row.arn, resource_type:row.resource_id}) MERGE (n)-[:SECURED]->(m)", map[string]interface{}{"batch": ResourceToMaps(cs)}); err != nil {
		return err
	}

	return tx.Commit()
}

// TODO: Call somewhere
func (tc *CloudComplianceIngester) LinkNodesWithCloudResources(ctx context.Context) error {
	driver, err := directory.Neo4jClient(ctx)
	session, err := driver.Session(neo4j.AccessModeWrite)

	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run("match (n) -[r:IS]-> (m) delete r", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:Node) WITH apoc.convert.fromJsonMap(n.cloud_metadata) as map, n WHERE map.label = 'AWS' WITH map.id as id, n match (m:CloudResource) where m.resource_type = 'aws_ec2_instance' and m.instance_id = id MERGE (n) -[:IS]-> (m)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:Node) WITH apoc.convert.fromJsonMap(n.cloud_metadata) as map, n WHERE map.label = 'GCP' WITH map.hostname as hostname, n match (m:CloudResource) where m.resource_type = 'gcp_compute_instance' and m.hostname = hostname MERGE (n) -[:IS]-> (m)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("match (n:Node) WITH apoc.convert.fromJsonMap(n.cloud_metadata) as map, n WHERE map.label = 'AZURE' WITH map.vmId as vm, n match (m:CloudResource) where m.resource_type = 'azure_compute_virtual_machine' and m.arn = vm MERGE (n) -[:IS]-> (m)", map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}

func (tc *CloudComplianceIngester) CreateRelationShips(ctx context.Context) error {
	driver, err := directory.Neo4jClient(ctx)
	session, err := driver.Session(neo4j.AccessModeWrite)

	if err != nil {
		return err
	}
	defer session.Close()

	tx, err := session.BeginTransaction()
	if err != nil {
		return err
	}
	defer tx.Close()

	if _, err = tx.Run("MATCH (s:CveScan) -[:SCANNED]-> (m) WITH max(s.time_stamp) as most_recent, m MATCH (s:CveScan {time_stamp: most_recent})-[:DETECTED]->(c:Cve) WITH m, count(distinct c) as num_cve SET m.num_cve = num_cve", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (s:SecretScan) -[:SCANNED]-> (m) WITH max(s.time_stamp) as most_recent, m MATCH (s:SecretScan {time_stamp: most_recent})-[:DETECTED]->(c:Secret) WITH m, count(distinct c) as num_secrets SET m.num_secrets = num_secrets", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (s:ComplianceScan) -[:SCANNED]-> (m) WITH max(s.time_stamp) as most_recent, m MATCH (s:ComplianceScan {time_stamp: most_recent})-[:DETECTED]->(c:Compliance) WITH m, count(distinct c) as num_compliance SET m.num_compliance = num_compliance", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node) SET n.sum_cve = COALESCE(n.num_cve, 0), n.sum_secrets = COALESCE(n.num_secrets, 0), n.sum_compliance = COALESCE(n.num_compliance, 0);", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node) -[:CONNECTED]->(m:Node) SET n.sum_cve = COALESCE(n.sum_cve, 0) + COALESCE(m.sum_cve, m.num_cve, 0), n.sum_secrets = COALESCE(n.sum_secrets, 0) + COALESCE(m.sum_secrets, m.num_secrets, 0), n.sum_compliance = COALESCE(n.sum_compliance, 0) + COALESCE(m.sum_compliance, m.num_compliance, 0);", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node {node_id:'in-the-internet'})-[d:CONNECTS*]->(m:Node) with SIZE(d) as depth, m with min(depth) as min_depth, m SET m.depth = min_depth", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node) SET n.num_cve = COALESCE(n.num_cve, 0), n.num_secrets = COALESCE(n.num_secrets, 0), n.num_compliance = COALESCE(n.num_compliance, 0);", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node) SET n.sum_cve = n.num_cve, n.sum_secrets = n.num_secrets, n.sum_compliance = n.num_compliance;", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:Node) -[:CONNECTS]->(m:Node) SET n.sum_cve = COALESCE(n.sum_cve, 0) + COALESCE(m.sum_cve, m.num_cve, 0), n.sum_secrets = COALESCE(n.sum_secrets, 0) + COALESCE(m.sum_secrets, m.num_secrets, 0), n.sum_compliance = COALESCE(n.sum_compliance, 0) + COALESCE(m.sum_compliance, m.num_compliance, 0);", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_vpc_security_group_rule'})  MATCH (m:SecurityGroup{node_id: n.group_id}) -[:SECURED]-> (z:CloudResource{resource_type:'aws_ec2_instance'}) WHERE n.is_egress <> true   MERGE (k:Node {node_id:'in-the-internet'})  MERGE (k)-[:PUBLIC]->(z)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_vpc_security_group_rule'}) MATCH (m:SecurityGroup{node_id: n.group_id})-[:SECURED]-> (z:CloudResource{resource_type:'aws_ec2_instance'}) WHERE n.is_egress = true   MERGE (k:Node {node_id:'out-the-internet'})  MERGE (z)-[:PUBLIC]->(k)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (m:CloudResource{resource_type:'aws_ecs_service'})  MATCH (k:CloudResource{resource_type:'aws_ecs_task'}) MATCH (n:CloudResource{resource_type:'aws_ecs_task_definition',node_id:substring(m.task_definition,1,size(m.task_definition)-2)}) WITH apoc.convert.fromJsonMap(m.network_configuration) as map,m,n,k WHERE n.node_id=k.task_definition_arn AND map is not null AND  map.AwsvpcConfiguration.AssignPublicIp = 'ENABLED' MERGE (p:Node {node_id:'in-the-internet'})  MERGE (p) -[:PUBLIC]-> (k)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (k:CloudResource{resource_type:'aws_ecs_task'})  WITH apoc.convert.fromJsonList(k.containers) as containers,k  UNWIND containers as container    MATCH  (t:CloudResource{resource_type:'aws_ecr_repository'}) where  COALESCE(split(t.node_id, ':')[4],'') + '.dkr.ecr.' + COALESCE(split(t.node_id, ':')[3],'') + '.amazonaws.com/' + COALESCE(split(split(t.node_id, ':')[5], '/')[1], '' )  = container.Image MERGE (k) -[:USES]-> (t)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (k:CloudResource{resource_type:'aws_ecrpublic_repository'}) MATCH (p:Node {node_id:'in-the-internet'})   MERGE (p) -[:PUBLIC]-> (k)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_s3_bucket', bucket_policy_is_public: true })  MATCH (p:Node {node_id:'in-the-internet'})   MERGE (p) -[:PUBLIC]-> (n)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(
		"MATCH (t)-[r:PUBLIC]->(k:CloudResource{resource_type:'aws_ec2_instance' } ) "+
			"MATCH (n:CloudResource{resource_type:'aws_iam_role'}) "+
			"WITH apoc.convert.fromJsonList(n.instance_profile_arns) as instance_arns,k,n "+
			"WHERE k.iam_instance_profile_arn IN instance_arns "+
			"WITH apoc.convert.fromJsonList(n.attached_policy_arns) as attached_policy_arns,k,n "+
			"UNWIND attached_policy_arns as policy_arn MATCH (z:CloudResource{resource_type:'aws_iam_policy' })"+
			"where  z.node_id = policy_arn  WITH apoc.convert.fromJsonMap(z.policy) as policy,z,k,n"+
			"UNWIND  policy.Statement as statement unwind statement.Action as action"+
			"MATCH (c:CloudResource{resource_type:'aws_s3_bucket' } )  where action =~ '.*S3.*'"+
			"and statement.Effect <> 'Deny' and (statement.Resource = '*' or statement.Resource = c.node_id)"+
			" and (c.policy is null or NOT(c.policy =~  '.*deny.*' ))"+
			"MERGE (k) -[:COMMUNICATES]-> (c)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_lambda_function' }) WITH apoc.convert.fromJsonMap(n.policy) as policy,n UNWIND policy.Statement as pol_statement   MATCH (p:Node {node_id:'in-the-internet'}) where (pol_statement.Principal = '*'or pol_statement.Principal.AWS = '*') and pol_statement.Effect = 'Allow' MERGE (p) -[:PUBLIC]-> (n)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_s3_bucket' }) WITH apoc.convert.fromJsonMap(n.event_notification_configuration) as eventConfig,n  UNWIND eventConfig.LambdaFunctionConfigurations AS envconf MATCH (p:CloudResource{resource_type:'aws_lambda_function' , arn: envconf.LambdaFunctionArn }) MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_ec2_classic_load_balancer', scheme : 'internet_facing' }) MATCH (p:Node {node_id:'in-the-internet'})   MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_ec2_network_load_balancer', scheme : 'internet_facing' }) MATCH (p:Node {node_id:'in-the-internet'})   MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_ec2_application_load_balancer', scheme : 'internet_facing' }) MATCH (p:Node {node_id:'in-the-internet'})   MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_opensearch_domain' }) where n.vpc_options IS NULL MATCH (p:Node {node_id:'in-the-internet'})   MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_rds_db_cluster'}) WITH apoc.convert.fromJsonMap(n.vpc_security_groups) as vpc_security_groups,n where vpc_security_groups.VpcSecurityGroupId.is_egress IS NOT NULL and  vpc_security_groups.VpcSecurityGroupId.cidr_ipv4= '0.0.0.0/0'  MERGE (p:Node {node_id:'out-the-internet'})   MERGE (n) -[:PUBLIC]-> (p) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_rds_db_cluster'}) WITH apoc.convert.fromJsonMap(n.vpc_security_groups) as vpc_security_groups,n where vpc_security_groups.VpcSecurityGroupId.is_egress IS  NULL and  vpc_security_groups.VpcSecurityGroupId.cidr_ipv4= '0.0.0.0/0'  MATCH (p:Node {node_id:'in-the-internet'})   MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'azure_storage_account', allow_blob_public_access: true }) MERGE (p:Node {node_id:'in-the-internet'})   MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'azure_storage_account', allow_blob_public_access: true}) MATCH (p:CloudResource{resource_type:'azure_storage_blob', storage_account_name: n.node_id })    MERGE (p) -[:PUBLIC]-> (n)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'azure_storage_account', allow_blob_public_access: true}) MATCH (p:CloudResource{resource_type:'azure_storage_table', storage_account_name: n.node_id })    MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'azure_storage_account', allow_blob_public_access: true}) MATCH (p:CloudResource{resource_type:'azure_log_profile', storage_account_name: n.node_id })    MERGE (p) -[:PUBLIC]-> (n)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'azure_mysql_server', public_network_access: 'Enabled'})   MERGE (p:Node {node_id:'in-the-internet'})   MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'azure_storage_container'}) MATCH (p:CloudResource{resource_type:'azure_log_profile', storage_account_name: n.node_id }) WHERE (n.public_access IS NOT NULL) OR (n.public_access <> '')   MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'azure_compute_virtual_machine' })  WITH apoc.convert.fromJsonList(n.public_ips) as public_ips,n  WHERE (public_ips IS NOT NULL) OR (size(public_ips)>0) MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'gcp_compute_instance' })  WITH apoc.convert.fromJsonList(n.network_interfaces) as network_interfaces,n  UNWIND network_interfaces AS network_interface  MATCH (p:Node {node_id:'in-the-internet'}) WHERE (network_interface IS NOT NULL) AND (network_interface.accessConfigs IS NOT NULL) UNWIND  network_interface.accessConfigs as accessconfig  MATCH (z:Node {node_id:'in-the-internet'}) where accessconfig.natIP IS NOT NULL   MERGE (z) -[:PUBLIC]-> (n)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'gcp_storage_bucket' })  WITH apoc.convert.fromJsonMap(n.iam_policy) as policy,n  UNWIND policy.bindings AS binding   UNWIND binding.members as member MATCH (p:Node {node_id:'in-the-internet'})  where member = 'allUsers' or member = 'allAuthenticatedUsers'  MERGE (p) -[:PUBLIC]-> (n)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'gcp_sql_database_instance' }) WITH apoc.convert.fromJsonMap(n.ip_configuration) as ip_config,n UNWIND ip_config.authorizedNetworks as network MATCH (p:Node {node_id:'in-the-internet'})  WHERE (network.value = '0.0.0.0/0')  MERGE (p) -[:PUBLIC]-> (n)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'gcp_cloudfunctions_function', ingress_settings: 'ALLOW_ALL' })    MERGE (p:Node {node_id:'in-the-internet'}) MERGE (p) -[:PUBLIC]-> (n)) where ", map[string]interface{}{}); err != nil {
		return err
	}

	return tx.Commit()
}

func ResourceToMaps(ms []CloudResource) []map[string]interface{} {
	res := []map[string]interface{}{}
	for _, v := range ms {
		res = append(res, v.ToMap())
	}
	return res
}

func (c *CloudResource) ToMap() map[string]interface{} {
	out, err := json.Marshal(*c)
	if err != nil {
		return nil
	}
	bb := map[string]interface{}{}
	err = json.Unmarshal(out, &bb)

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
	bb = convertStructFieldToJSONString(bb, "containers")
	bb = convertStructFieldToJSONString(bb, "event_notification_configuration")
	bb = convertStructFieldToJSONString(bb, "resource_vpc_config")
	bb = convertStructFieldToJSONString(bb, "network_configuration")
	bb = convertStructFieldToJSONString(bb, "policy_std")
	bb = convertStructFieldToJSONString(bb, "instance_profile_arns")
	bb = convertStructFieldToJSONString(bb, "attached_policy_arns")

	return bb
}

package ingesters

import (
	"encoding/json"
	"time"

	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/utils"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

type ComplianceStats struct {
	Alarm                int     `json:"alarm"`
	Ok                   int     `json:"ok"`
	Info                 int     `json:"info"`
	Skip                 int     `json:"skip"`
	Error                int     `json:"error"`
	CompliancePercentage float64 `json:"compliance_percentage"`
}

type CloudComplianceScanStatus struct {
	Timestamp           time.Time       `json:"@timestamp"`
	ComplianceCheckType string          `json:"compliance_check_type"`
	Result              ComplianceStats `json:"result" nested_json:"true"`
	ScanID              string          `json:"scan_id"`
	ScanMessage         string          `json:"scan_message"`
	Status              string          `json:"status"`
	Type                string          `json:"type"`
	TotalChecks         int             `json:"total_checks"`
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
	ScanID              string `json:"scan_id"`
	Masked              bool   `json:"masked"`
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

	if _, err = tx.Run(`
		UNWIND $batch as row
		MERGE (n:CloudCompliance{resource:row.resource, scan_id: row.scan_id, control_id: row.control_id})
		MERGE (m:CloudResource{node_id: row.resource})
		SET n+= row
		WITH n, m
		MERGE (l:CloudComplianceScan{node_id: n.scan_id})
		MERGE (l) -[:SCANNED]-> (m)
		MERGE (l) -[r:DETECTED]-> (n)
		SET r.masked = false`,
		map[string]interface{}{"batch": CloudCompliancesToMaps(data)}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_vpc_security_group_rule'})"+
		"  MATCH (m:SecurityGroup{node_id: n.group_id})"+
		" -[:SECURED]-> (z:CloudResource{resource_type:'aws_ec2_instance'})"+
		" WHERE n.is_egress <> true and n.cidr_ipv4 = '0.0.0.0/0'"+
		"   MERGE (k:Node {node_id:'in-the-internet'})  MERGE (k)-[:PUBLIC]->(z)",
		map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_vpc_security_group_rule'})"+
		" MATCH (t:SecurityGroup{})-[:SECURED]-> (b:CloudResource{resource_type:'aws_ec2_instance'})"+
		" MATCH (m:SecurityGroup{node_id: n.group_id})-[:SECURED]-> (z:CloudResource{resource_type:'aws_ec2_instance'})"+
		" WHERE n.cidr_ipv4 = t.node_id    MERGE (z)-[:COMMUNICATES]->(b)",
		map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_vpc_security_group_rule'})"+
		" MATCH (t:SecurityGroup{})-[:SECURED]-> (b:CloudResource{resource_type:'aws_ec2_instance'})"+
		" MATCH (m:SecurityGroup{node_id: n.group_id})-[:SECURED]-> (z:CloudResource{resource_type:'aws_ec2_instance'})"+
		" WHERE n.cidr_ipv4 = t.node_id    MERGE (z)-[:COMMUNICATES]->(b)",
		map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_vpc_security_group_rule'})"+
		" MATCH (b:CloudResource{resource_type:'aws_ec2_instance'})"+
		" MATCH (m:SecurityGroup{node_id: n.group_id})-[:SECURED]->"+
		" (z:CloudResource{resource_type:'aws_ec2_instance'}) WHERE n.cidr_ipv4 = b.public_ip_address"+
		"    MERGE (z)-[:COMMUNICATES]->(b)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (m:CloudResource{resource_type:'aws_ecs_service'})"+
		"  MATCH (k:CloudResource{resource_type:'aws_ecs_task'})"+
		" MATCH (n:CloudResource{resource_type:'aws_ecs_task_definition',"+
		" node_id:substring(m.task_definition,1,size(m.task_definition)-2)})"+
		" WITH apoc.convert.fromJsonMap(m.network_configuration) as map,m,n,k"+
		" WHERE n.node_id=k.task_definition_arn AND map is not null AND"+
		"  map.AwsvpcConfiguration.AssignPublicIp = 'ENABLED'"+
		" MERGE (p:Node {node_id:'in-the-internet'})"+
		"  MERGE (p) -[:PUBLIC]-> (k)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (s:CloudResource{resource_type:'aws_vpc_security_group_rule'})"+
		"  MATCH (t:SecurityGroup{node_id: s.group_id})"+
		"  MATCH (m:CloudResource{resource_type:'aws_ecs_service'})"+
		"  MATCH (k:CloudResource{resource_type:'aws_ecs_task'})"+
		" MATCH (n:CloudResource{resource_type:'aws_ecs_task_definition',node_id:substring(m.task_definition,1,size(m.task_definition)-2)})"+
		" WITH apoc.convert.fromJsonMap(m.network_configuration) as map,m,n,k"+
		" UNWIND  map.AwsvpcConfiguration.SecurityGroups as secgroup"+
		"  WHERE n.node_id=k.task_definition_arn and secgroup.group_id=s.group_id"+
		" and s.is_egress <> true and s.cidr_ipv4 = '0.0.0.0/0'"+
		" MERGE (p:Node {node_id:'in-the-internet'})"+
		"  MERGE (p) -[:PUBLIC]-> (k)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (k:CloudResource{resource_type:'aws_ecs_task'})"+
		"  WITH apoc.convert.fromJsonList(k.containers) as containers,k"+
		"  UNWIND containers as container    "+
		"MATCH  (t:CloudResource{resource_type:'aws_ecr_repository'})"+
		" where  COALESCE(split(t.node_id, ':')[4],'') + '.dkr.ecr.' + COALESCE(split(t.node_id, ':')[3],'')"+
		" + '.amazonaws.com/' + COALESCE(split(split(t.node_id, ':')[5], '/')[1], '' )"+
		"  = container.Image MERGE (k) -[:USES]-> (t)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (k:CloudResource{resource_type:'aws_ecrpublic_repository'})"+
		" MATCH (p:Node {node_id:'in-the-internet'})"+
		"   MERGE (p) -[:PUBLIC]-> (k)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_s3_bucket',"+
		" bucket_policy_is_public: true })  MATCH (p:Node {node_id:'in-the-internet'})"+
		"   MERGE (p) -[:PUBLIC]-> (n)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run(
		"MATCH (t)-[r:PUBLIC]->(k:CloudResource{resource_type:'aws_ec2_instance' } ) "+
			"MATCH (n:CloudResource{resource_type:'aws_iam_role'}) "+
			"WITH apoc.convert.fromJsonList(n.instance_profile_arns) as instance_arns,k,n "+
			"WHERE k.iam_instance_profile_arn IN instance_arns "+
			"WITH apoc.convert.fromJsonList(n.attached_policy_arns) as attached_policy_arns,k,n "+
			"UNWIND attached_policy_arns as policy_arn MATCH (z:CloudResource{resource_type:'aws_iam_policy' }) "+
			"where  z.node_id = policy_arn  WITH apoc.convert.fromJsonMap(z.policy) as policy,z,k,n "+
			"UNWIND  policy.Statement as statement unwind statement.Action as action "+
			"MATCH (c:CloudResource{resource_type:'aws_s3_bucket' } )  where action =~ '.*S3.*' "+
			"and statement.Effect <> 'Deny' and (statement.Resource = '*' or statement.Resource = c.node_id) "+
			" and (c.policy is null or NOT(c.policy =~  '.*deny.*' )) "+
			"MERGE (k) -[:COMMUNICATES]-> (c)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_lambda_function' })"+
		" WITH apoc.convert.fromJsonMap(n.policy) as policy,n UNWIND policy.Statement as pol_statement"+
		"   MATCH (p:Node {node_id:'in-the-internet'}) where"+
		" (pol_statement.Principal = '*'or pol_statement.Principal.AWS = '*')"+
		" and pol_statement.Effect = 'Allow' MERGE (p) -[:PUBLIC]-> (n)", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_s3_bucket' })"+
		" WITH apoc.convert.fromJsonMap(n.event_notification_configuration)"+
		" as eventConfig,n  UNWIND eventConfig.LambdaFunctionConfigurations"+
		" AS envconf MATCH (p:CloudResource{resource_type:'aws_lambda_function'"+
		" , arn: envconf.LambdaFunctionArn }) MERGE (p) -[:USES]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_ec2_classic_load_balancer',"+
		" scheme : 'internet_facing' }) MATCH (p:Node {node_id:'in-the-internet'})"+
		"   MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_ec2_network_load_balancer',"+
		" scheme : 'internet_facing' }) MATCH (p:Node {node_id:'in-the-internet'})"+
		"   MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_ec2_application_load_balancer',"+
		" scheme : 'internet_facing' }) MATCH (p:Node {node_id:'in-the-internet'})"+
		"   MERGE (p) -[:PUBLIC]-> (n) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_vpc_security_group_rule'})"+
		"  MATCH (m:SecurityGroup{node_id: n.group_id})"+
		" -[:SECURED]-> (z:CloudResource{resource_type:'aws_ec2_instance'})"+
		"   MERGE (k:Node {node_id:'in-the-internet'})  MERGE (k)-[:PUBLIC]->(z)",
		map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_iam_role' })"+
		" MATCH (p:CloudResource{resource_type:'aws_ec2_instance'})"+
		"   WITH apoc.convert.fromJsonList(n.instance_profile_arns)"+
		" as instance_profile_arns,p,n  WHERE p.iam_instance_profile_arn"+
		" IN instance_profile_arns MERGE (n) -[:MANAGES]-> (p) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_iam_role' })"+
		" MATCH (p:CloudResource{resource_type:'aws_iam_policy'})"+
		"   WITH apoc.convert.fromJsonList(n.attached_policy_arns)"+
		" as attached_policy_arns,p,n  WHERE p.arn IN attached_policy_arns"+
		" MERGE (n) -[:attaches]-> (p) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_iam_role' })"+
		" MATCH (p:CloudResource{resource_type:'aws_iam_policy'})"+
		"   WITH apoc.convert.fromJsonList(n.attached_policy_arns)"+
		" as attached_policy_arns,p,n  WHERE p.arn IN attached_policy_arns"+
		" MERGE (n) -[:attaches]-> (p) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_ec2_classic_load_balancer' })"+
		"  WITH apoc.convert.fromJsonList(n.instances)"+
		" as instances,n  UNWIND instances as instance"+
		" MERGE (p:CloudResource{resource_type:'aws_ec2_instance' }) "+
		"WHERE p.instance_id = instance.InstanceId"+
		" MERGE (n) -[:balances]-> (p) ", map[string]interface{}{}); err != nil {
		return err
	}

	//if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_ec2_target_group' })"+
	//	" MATCH (p:CloudResource{resource_type:'aws_ec2_application_load_balancer' }) "+
	//	"MATCH (k:CloudResource{resource_type:'aws_ec2_instance' }) "+
	//	" WITH apoc.convert.fromJsonList(n.load_balancer_arns) as load_balancer_arns, "+
	//	"apoc.convert.fromJsonList(n.target_health_descriptions) as health_descriptions ,load_balancer_arns,n,p,k"+
	//	" WHERE p.arn  in load_balancer_arns and "+
	//	" MERGE (n) -[:balances]-> (p) ", map[string]interface{}{}); err != nil {
	//	return err
	//}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_iam_role' })"+
		" MATCH (p:CloudResource{resource_type:'aws_iam_policy'})"+
		"   WITH apoc.convert.fromJsonList(n.inline_policies_std) as inline_policies_std,p,n"+
		"   UNWIND inline_policies_std as policy MERGE (p:CloudResource{resource_type:'inline_policy',"+
		" policy: policy.PolicyName , arn: apoc.text.random(10, \"A-Z0-9.$\") })"+
		"  MERGE (n) -[:inline]-> (p) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_iam_group' })"+
		"   WITH apoc.convert.fromJsonList(n.users) as users,n"+
		"   UNWIND users as user MERGE (k:CloudResource{resource_type:'aws_iam_user', user_id: user.UserId})"+
		"  MERGE (n) -[:groups]-> (k) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_iam_user' })"+
		"  MATCH (o:CloudResource{resource_type:'aws_iam_policy' })"+
		"   WITH apoc.convert.fromJsonList(n.user_groups) as groups,n,o,p"+
		"   UNWIND groups as group MERGE (k:CloudResource{resource_type:'aws_iam_group', arn: group.Arn })"+
		" WITH apoc.convert.fromJsonList(k.attached_policy_arns) as attached_policy_arns,n,o,p,k"+
		"  WHERE o.arn IN attached_policy_arns MERGE (n) -[:attaches]-> (o) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_iam_user' })"+
		"  MATCH (o:CloudResource{resource_type:'aws_iam_policy' })"+
		"   WITH apoc.convert.fromJsonList(n.user_groups) as groups,n,o,p"+
		"   UNWIND groups as group MERGE (k:CloudResource{resource_type:'aws_iam_group',"+
		" arn: group.Arn  }) WITH apoc.convert.fromJsonList(k.inline_policies_std)"+
		" as inline,n  UNWIND inline as policy MERGE"+
		" (k:CloudResource{resource_type:'inline_policy',"+
		" policy: policy.PolicyName , arn: apoc.text.random(10, \"A-Z0-9.$\") })"+
		"  MERGE (n) -[:inline]-> (k)  ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_iam_user' })"+
		"  MATCH (o:CloudResource{resource_type:'aws_iam_policy' })"+
		"   WITH apoc.convert.fromJsonList(n.attached_policy_arns)"+
		" as attached_policy_arns,n,o WHERE o.arn IN attached_policy_arns"+
		" MERGE (n) -[:attaches]-> (o) ", map[string]interface{}{}); err != nil {
		return err
	}

	if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'aws_iam_user' })  MATCH (o:CloudResource{resource_type:'aws_iam_policy' })   WITH apoc.convert.fromJsonList(n.inline_policies_std) as inline,n  UNWIND inline as policy MERGE (k:CloudResource{resource_type:'inline_policy', policy: policy.PolicyName , arn: apoc.text.random(10, \"A-Z0-9.$\") })  MERGE (n) -[:inline]-> (k) ", map[string]interface{}{}); err != nil {
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

	//if _, err = tx.Run("MATCH (n:CloudResource{resource_type:'gcp_cloudfunctions_function', ingress_settings: 'ALLOW_ALL' })    MERGE (p:Node {node_id:'in-the-internet'}) MERGE (p) -[:PUBLIC]-> (n)) where ", map[string]interface{}{}); err != nil {
	//	return err
	//}

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

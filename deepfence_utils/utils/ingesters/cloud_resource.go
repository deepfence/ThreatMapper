package ingesters

import (
	"encoding/json"
	"fmt"
	"strings"
)

var (
	TopologyCloudResourceTypes = []string{
		// AWS specific types
		"aws_ec2_instance", "aws_eks_cluster", "aws_s3_bucket", "aws_lambda_function",
		"aws_ecs_task", "aws_ecs_cluster", "aws_ecr_repository", "aws_ecrpublic_repository",
		"aws_ecs_task", "aws_rds_db_instance", "aws_rds_db_cluster", "aws_ec2_application_load_balancer",
		"aws_ec2_classic_load_balancer", "aws_ec2_network_load_balancer",
		// GCP specific types
		"gcp_compute_instance", "gcp_sql_database_instance", "gcp_storage_bucket", "gcp_compute_disk",
		// Azure specific types
		"azure_compute_virtual_machine", "azure_app_service_function_app", "azure_storage_queue",
		"azure_storage_table", "azure_storage_container",
	}
)

type CloudResource struct {
	AccountID                      string           `json:"account_id"`
	Arn                            string           `json:"arn"`
	BlockPublicAcls                bool             `json:"block_public_acls,omitempty"`
	BlockPublicPolicy              bool             `json:"block_public_policy,omitempty"`
	BucketPolicyIsPublic           bool             `json:"bucket_policy_is_public,omitempty"`
	CloudProvider                  string           `json:"cloud_provider,omitempty"`
	ClusterArn                     string           `json:"cluster_arn,omitempty"`
	ClusterName                    string           `json:"cluster_name,omitempty"`
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
	DDClusterIDentifier            string           `json:"db_cluster_identifier,omitempty"`
	Connectivity                   string           `json:"connectivity,omitempty"`
	Group                          string           `json:"group,omitempty"`
	ServiceName                    string           `json:"service_name,omitempty"`
	TaskArn                        string           `json:"task_arn,omitempty"`
	TaskDefinitionArn              string           `json:"task_definition_arn,omitempty"`
	LastStatus                     string           `json:"last_status"`
	VpcID                          string           `json:"vpc_id,omitempty"`
	AllowBlobPublicAccess          bool             `json:"allow_blob_public_access,omitempty"`
	PublicAccess                   string           `json:"public_access,omitempty"`
	GroupID                        string           `json:"group_id,omitempty"`
	CidrIpv4                       string           `json:"cidr_ipv4,omitempty"`
	PublicNetworkAccess            string           `json:"public_network_access,omitempty"`
	StorageAccountName             string           `json:"storage_account_name,omitempty"`
	IamInstanceProfileArn          string           `json:"iam_instance_profile_arn,omitempty"`
	IamInstanceProfileID           string           `json:"iam_instance_profile_id,omitempty"`
	PublicIPAddress                string           `json:"public_ip_address"`
	PrivateIPAddress               string           `json:"private_ip_address,omitempty"`
	InstanceType                   string           `json:"instance_type,omitempty"`
	PrivateDNSName                 string           `json:"private_dns_name,omitempty"`
	Tags                           *json.RawMessage `json:"tags,omitempty"`
	PolicyStd                      *json.RawMessage `json:"policy_std,omitempty"`
	Containers                     *json.RawMessage `json:"containers,omitempty"`
	TaskDefinition                 *json.RawMessage `json:"task_definition,omitempty"`
	VpcOptions                     *json.RawMessage `json:"vpc_options,omitempty"`
	Policy                         *json.RawMessage `json:"policy,omitempty"`
	PublicIps                      *json.RawMessage `json:"public_ips,omitempty"`
	NetworkInterfaces              *json.RawMessage `json:"network_interfaces,omitempty"`
	IamPolicy                      *json.RawMessage `json:"iam_policy,omitempty"`
	IPConfiguration                *json.RawMessage `json:"ip_configuration,omitempty"`
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
	UserID                         string           `json:"user_id"`
	AccessLevel                    string           `json:"access_level"`
	Action                         string           `json:"action"`
	Description                    string           `json:"description"`
	Privilege                      string           `json:"privilege"`
	OrganizationID                 string           `json:"organization_id"`
	OrganizationMasterAccountArn   string           `json:"organization_master_account_arn"`
	OrganizationMasterAccountEmail string           `json:"organization_master_account_email"`
	TargetHealthDescriptions       *json.RawMessage `json:"target_health_descriptions"`
	InstanceProfileArns            *json.RawMessage `json:"instance_profile_arns"`
	Instances                      *json.RawMessage `json:"instances"`
	TargetGroupArn                 string           `json:"target_group_arn"`
	VpcSecurityGroupIDs            *json.RawMessage `json:"vpc_security_group_ids"`
	Users                          *json.RawMessage `json:"users"`
	UserGroups                     *json.RawMessage `json:"user-groups"`
	ResourcesVpcConfig             *json.RawMessage `json:"resources_vpc_config"`
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
	bb = convertStructFieldToJSONString(bb, "tags")

	if strings.Contains(bb["resource_id"].(string), "azure") {
		if bb["resource_id"].(string) == "azure_compute_virtual_machine" {
			bb["node_id"] = bb["vm_id"]
		} else {
			bb["node_id"] = bb["name"]
		}
	} else {
		switch {
		case bb["arn"] != nil:
			bb["node_id"] = bb["arn"]
		case bb["id"] != nil:
			bb["node_id"] = bb["id"]
		case bb["resource_id"] != nil:
			bb["node_id"] = bb["resource_id"]
		default:
			bb["node_id"] = "error"
		}
	}
	accountID, present := bb["account_id"]
	if present {
		splits := strings.Split(fmt.Sprintf("%v", accountID), "-")
		if len(splits) > 2 {
			bb["cloud_provider"] = splits[2]
		}
	}

	bb["node_type"] = bb["resource_id"]
	cloudRegion := "global"
	if v, has := bb["region"]; has && v != nil {
		cloudRegion = v.(string)
	}
	bb["cloud_region"] = cloudRegion
	bb["node_name"] = bb["name"]

	return bb, nil
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

type CloudResourceRefreshStatus struct {
	CloudNodeID     string `json:"cloud_node_id"`
	RefreshMessage  string `json:"refresh_message"`
	RefreshStatus   string `json:"refresh_status"`
	RefreshMetadata string `json:"refresh_metadata"`
	UpdatedAt       int64  `json:"updated_at"`
}

func (c *CloudResourceRefreshStatus) ToMap() map[string]interface{} {
	return map[string]interface{}{
		"cloud_node_id":    c.CloudNodeID,
		"refresh_message":  c.RefreshMessage,
		"refresh_status":   c.RefreshStatus,
		"refresh_metadata": c.RefreshMetadata,
		"updated_at":       c.UpdatedAt,
	}
}

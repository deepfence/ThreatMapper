from config.app import celery_app, app as flask_app
from config.redisconfig import redis
from utils.neo4j import Neo4jGraph
from utils.scope import fetch_topology_data
from utils.esconn import ESConn
from utils.helper import get_topology_network_graph, get_recent_scan_ids, split_list_into_chunks
from utils.constants import CLOUD_RESOURCES_CACHE_KEY, NODE_TYPE_HOST, NODE_TYPE_CONTAINER, CLOUD_AWS, CLOUD_GCP, \
    CLOUD_AZURE, THREAT_GRAPH_CACHE_KEY, THREAT_GRAPH_NODE_DETAIL_KEY, CSPM_RESOURCE_LABELS, NODE_TYPE_LABEL, \
    CSPM_RESOURCES, ES_MAX_CLAUSE, CVE_INDEX, COMPLIANCE_INDEX, CLOUD_COMPLIANCE_LOGS_INDEX, SECRET_SCAN_LOGS_INDEX, \
    TIME_UNIT_MAPPING, ES_TERMS_AGGR_SIZE, CVE_SCAN_LOGS_INDEX, COMPLIANCE_LOGS_INDEX, CLOUD_COMPLIANCE_INDEX, \
    SECRET_SCAN_INDEX, CLOUD_TOPOLOGY_COUNT
import networkx as nx
from collections import defaultdict
import json
import requests
import arrow

incoming_internet_host_id = "in-theinternet"
outgoing_internet_host_id = "out-theinternet"
pvt_cloud = "others"  # other cloud, non cloud
CLOUD_PROVIDERS = [CLOUD_AWS, CLOUD_GCP, CLOUD_AZURE]
ALL_CLOUD_PROVIDERS = [CLOUD_AWS, CLOUD_GCP, CLOUD_AZURE, pvt_cloud]
# Get vulnerabilities, compliance mis-config in the past 90 days
number = 90
time_unit = "d"


@celery_app.task
def compute_threat_graph():
    with flask_app.app_context():
        _compute_threat_graph()


def compute_aws_cloud_network_graph(cloud_resources, graph, include_nodes):
    if not cloud_resources:
        return graph
    security_groups = {}
    security_group_resource_map = {}
    security_group_rds_map = {}
    lamda_function_map = {}
    vpc_definitions = []
    taskdefarns = {}
    for cloud_resource in cloud_resources:
        if cloud_resource["arn"] not in include_nodes:
            continue
        if cloud_resource["id"] == "aws_ecr_repository":
            if not cloud_resource["policy"]:
                continue
            if not cloud_resource["policy"]["Statement"]:
                continue
            for statement in cloud_resource["policy"]["Statement"]:
                if 'Principal' in statement:
                    if 'AWS' in statement['Principal']:
                        if statement['Effect'] == "Allow" and ("*" in statement['Principal']['AWS']):
                            if not graph.has_node(cloud_resource['arn']):
                                graph.add_node(cloud_resource['arn'], name=cloud_resource["repository_uri"],
                                               node_type=cloud_resource["id"])
                            if not graph.has_edge(incoming_internet_host_id, cloud_resource['arn']):
                                graph.add_edge(incoming_internet_host_id, cloud_resource['arn'])
        if cloud_resource["id"] == "aws_ecrpublic_repository":
            if not graph.has_node(cloud_resource["arn"]):
                graph.add_node(cloud_resource["arn"], name=cloud_resource["repository_uri"],
                               node_type=cloud_resource["id"])
            if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
    for cloud_resource in cloud_resources:
        if cloud_resource["id"] == "aws_vpc_security_group_rule":
            security_groups[cloud_resource.get("group_id")] = cloud_resource
        if cloud_resource["id"] == "aws_eks_cluster":
            if cloud_resource["arn"] not in include_nodes:
                continue
            if cloud_resource["resources_vpc_config"] is not None:
                if cloud_resource["resources_vpc_config"]["EndpointPublicAccess"] == "true":
                    if not graph.has_node(cloud_resource["arn"]):
                        graph.add_node(cloud_resource["arn"], name=cloud_resource["name"],
                                       node_type=cloud_resource["id"])
                    if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                        graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
        if cloud_resource["id"] == "aws_ecs_task_definition":
            if cloud_resource["network_mode"] == "awsvpc":
                vpc_definitions.append(cloud_resource["task_definition_arn"])
            for container_def in cloud_resource["container_definitions"]:
                if container_def["Image"] is not None:
                    if graph.has_node(container_def["Image"]):
                        if cloud_resource["arn"] not in taskdefarns:
                            taskdefarns[cloud_resource["arn"]] = container_def["Image"]
                        elif isinstance(taskdefarns[cloud_resource["arn"]], list):
                            taskdefarns[cloud_resource["arn"]].append(container_def["Image"])
                        else:
                            taskdefarns[cloud_resource["arn"]] = [taskdefarns[cloud_resource["arn"]],
                                                                  container_def["Image"]]
        if cloud_resource["id"] == "aws_s3_bucket":
            if cloud_resource["arn"] not in include_nodes:
                continue
            if cloud_resource["bucket_policy_is_public"] is True:
                if not graph.has_node(cloud_resource["arn"]):
                    graph.add_node(cloud_resource["arn"], name=cloud_resource["name"], node_type=cloud_resource["id"])
                if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                    graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
            if cloud_resource["event_notification_configuration"] is not None:
                if cloud_resource["event_notification_configuration"]["LambdaFunctionConfigurations"] is not None:
                    for configuration in cloud_resource["event_notification_configuration"][
                        "LambdaFunctionConfigurations"]:
                        if configuration["LambdaFunctionArn"] is not None:
                            lambda_function = configuration["LambdaFunctionArn"]
                            if lambda_function not in lamda_function_map:
                                lamda_function_map[lambda_function] = cloud_resource["arn"]
                            elif isinstance(lambda_function, list):
                                lamda_function_map[lambda_function].append(cloud_resource["arn"])
                            else:
                                lamda_function_map[lambda_function] = [lamda_function_map[lambda_function],
                                                                       cloud_resource["arn"]]
        elif cloud_resource["id"] in ["aws_ec2_classic_load_balancer", "aws_ec2_application_load_balancer",
                                      "aws_ec2_network_load_balancer"]:
            if cloud_resource["arn"] not in include_nodes:
                continue
            if cloud_resource["scheme"] == "internet-facing":
                if not graph.has_node(cloud_resource["arn"]):
                    graph.add_node(cloud_resource["arn"], name=cloud_resource["name"], node_type=cloud_resource["id"])
                if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                    graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
    publicly_accessible_services = []
    for cloud_resource in cloud_resources:
        if cloud_resource["id"] == "aws_ec2_instance":
            host_name = cloud_resource["name"] + ";<host>"
            if (cloud_resource["arn"] not in include_nodes) and (host_name not in include_nodes) and (
                    cloud_resource["name"] not in include_nodes):
                continue
            for sec_group in cloud_resource["security_groups"]:
                if sec_group["GroupId"] not in security_group_resource_map:
                    security_group_resource_map[sec_group["GroupId"]] = host_name
                elif isinstance(security_group_resource_map[sec_group["GroupId"]], list):
                    security_group_resource_map[sec_group["GroupId"]].append(host_name)
                else:
                    security_group_resource_map[sec_group["GroupId"]] = [
                        security_group_resource_map[sec_group["GroupId"]], host_name]
                if security_groups[sec_group["GroupId"]]["is_egress"]:
                    if security_groups[sec_group["GroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
                        if not graph.has_node(host_name):
                            graph.add_node(host_name, name=cloud_resource["name"], node_type=NODE_TYPE_HOST,
                                           cloud_id=cloud_resource["arn"])
                        if not graph.has_edge(host_name, outgoing_internet_host_id):
                            graph.add_edge(host_name, outgoing_internet_host_id)
                else:
                    if security_groups[sec_group["GroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
                        if not graph.has_node(host_name):
                            graph.add_node(host_name, name=cloud_resource["name"], node_type=NODE_TYPE_HOST,
                                           cloud_id=cloud_resource["arn"])
                        if not graph.has_edge(incoming_internet_host_id, host_name):
                            graph.add_edge(incoming_internet_host_id, host_name)
        if cloud_resource["id"] == "aws_ecs_service":
            if cloud_resource["arn"] not in include_nodes:
                continue
            if cloud_resource["task_definition"] in vpc_definitions:
                if 'network_configuration' in cloud_resource:
                    if cloud_resource["network_configuration"] is not None:
                        if cloud_resource["network_configuration"]["AwsvpcConfiguration"] is not None:
                            if cloud_resource["network_configuration"]["AwsvpcConfiguration"]["AssignPublicIp"] \
                                    == 'ENABLED':
                                publicly_accessible_services.append(cloud_resource["service_name"])
        if cloud_resource["id"] == "aws_opensearch_domain":
            if cloud_resource["arn"] not in include_nodes:
                continue
            if cloud_resource["vpc_options"] is None:
                if not graph.has_node(cloud_resource["arn"]):
                    graph.add_node(cloud_resource["arn"], name=cloud_resource["domain_name"],
                                   node_type=cloud_resource["id"])
                if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                    graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
        if cloud_resource["id"] == "aws_rds_db_instance":
            if cloud_resource["arn"] not in include_nodes:
                continue
            db_instance = cloud_resource["arn"]
            if cloud_resource["publicly_accessible"] is True:
                if not graph.has_node(db_instance):
                    graph.add_node(db_instance, name=cloud_resource["name"], node_type=cloud_resource["id"])
                if not graph.has_edge(incoming_internet_host_id, db_instance):
                    graph.add_edge(incoming_internet_host_id, db_instance)
            for sec_group in cloud_resource["vpc_security_groups"]:
                sg_id = sec_group["VpcSecurityGroupId"]
                if sg_id not in security_group_rds_map:
                    security_group_rds_map[sg_id] = db_instance
                elif isinstance(security_group_resource_map[sg_id], list):
                    security_group_rds_map[sg_id].append(db_instance)
                else:
                    security_group_rds_map[sg_id] = [
                        security_group_rds_map[sg_id], db_instance]
                if security_groups[sec_group["VpcSecurityGroupId"]]["is_egress"]:
                    if security_groups[sec_group["VpcSecurityGroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
                        if not graph.has_node(db_instance):
                            graph.add_node(db_instance, name=cloud_resource["name"], node_type=cloud_resource["id"])
                else:
                    if security_groups[sec_group["VpcSecurityGroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
                        if not graph.has_node(db_instance):
                            graph.add_node(db_instance, name=cloud_resource["name"], node_type=cloud_resource["id"])
                        if not graph.has_edge(incoming_internet_host_id, db_instance):
                            graph.add_edge(incoming_internet_host_id, db_instance)
    for cloud_resource in cloud_resources:
        if cloud_resource["id"] == "aws_rds_db_cluster":
            if cloud_resource["arn"] not in include_nodes:
                continue
            db_cluster = cloud_resource["db_cluster_identifier"] + ";<db>"
            for sec_group in cloud_resource["vpc_security_groups"]:
                if security_groups[sec_group["VpcSecurityGroupId"]]["is_egress"]:
                    if security_groups[sec_group["VpcSecurityGroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
                        if not graph.has_node(db_cluster):
                            graph.add_node(db_cluster, name=cloud_resource["name"], node_type=cloud_resource["id"])
                        if not graph.has_edge(db_cluster, outgoing_internet_host_id):
                            graph.add_edge(db_cluster, outgoing_internet_host_id)
                        for instance in cloud_resource["members"]:
                            instance_id = instance["DBInstanceIdentifier"] + ";<db>"
                            if not graph.has_edge(db_cluster, instance_id):
                                graph.add_edge(db_cluster, outgoing_internet_host_id)
                else:
                    if security_groups[sec_group["VpcSecurityGroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
                        if not graph.has_node(db_cluster):
                            graph.add_node(db_cluster, name=cloud_resource["name"], node_type=cloud_resource["id"])
                        if not graph.has_edge(incoming_internet_host_id, db_cluster):
                            graph.add_edge(incoming_internet_host_id, db_cluster)
                        for instance in cloud_resource["members"]:
                            db_instance_id = instance["DBInstanceIdentifier"] + ";<db>"
                            if not graph.has_edge(db_cluster, db_instance_id):
                                graph.add_edge(db_cluster, outgoing_internet_host_id)
        # check compute to compute mapping
        if cloud_resource["id"] == "aws_ec2_instance":
            host_name = cloud_resource["name"] + ";<host>"
            if (cloud_resource["arn"] not in include_nodes) and (host_name not in include_nodes) and (
                    cloud_resource["name"] not in include_nodes):
                continue
            for sec_group in cloud_resource["security_groups"]:
                if not security_groups[sec_group["GroupId"]]["is_egress"]:
                    if security_groups[sec_group["GroupId"]]["cidr_ipv4"] in list(security_group_resource_map.keys()):
                        if isinstance(security_group_resource_map[sec_group["GroupId"]], str):
                            if not graph.has_edge(security_group_resource_map[sec_group["GroupId"]], host_name):
                                graph.add_edge(security_group_resource_map[sec_group["GroupId"]], host_name)
                        if isinstance(security_group_resource_map[sec_group["GroupId"]], list):
                            for host in security_group_resource_map[sec_group["GroupId"]]:
                                if not graph.has_edge(host, host_name):
                                    graph.add_edge(host, host_name)
                    if security_groups[sec_group["GroupId"]]["cidr_ipv4"] in list(security_group_rds_map.keys()):
                        if isinstance(security_group_rds_map[sec_group["GroupId"]], str):
                            if not graph.has_edge(security_group_rds_map[sec_group["GroupId"]], host_name):
                                graph.add_edge(security_group_rds_map[sec_group["GroupId"]], host_name)
                        if isinstance(security_group_rds_map[sec_group["GroupId"]], list):
                            for db in security_group_rds_map[sec_group["GroupId"]]:
                                if not graph.has_edge(db, host_name):
                                    graph.add_edge(db, host_name)
        if cloud_resource["id"] == "aws_ecs_task":
            if cloud_resource["arn"] not in include_nodes:
                continue
            if cloud_resource["service_name"] in publicly_accessible_services or \
                    any(ser in cloud_resource['group'] for ser in publicly_accessible_services):
                if not graph.has_node(cloud_resource["arn"]):
                    graph.add_node(cloud_resource["arn"], name=cloud_resource["name"], node_type=cloud_resource["id"])
                if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                    graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
                if cloud_resource["task_definition_arn"] in list(taskdefarns.keys()):
                    if isinstance(taskdefarns[cloud_resource["task_definition_arn"]], str):
                        if not graph.has_edge(taskdefarns[cloud_resource["task_definition_arn"]],
                                              cloud_resource["arn"]):
                            graph.add_edge(taskdefarns[cloud_resource["task_definition_arn"]], cloud_resource["arn"])
                        if isinstance(taskdefarns[cloud_resource["task_definition_arn"]], list):
                            for ecr in taskdefarns[cloud_resource["task_definition_arn"]]:
                                if not graph.has_edge(ecr, cloud_resource["arn"]):
                                    graph.add_edge(ecr, cloud_resource["arn"])
        if cloud_resource["id"] == "aws_lambda_function":
            if cloud_resource["arn"] not in include_nodes:
                continue
            lambda_fun = cloud_resource["arn"]
            if not cloud_resource.get("policy_std"):
                continue
            for statement in cloud_resource["policy_std"]["Statement"]:
                if 'Principal' in statement:
                    if 'AWS' in statement['Principal']:
                        if statement['Effect'] == "Allow" and (
                                "*" in statement['Principal']['AWS']):
                            if not graph.has_node(lambda_fun):
                                graph.add_node(lambda_fun, name=cloud_resource["name"], node_type=cloud_resource["id"])
                            if not graph.has_edge(incoming_internet_host_id, lambda_fun):
                                graph.add_edge(incoming_internet_host_id, lambda_fun)
                    if lambda_fun in lamda_function_map:
                        if isinstance(lamda_function_map[lambda_fun], str):
                            if not graph.has_node(lamda_function_map[lambda_fun]):
                                graph.add_node(lamda_function_map[lambda_fun], name=lamda_function_map[lambda_fun],
                                               node_type="aws_s3_bucket")
                            if not graph.has_edge(lambda_fun, lamda_function_map[lambda_fun]):
                                graph.add_edge(lambda_fun, lamda_function_map[lambda_fun])
                        if isinstance(lamda_function_map[lambda_fun], list):
                            for bucket in lamda_function_map[lambda_fun]:
                                if (not graph.has_node(bucket)):
                                    graph.add_node(bucket, name=bucket, node_type="aws_s3_bucket")
                                if not graph.has_edge(lambda_fun, bucket):
                                    graph.add_edge(lambda_fun, bucket)
    return graph


def compute_gcp_cloud_network_graph(cloud_resources, graph, include_nodes):
    if not cloud_resources:
        return graph
    for cloud_resource in cloud_resources:
        if cloud_resource["resource_id"] == "gcp_compute_instance":
            host_name = cloud_resource["name"] + ";<host>"
            if (cloud_resource["arn"] not in include_nodes) and (host_name not in include_nodes) and (
                    cloud_resource["name"] not in include_nodes):
                continue
        else:
            if cloud_resource.get("arn") not in include_nodes:
                continue
        if cloud_resource["resource_id"] == "gcp_compute_instance":
            host_name = cloud_resource["name"] + ";<host>"
            if "network_interfaces" in cloud_resource:
                for network_interface in cloud_resource["network_interfaces"]:
                    if "accessConfigs" in network_interface:
                        for config in network_interface["accessConfigs"]:
                            if config.get("natIP"):
                                if not graph.has_node(host_name):
                                    graph.add_node(host_name, name=cloud_resource["name"],
                                                   cloud_id=cloud_resource["arn"], node_type=NODE_TYPE_HOST)
                                if not graph.has_edge(incoming_internet_host_id, host_name):
                                    graph.add_edge(incoming_internet_host_id, host_name)
        if cloud_resource["resource_id"] == "gcp_storage_bucket":
            if "iam_policy" in cloud_resource:
                if "bindings" in cloud_resource["iam_policy"]:
                    for binding in cloud_resource["iam_policy"]["bindings"]:
                        if "allAuthenticatedUsers" in binding or "allUsers" in binding:
                            if not graph.has_node(cloud_resource["arn"]):
                                graph.add_node(cloud_resource["arn"], name=cloud_resource["name"],
                                               node_type=cloud_resource["resource_id"])
                            if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                                graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
                            continue
        if cloud_resource["resource_id"] == "gcp_sql_database_instance":
            if "ip_configuration" in cloud_resource:
                if "authorizedNetworks" in cloud_resource["ip_configuration"]:
                    for network in cloud_resource["ip_configuration"]["authorizedNetworks"]:
                        if network["value"] == '0.0.0.0/0':
                            if not graph.has_node(cloud_resource["arn"]):
                                graph.add_node(cloud_resource["arn"], name=cloud_resource["name"],
                                               node_type=cloud_resource["resource_id"])
                            if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                                graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
        if cloud_resource["resource_id"] == "gcp_cloudfunctions_function":
            if "ingress_settings" in cloud_resource:
                if cloud_resource["ingress_settings"] == "ALLOW_ALL":
                    if not graph.has_node(cloud_resource["arn"]):
                        graph.add_node(cloud_resource["arn"], name=cloud_resource["name"],
                                       node_type=cloud_resource["resource_id"])
                    if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                        graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
    return graph


def compute_azure_cloud_network_graph(cloud_resources, graph, include_nodes):
    if not cloud_resources:
        return graph
    for cloud_resource in cloud_resources:
        if "resource_id" in cloud_resource:
            if cloud_resource["arn"] not in include_nodes:
                continue
            if cloud_resource["resource_id"] == "azure_storage_account":
                if cloud_resource["allow_blob_public_access"]:
                    if not graph.has_node(cloud_resource["resource_id"]):
                        graph.add_node(cloud_resource["arn"], name=cloud_resource["name"],
                                       node_type=cloud_resource["resource_id"])
                    if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                        graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
            elif cloud_resource["resource_id"] == "azure_storage_blob" \
                    or cloud_resource["resource_id"] == "azure_storage_table" \
                    or cloud_resource["resource_id"] == "azure_log_profile":
                if graph.has_node(cloud_resource["storage_account_name"]):
                    if not graph.has_node(cloud_resource["arn"]):
                        graph.add_node(cloud_resource["arn"], name=cloud_resource["name"],
                                       node_type=cloud_resource["resource_id"])
                    if not graph.has_edge(cloud_resource["storage_account_name"], cloud_resource["arn"]):
                        graph.add_edge(cloud_resource["storage_account_name"], cloud_resource["arn"])
            elif cloud_resource["resource_id"] == "azure_mysql_server":
                if cloud_resource["public_network_access"] is not None:
                    if cloud_resource["public_network_access"] == "Enabled":
                        if not graph.has_node(cloud_resource["arn"]):
                            graph.add_node(cloud_resource["arn"], name=cloud_resource["name"],
                                           node_type=cloud_resource["resource_id"])
                        if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                            graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
            elif cloud_resource["resource_id"] == "azure_storage_container":
                if cloud_resource["public_access"] is not None:
                    if not graph.has_node(cloud_resource["arn"]):
                        graph.add_node(cloud_resource["arn"], name=cloud_resource["name"],
                                       node_type=cloud_resource["resource_id"])
                    if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                        graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
        if "vm_id" in cloud_resource:
            host_name = cloud_resource["name"] + ";<host>"
            if (cloud_resource["arn"] not in include_nodes) and (host_name not in include_nodes) and (
                    cloud_resource["name"] not in include_nodes):
                continue
            if cloud_resource["public_ips"]:
                if not graph.has_node(host_name):
                    graph.add_node(host_name, name=cloud_resource["name"], cloud_id=cloud_resource["arn"],
                                   node_type=NODE_TYPE_HOST)
                if not graph.has_edge(incoming_internet_host_id, host_name):
                    graph.add_edge(incoming_internet_host_id, host_name)
    return graph


def get_mis_config_count(index_name, logs_index_name, aggs_field):
    recent_scan_ids = get_recent_scan_ids(logs_index_name, number, time_unit, None)
    if not recent_scan_ids:
        return {}
    mis_config_count = defaultdict(dict)
    recent_scan_id_chunks = split_list_into_chunks(recent_scan_ids, ES_MAX_CLAUSE)
    for scan_id_chunk in recent_scan_id_chunks:
        filters = {"masked": False, "scan_id": scan_id_chunk}
        if index_name == CLOUD_COMPLIANCE_INDEX:
            filters["status"] = "alarm"
        elif index_name == COMPLIANCE_INDEX:
            filters["status"] = "warn"
        aggs = {
            aggs_field: {
                "terms": {"field": aggs_field + ".keyword", "size": ES_TERMS_AGGR_SIZE},
                "aggs": {"scan_id": {"terms": {"field": "scan_id.keyword", "size": ES_TERMS_AGGR_SIZE}}}
            }
        }
        aggs_response = ESConn.aggregation_helper(
            index_name, filters, aggs, number, TIME_UNIT_MAPPING.get(time_unit), None)
        for bkt in aggs_response.get("aggregations", {}).get(aggs_field, {}).get("buckets", []):
            if not bkt["scan_id"]["buckets"]:
                continue
            for scan_bkt in bkt["scan_id"]["buckets"]:
                if mis_config_count[bkt["key"]]:
                    mis_config_count[bkt["key"]]["scan_id"][scan_bkt["key"]] = index_name
                    mis_config_count[bkt["key"]]["count"] += scan_bkt["doc_count"]
                else:
                    mis_config_count[bkt["key"]] = {
                        "scan_id": {scan_bkt["key"]: index_name}, "count": scan_bkt["doc_count"]}
    return mis_config_count


def get_vulnerability_count():
    return get_mis_config_count(CVE_INDEX, CVE_SCAN_LOGS_INDEX, "cve_container_image")


def get_compliance_count():
    return get_mis_config_count(COMPLIANCE_INDEX, COMPLIANCE_LOGS_INDEX, "node_id")


def get_cloud_compliance_count():
    return get_mis_config_count(CLOUD_COMPLIANCE_INDEX, CLOUD_COMPLIANCE_LOGS_INDEX, "resource")


def get_secrets_count():
    return get_mis_config_count(SECRET_SCAN_INDEX, SECRET_SCAN_LOGS_INDEX, "node_id")

def internet_node_id(cp):
    if cp == CLOUD_AWS:
        return incoming_internet_host_id+str(0)
    elif cp == CLOUD_AZURE:
        return incoming_internet_host_id+str(1)
    elif cp == CLOUD_GCP:
        return incoming_internet_host_id+str(2)
    else:
        return incoming_internet_host_id+str(3)

def add_node_neo4j(neo4jg, node_id, node_details):
    id_type = node_id.split(';')
    if len(id_type) != 2 or id_type[1] == "":
        node_type = ""
    else:
        node_type = id_type[1][1:-1]

    cp = ""
    for metadata in node_details.get("metadata", []):
        if metadata["id"] == "cloud_provider":
            cp = metadata["value"]
            break
    if cp not in CLOUD_PROVIDERS:
        cp = pvt_cloud
    if cp == CLOUD_GCP:
        cp = CLOUD_GCP

    if id_type[0] == incoming_internet_host_id:
        for cp in ALL_CLOUD_PROVIDERS:
            neo4jg.add_host_entry({'node_id': internet_node_id(cp), 'node_type': node_type, 'cloud_provider':  cp, 'depth': 0})
    else:
        neo4jg.add_host_entry({'node_id': id_type[0], 'node_type': node_type, 'cloud_provider':  cp})
    for node in node_details.get("adjacency", []):
        node_id = node.split(';')[0]
        if id_type[0] == incoming_internet_host_id:
            for cp in ALL_CLOUD_PROVIDERS:
                neo4jg.add_connection_entry(internet_node_id(cp), node_id)
        else:
            neo4jg.add_connection_entry(id_type[0], node_id)

def get_attack_paths_neo4j(neo4jg):
    all = {}
    providers = [CLOUD_AWS, CLOUD_AZURE, CLOUD_GCP, pvt_cloud]
    aggreg = neo4jg.compute_threat_graph(providers)

    host_id = 0
    container_id = 0
    infos = {}
    for cp in providers:
        tree = aggreg[cp][0]
        data = aggreg[cp][1]
        depths = aggreg[cp][2]
        root = depths[0].pop()
        graphs = []
        while root:
            visited = set()
            attack_paths = build_attack_paths(tree, data, root, visited)
            info = attack_paths_to_nodes_info(attack_paths, data, cp, host_id, container_id)
            for k in info:
                infos[info[k]['id']] = info[k]
            graph = attack_paths_to_graph(attack_paths, info)
            for g in graph:
                graphs.append(g)
            if len(depths[0]) == 0:
                break
            root = depths[0].pop()
        all[cp] = graphs
    return all, infos

def build_attack_paths(tree, data, root, visited):
    if root in visited:
        return []
    visited.add(root)
    if not root or root not in data:
        return []
    if not tree.get(root):
        return [[root]]
    paths = []
    for edge in tree.get(root):
        edge_paths = build_attack_paths(tree, data, edge, visited)
        for edge_path in edge_paths:
            edge_path.insert(0, root)
            paths.append(edge_path)
    if len(paths) == 0:
        return [[root]]
    return paths

def attack_paths_to_nodes_info(attack_paths, data, cp, host_id, container_id):
    nodes_info = {}
    visited = set()
    for attack_path in attack_paths:
        for i in range(0, len(attack_path)):
            node_id = attack_path[i]
            if node_id in visited:
                continue
            visited.add(node_id)
            entry = {}
            node = data[node_id]
            if node[0] == 'host':
                entry['label'] = 'Compute Instance'
                entry['id'] = cp+"-host-"+str(host_id)
                host_id += 1
            elif node[0] == 'container':
                entry['label'] = 'Container'
                entry['id'] = cp+"-container-"+str(container_id)
                container_id += 1
            else:
                entry['name'] = "The Internet"
                entry['id'] = "The Internet"

            entry['count'] = node[3]
            entry['vulnerability_count'] = node[1]
            entry['secrets_count'] = node[7]
            entry['compliance_count'] = node[9]
            entry['node_type'] = node[0]
            internal_nodes = {}
            for i in range(0, len(node[5])):
                internal_node = node[5][i]
                internal_node_cve = node[6][i] if node[6] and i < len(node[6]) else 0
                internal_node_secrets = node[8][i] if node[8] and i < len(node[8]) else 0
                internal_node_compliance = node[10][i] if node[10] and i < len(node[10]) else 0
                internal_nodes[internal_node] = {}
                internal_nodes[internal_node]["node_id"] = ""
                internal_nodes[internal_node]["image_name"] = ""
                internal_nodes[internal_node]["name"] = internal_node
                internal_nodes[internal_node]["vulnerability_count"] = internal_node_cve
                internal_nodes[internal_node]["vulnerability_scan_id"] = {}
                internal_nodes[internal_node]["compliance_count"] = internal_node_secrets
                internal_nodes[internal_node]["compliance_scan_id"] = {}
                internal_nodes[internal_node]["secrets_count"] = internal_node_compliance
                internal_nodes[internal_node]["secrets_scan_id"] = {}
            entry["nodes"] = internal_nodes

            nodes_info[node_id] = entry

    return nodes_info


def attack_paths_to_graph(attack_paths, info):
    res = []
    for attack_path in attack_paths:
        for i in range(1, len(attack_path)):
            entry = info[attack_path[i]].copy()
            path = []
            for node_id in reversed(attack_path[:(len(attack_path)-i+1)]):
                name = info[node_id]["id"]
                path.insert(0, name)
            entry['attack_path'] = [path]
            res.append(entry)
    return res



def _compute_threat_graph():
    # Get count of vulnerability, compliance, secrets
    vulnerability_count_map = get_vulnerability_count()
    compliance_count_map = get_compliance_count()
    cloud_compliance_count_map = get_cloud_compliance_count()
    secrets_count_map = get_secrets_count()
    include_nodes = {**vulnerability_count_map, **compliance_count_map,
                     **cloud_compliance_count_map, **secrets_count_map}

    graph = {CLOUD_AWS: nx.DiGraph(), CLOUD_GCP: nx.DiGraph(), CLOUD_AZURE: nx.DiGraph(), pvt_cloud: nx.DiGraph()}
    for cloud_provider, _ in graph.items():
        graph[cloud_provider].add_node(incoming_internet_host_id, name="The Internet", node_type="")
        graph[cloud_provider].add_node(outgoing_internet_host_id, name="The Internet", node_type="")
    # Get cloud resources
    cloud_resources = redis.hgetall(CLOUD_RESOURCES_CACHE_KEY)
    for k, v in cloud_resources.items():
        try:
            if k.startswith(CLOUD_AWS):
                graph[CLOUD_AWS] = compute_aws_cloud_network_graph(json.loads(v), graph[CLOUD_AWS], include_nodes)
            elif k.startswith(CLOUD_GCP):
                graph[CLOUD_GCP] = compute_gcp_cloud_network_graph(json.loads(v), graph[CLOUD_GCP], include_nodes)
            elif k.startswith(CLOUD_AZURE):
                graph[CLOUD_AZURE] = compute_azure_cloud_network_graph(json.loads(v), graph[CLOUD_AZURE], include_nodes)
        except nx.NetworkXNoPath:
            pass
        except Exception as ex:
            flask_app.logger.error("Error in threat graph: {0}".format(ex))

    # Get topology data
    neo4jg = Neo4jGraph()
    neo4jg.clear_connections()
    neo4jg.add_host_entry({"node_id": internet_node_id(CLOUD_AWS), "node_type":"", "depth": 0,"cloud_provider": CLOUD_AWS})
    neo4jg.add_host_entry({"node_id": internet_node_id(CLOUD_AZURE), "node_type":"", "depth": 0,"cloud_provider": CLOUD_AZURE})
    neo4jg.add_host_entry({"node_id": internet_node_id(CLOUD_GCP), "node_type":"", "depth": 0,"cloud_provider": CLOUD_GCP})
    neo4jg.add_host_entry({"node_id": internet_node_id(pvt_cloud), "node_type":"", "depth": 0,"cloud_provider": pvt_cloud})
    neo4jg.add_host_entry({"node_id": outgoing_internet_host_id, "node_type":""})

    topology_hosts = fetch_topology_data(NODE_TYPE_HOST, format="scope")
    topology_containers = fetch_topology_data(NODE_TYPE_CONTAINER, format="scope")
    host_cloud = {}
    cloud_vms = {CLOUD_AWS: {}, CLOUD_AZURE: {}, CLOUD_GCP: {}, pvt_cloud: {}}
    cloud_containers = {CLOUD_AWS: {}, CLOUD_AZURE: {}, CLOUD_GCP: {}, pvt_cloud: {}}
    for node_id, node_details in topology_hosts.items():
        node_name = node_details.get("name", node_details.get("label"))
        if node_details.get("pseudo", False):
            if node_name == "The Internet":
                add_node_neo4j(neo4jg, node_id, node_details)
                for cp, nodes in cloud_vms.items():
                    cloud_vms[cp][node_id] = node_details
            continue
        cp = ""
        for metadata in node_details.get("metadata", []):
            if metadata["id"] == "cloud_provider":
                cp = metadata["value"]
                break
        if cp not in CLOUD_PROVIDERS:
            cp = pvt_cloud
        if cp == CLOUD_GCP:
            cp = CLOUD_GCP
        host_cloud[node_details.get("label", "")] = cp
        cloud_vms[cp][node_id] = node_details
        add_node_neo4j(neo4jg, node_id, node_details)
    for node_id, node_details in topology_containers.items():
        node_name = node_details.get("name", node_details.get("label"))
        if node_details.get("pseudo", False):
            if node_name == "The Internet":
                add_node_neo4j(neo4jg, node_id, node_details)
                for cp, nodes in cloud_containers.items():
                    cloud_containers[cp][node_id] = node_details
            continue
        host_name = node_details.get("labelMinor")
        if not host_name:
            continue
        cp = host_cloud.get(host_name, pvt_cloud)
        cloud_containers[cp][node_id] = node_details
        add_node_neo4j(neo4jg, node_id, node_details)

    for cloud_provider in ALL_CLOUD_PROVIDERS:
        graph[cloud_provider] = get_topology_network_graph(cloud_vms[cloud_provider], graph[cloud_provider],
                                                           node_type=NODE_TYPE_HOST, include_nodes=include_nodes)
        graph[cloud_provider] = get_topology_network_graph(cloud_containers[cloud_provider], graph[cloud_provider],
                                                           node_type=NODE_TYPE_CONTAINER, include_nodes=include_nodes)

    threat_graph = {
        CLOUD_AWS: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "resources": {}},
        CLOUD_AZURE: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "resources": {}},
        CLOUD_GCP: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "resources": {}},
        pvt_cloud: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "resources": {}}
    }
    #threat_graph_paths = defaultdict(dict)
    threat_graph_node = {}

    attack_paths, infos = get_attack_paths_neo4j(neo4jg)
    for cloud_provider in ALL_CLOUD_PROVIDERS:
        if cloud_provider in attack_paths:
            threat_graph[cloud_provider]["resources"] = attack_paths[cloud_provider]

    redis.set(THREAT_GRAPH_CACHE_KEY, json.dumps(threat_graph))
    threat_graph_node_detail = {k: json.dumps(v) for k, v in infos.items()}
    redis.hset(THREAT_GRAPH_NODE_DETAIL_KEY, mapping=threat_graph_node_detail)


@celery_app.task
def topology_cloud_report():
    with flask_app.app_context():
        _topology_cloud_report()


def _topology_cloud_report():
    cloud_report = {
        "CloudProvider": {
            "shape": "circle", "label": "host", "label_plural": "hosts", "nodes": {}, "controls": {},
            "metadata_templates": {
                "name": {"id": "name", "label": "Name", "priority": 1.0, "from": "latest"},
                "label": {"id": "label", "label": "Label", "priority": 2.0, "from": "latest"},
            },
            "metric_templates": {}
        }
    }
    cloud_resources = redis.hgetall(CLOUD_RESOURCES_CACHE_KEY)
    # We will let agent's report metadata take precedence
    time_now = arrow.utcnow()
    old_timestamp = time_now.shift(seconds=-30).strftime("%Y-%m-%dT%H:%M:%S.%f00Z")
    hosts = fetch_topology_data(node_type=NODE_TYPE_HOST, format="deepfence")
    topology_cloud_providers = []
    for node_id, node_details in hosts.items():
        if node_details.get("cloud_provider"):
            if node_details["cloud_provider"] not in topology_cloud_providers:
                topology_cloud_providers.append(node_details["cloud_provider"])
    topology_count = {"cloud_provider": 0}
    for k, v in cloud_resources.items():
        cloud_provider = ""
        label = ""
        try:
            if k.startswith(CLOUD_AWS):
                cloud_provider = CLOUD_AWS
                label = "AWS"
            elif k.startswith(CLOUD_GCP):
                cloud_provider = CLOUD_GCP
                label = "Google Cloud"
            elif k.startswith(CLOUD_AZURE):
                cloud_provider = CLOUD_AZURE
                label = "Azure"
            else:
                continue
        except Exception as ex:
            flask_app.logger.error("Error in topology_cloud_report: {0}".format(ex))
            continue
        scope_id = cloud_provider + ";<cloud_provider>"
        report = {
            "id": scope_id, "topology": "cloud_provider", "counters": None,
            "sets": {}, "latestControls": {},
            "latest": {
                "name": {"timestamp": old_timestamp, "value": cloud_provider},
                "label": {"timestamp": old_timestamp, "value": label},
            }
        }
        cloud_report["CloudProvider"]["nodes"][scope_id] = report
        if cloud_provider not in topology_cloud_providers:
            topology_count["cloud_provider"] += 1
    # requests.post("http://deepfence-topology:8004/topology-api/report", json=cloud_report,
    #               headers={"Content-type": "application/json"})
    redis.hset(CLOUD_TOPOLOGY_COUNT, mapping=topology_count)

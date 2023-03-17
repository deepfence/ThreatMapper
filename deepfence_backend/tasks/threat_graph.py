from config.app import celery_app, app as flask_app
from config.redisconfig import redis
from utils.scope import fetch_topology_data
from utils.esconn import ESConn
from utils.helper import get_topology_network_graph, get_recent_scan_ids, split_list_into_chunks, \
    get_top_exploitable_vulnerabilities
from utils.constants import CLOUD_RESOURCES_CACHE_KEY, NODE_TYPE_HOST, NODE_TYPE_CONTAINER, CLOUD_AWS, CLOUD_GCP, \
    CLOUD_AZURE, THREAT_GRAPH_CACHE_KEY, THREAT_GRAPH_NODE_DETAIL_KEY, CSPM_RESOURCE_LABELS, NODE_TYPE_LABEL, \
    CSPM_RESOURCES, ES_MAX_CLAUSE, CVE_INDEX, COMPLIANCE_INDEX, CLOUD_COMPLIANCE_LOGS_INDEX, SECRET_SCAN_LOGS_INDEX, \
    TIME_UNIT_MAPPING, ES_TERMS_AGGR_SIZE, CVE_SCAN_LOGS_INDEX, COMPLIANCE_LOGS_INDEX, CLOUD_COMPLIANCE_INDEX, \
    SECRET_SCAN_INDEX, CLOUD_TOPOLOGY_COUNT, MALWARE_SCAN_INDEX, MALWARE_SCAN_LOGS_INDEX, COMPLIANCE_ES_TYPE, CLOUD_COMPLIANCE_ES_TYPE, CVE_ES_TYPE
import networkx as nx
from collections import defaultdict
import json
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
                elif isinstance(security_group_rds_map[sg_id], list):
                    security_group_rds_map[sg_id].append(db_instance)
                else:
                    security_group_rds_map[sg_id] = [
                        security_group_rds_map[sg_id], db_instance]
                if sec_group["VpcSecurityGroupId"] not in security_groups:
                    continue
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
                if sec_group["VpcSecurityGroupId"] not in security_groups:
                    continue
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


def get_mis_config_count(index_name, index_es_type, logs_index_name, aggs_field):
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
                    mis_config_count[bkt["key"]]["scan_id"][scan_bkt["key"]] = index_es_type
                    mis_config_count[bkt["key"]]["count"] += scan_bkt["doc_count"]
                else:
                    mis_config_count[bkt["key"]] = {
                        "scan_id": {scan_bkt["key"]: index_es_type}, "count": scan_bkt["doc_count"]}
    return mis_config_count


def get_vulnerability_count():
    top_vulnerablities = get_top_exploitable_vulnerabilities(number, time_unit, None, size=1000)
    vulnerability_count = {}
    for vulnerability in top_vulnerablities:
        if vulnerability["_source"]["cve_container_image"] in vulnerability_count:
            vulnerability_count[vulnerability["_source"]["cve_container_image"]]["count"] += 1
        else:
            vulnerability_count[vulnerability["_source"]["cve_container_image"]] = {
                "scan_id": {vulnerability["_source"]["scan_id"]: CVE_ES_TYPE}, "count": 1}
    return vulnerability_count


def get_compliance_count():
    return get_mis_config_count(COMPLIANCE_INDEX, COMPLIANCE_ES_TYPE, COMPLIANCE_LOGS_INDEX, "node_id")


def get_cloud_compliance_count():
    return get_mis_config_count(CLOUD_COMPLIANCE_INDEX, CLOUD_COMPLIANCE_ES_TYPE, CLOUD_COMPLIANCE_LOGS_INDEX,
                                "resource")


def get_secrets_count():
    # return get_mis_config_count(SECRET_SCAN_INDEX, SECRET_SCAN_LOGS_INDEX, "node_id")
    return {}

def get_malware_count():
    return get_mis_config_count(MALWARE_SCAN_INDEX, MALWARE_SCAN_INDEX, MALWARE_SCAN_LOGS_INDEX, "node_id")


def _compute_threat_graph():
    # Get count of vulnerability, compliance, secrets
    vulnerability_count_map = get_vulnerability_count()
    compliance_count_map = get_compliance_count()
    malware_count_map = get_malware_count()
    cloud_compliance_count_map = get_cloud_compliance_count()
    # secrets_count_map = get_secrets_count()
    include_nodes = {**vulnerability_count_map, **compliance_count_map,
                     **cloud_compliance_count_map, **malware_count_map}

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
    topology_hosts = fetch_topology_data(NODE_TYPE_HOST, format="scope")
    topology_containers = fetch_topology_data(NODE_TYPE_CONTAINER, format="scope")
    host_cloud = {}
    cloud_vms = {CLOUD_AWS: {}, CLOUD_AZURE: {}, CLOUD_GCP: {}, pvt_cloud: {}}
    cloud_containers = {CLOUD_AWS: {}, CLOUD_AZURE: {}, CLOUD_GCP: {}, pvt_cloud: {}}
    for node_id, node_details in topology_hosts.items():
        node_name = node_details.get("name", node_details.get("label"))
        if node_details.get("pseudo", False):
            if node_name == "The Internet":
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
    for node_id, node_details in topology_containers.items():
        node_name = node_details.get("name", node_details.get("label"))
        if node_details.get("pseudo", False):
            if node_name == "The Internet":
                for cp, nodes in cloud_containers.items():
                    cloud_containers[cp][node_id] = node_details
            continue
        host_name = node_details.get("labelMinor")
        if not host_name:
            continue
        cp = host_cloud.get(host_name, pvt_cloud)
        cloud_containers[cp][node_id] = node_details
    for cloud_provider in ALL_CLOUD_PROVIDERS:
        graph[cloud_provider] = get_topology_network_graph(cloud_vms[cloud_provider], graph[cloud_provider],
                                                           node_type=NODE_TYPE_HOST, include_nodes=include_nodes)
        graph[cloud_provider] = get_topology_network_graph(cloud_containers[cloud_provider], graph[cloud_provider],
                                                           node_type=NODE_TYPE_CONTAINER, include_nodes=include_nodes)

    threat_graph = {
        CLOUD_AWS: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "malware_count":0,"resources": {}},
        CLOUD_AZURE: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "malware_count":0, "resources": {}},
        CLOUD_GCP: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "malware_count":0, "resources": {}},
        pvt_cloud: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "malware_count":0, "resources": {}}
    }
    threat_graph_paths = defaultdict(dict)
    threat_graph_node = {}

    for cloud_provider in ALL_CLOUD_PROVIDERS:
        node_data = dict(graph[cloud_provider].nodes.data())
        for node_id, meta in node_data.items():
            if incoming_internet_host_id == node_id or outgoing_internet_host_id == node_id:
                continue
            if not meta:
                continue
            try:
                shortest_paths_generator_in = nx.all_simple_paths(
                    graph[cloud_provider], incoming_internet_host_id, node_id, 2)
                for _, path in enumerate(shortest_paths_generator_in):
                    p = []
                    p_str = ""
                    counter = 0
                    for i in path:
                        if i == incoming_internet_host_id:
                            p.append("The Internet")
                            p_str += "The Internet"
                        else:
                            n = cloud_provider + "-" + node_data[i]["node_type"] + "-" + str(counter)
                            p.append(n)
                            p_str += "," + n
                        counter += 1
                    node_type = meta["node_type"]
                    key = cloud_provider + "-" + node_type + "-" + str(len(path) - 1)
                    label = node_type
                    if node_type in NODE_TYPE_LABEL:
                        label = NODE_TYPE_LABEL[node_type]
                    elif node_type in CSPM_RESOURCES:
                        if CSPM_RESOURCES[node_type] in CSPM_RESOURCE_LABELS:
                            label = CSPM_RESOURCE_LABELS[CSPM_RESOURCES[node_type]]
                    vulnerability_count = 0
                    vulnerability_scan_id = {}
                    compliance_scan_id = {}
                    secrets_count = 0
                    malware_count = 0
                    secrets_scan_id = {}
                    malware_scan_id = {}
                    cloud_id = ""
                    if node_type == NODE_TYPE_HOST:
                        vulnerability_count = vulnerability_count_map.get(meta["name"], {}).get("count", 0)
                        if vulnerability_count > 0:
                            vulnerability_scan_id = vulnerability_count_map[meta["name"]]["scan_id"]
                        compliance_count = compliance_count_map.get(node_id, {}).get("count", 0)
                        if compliance_count > 0:
                            compliance_scan_id = compliance_count_map[node_id]["scan_id"]
                        if meta.get("cloud_id"):
                            cloud_id = meta["cloud_id"]
                            compliance_count += cloud_compliance_count_map.get(cloud_id, {}).get("count", 0)
                            compliance_scan_id = {
                                **cloud_compliance_count_map.get(cloud_id, {}).get("scan_id", {}),
                                **compliance_scan_id,
                            }
                        # secrets_count = secrets_count_map.get(node_id, {}).get("count", 0)
                        # if secrets_count > 0:
                        #     secrets_scan_id = secrets_count_map[node_id]["scan_id"]
                        malware_count = malware_count_map.get(node_id, {}).get("count", 0)
                        if malware_count > 0:
                            malware_scan_id = malware_count_map[node_id]["scan_id"]
                    elif node_type == NODE_TYPE_CONTAINER:
                        vulnerability_count = vulnerability_count_map.get(meta["image_name"], {}).get("count", 0)
                        if vulnerability_count > 0:
                            vulnerability_scan_id = vulnerability_count_map[meta["image_name"]]["scan_id"]
                        compliance_count = compliance_count_map.get(node_id, {}).get("count", 0)
                        if compliance_count > 0:
                            compliance_scan_id = compliance_count_map[node_id]["scan_id"]
                        # secrets_count = secrets_count_map.get(node_id, {}).get("count", 0)
                        # if secrets_count > 0:
                        #     secrets_scan_id = secrets_count_map[node_id]["scan_id"]
                        malware_count = malware_count_map.get(node_id, {}).get("count", 0)
                        if malware_count > 0:
                            malware_scan_id = malware_count_map[node_id]["scan_id"]
                    else:
                        cloud_id = node_id
                        compliance_count = cloud_compliance_count_map.get(node_id, {}).get("count", 0)
                        compliance_scan_id = cloud_compliance_count_map.get(node_id, {}).get("scan_id", {})
                    if key not in threat_graph_node:
                        threat_graph_node[key] = {
                            "label": label, "id": key, "nodes": {}, "node_type": node_type}
                    threat_graph_node[key]["nodes"][node_id] = {
                        "node_id": node_id, "name": meta["name"], "image_name": meta.get("image_name", ""),
                        "vulnerability_count": vulnerability_count, "vulnerability_scan_id": vulnerability_scan_id,
                        "compliance_count": compliance_count, "compliance_scan_id": compliance_scan_id,
                        "secrets_count": secrets_count, "malware_count": malware_count,"secrets_scan_id": secrets_scan_id,
                         "cloud_id": cloud_id,"malware_scan_id": malware_scan_id
                    }
                    if key in threat_graph[cloud_provider]["resources"]:
                        if not threat_graph_paths[key][p_str]:
                            threat_graph[cloud_provider]["resources"][key]["attack_path"].append(p)
                        threat_graph[cloud_provider]["resources"][key]["count"] += 1
                        threat_graph[cloud_provider]["resources"][key]["vulnerability_count"] += vulnerability_count
                        threat_graph[cloud_provider]["resources"][key]["secrets_count"] += secrets_count
                        threat_graph[cloud_provider]["resources"][key]["malware_count"] += malware_count
                        threat_graph[cloud_provider]["resources"][key]["compliance_count"] += compliance_count
                    else:
                        threat_graph_paths[key][p_str] = True
                        threat_graph[cloud_provider]["resources"][key] = {
                            "attack_path": [p], "count": 1, "vulnerability_count": vulnerability_count,
                            "compliance_count": compliance_count, "secrets_count": secrets_count,
                            "malware_count": malware_count, "label": label, "id": key, "node_type": node_type,
                        }
                    threat_graph[cloud_provider]["count"] += 1
                    threat_graph[cloud_provider]["vulnerability_count"] += vulnerability_count
                    threat_graph[cloud_provider]["secrets_count"] += secrets_count
                    threat_graph[cloud_provider]["malware_count"] += malware_count
                    threat_graph[cloud_provider]["compliance_count"] += compliance_count
            except nx.NetworkXNoPath:
                pass
            except Exception as ex:
                flask_app.logger.error("Error in threat graph: {0}".format(ex))

    for cloud_provider, _ in threat_graph.items():
        threat_graph[cloud_provider]["resources"] = list(threat_graph[cloud_provider]["resources"].values())
    redis.set(THREAT_GRAPH_CACHE_KEY, json.dumps(threat_graph))
    threat_graph_node_detail = {k: json.dumps(v) for k, v in threat_graph_node.items()}
    if threat_graph_node_detail:
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

from config.app import celery_app, app as flask_app
from config.redisconfig import redis
from utils.scope import fetch_topology_data
from utils.esconn import ESConn
from utils.helper import get_topology_network_graph, get_recent_scan_ids, split_list_into_chunks
from utils.constants import CLOUD_RESOURCES_CACHE_KEY, NODE_TYPE_HOST, NODE_TYPE_CONTAINER, CLOUD_AWS, CLOUD_GCP, \
    CLOUD_AZURE, ATTACK_GRAPH_CACHE_KEY, ATTACK_GRAPH_NODE_DETAIL_KEY, CSPM_RESOURCE_LABELS, NODE_TYPE_LABEL, \
    CSPM_RESOURCES, ES_MAX_CLAUSE, CVE_INDEX, COMPLIANCE_INDEX, CLOUD_COMPLIANCE_LOGS_INDEX, SECRET_SCAN_LOGS_INDEX, \
    TIME_UNIT_MAPPING, ES_TERMS_AGGR_SIZE, CVE_SCAN_LOGS_INDEX, COMPLIANCE_LOGS_INDEX, CLOUD_COMPLIANCE_INDEX, \
    SECRET_SCAN_INDEX, CLOUD_GCP2
import networkx as nx
from collections import defaultdict
import json

incoming_internet_host_id = "in-theinternet"
outgoing_internet_host_id = "out-theinternet"
pvt_cloud = "others"  # other cloud, non cloud
CLOUD_PROVIDERS = [CLOUD_AWS, CLOUD_GCP2, CLOUD_AZURE]
ALL_CLOUD_PROVIDERS = [CLOUD_AWS, CLOUD_GCP2, CLOUD_AZURE, pvt_cloud]
# Get vulnerabilities, compliance mis-config in the past 90 days
number = 90
time_unit = "d"


@celery_app.task
def compute_attack_graph():
    with flask_app.app_context():
        _compute_attack_graph()


def compute_aws_cloud_network_graph(cloud_resources, graph, include_nodes):
    if not cloud_resources:
        return graph
    security_groups = {}
    security_group_resource_map = {}
    security_group_rds_map = {}
    lamda_function_map = {}
    vpc_definitions = []
    for cloud_resource in cloud_resources:
        if cloud_resource["id"] == "aws_vpc_security_group_rule":
            security_groups[cloud_resource.get("group_id")] = cloud_resource
        if cloud_resource["arn"] not in include_nodes:
            continue
        if cloud_resource["id"] == "aws_eks_cluster":
            if cloud_resource["resources_vpc_config"] is not None:
                if cloud_resource["resources_vpc_config"]["EndpointPublicAccess"] == "true":
                    if not graph.has_node(cloud_resource["arn"]):
                        graph.add_node(cloud_resource["arn"], name=cloud_resource["name"],
                                       node_type=cloud_resource["id"])
                    if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                        graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
        if cloud_resource["id"] == "aws_ecs_task_definiton":
            if cloud_resource["network_mode"] == "awsvpc":
                vpc_definitions.append(cloud_resource["arn"])
        if cloud_resource["id"] == "aws_s3_bucket":
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
            if cloud_resource["task_definition"] in vpc_definitions:
                if cloud_resource["network_configuration"] is not None:
                    if cloud_resource["network_configuration"]["AwsvpcConfiguration"] is not None:
                        if cloud_resource["network_configuration"]["AwsvpcConfiguration"]["AssignPublicIp"] \
                                == 'ENABLED':
                            publicly_accessible_services.append(cloud_resource["service_name"])
        if cloud_resource["id"] == "aws_opensearch_domain":
            if cloud_resource["vpc_options"] is None:
                if not graph.has_node(cloud_resource["domain_id"]):
                    graph.add_node(cloud_resource["domain_id"], name=cloud_resource["domain_name"],
                                   node_type=cloud_resource["id"])
                if not graph.has_edge(incoming_internet_host_id, cloud_resource["domain_id"]):
                    graph.add_edge(incoming_internet_host_id, cloud_resource["domain_id"])
                if not graph.has_edge(cloud_resource["domain_id"], outgoing_internet_host_id):
                    graph.add_edge(cloud_resource["domain_id"], outgoing_internet_host_id)
        if cloud_resource["id"] == "aws_rds_db_instance":
            db_instance = cloud_resource["arn"]
            if cloud_resource["publicly_accessible"] is True:
                if not graph.has_node(db_instance):
                    graph.add_node(db_instance, name=cloud_resource["name"], node_type=cloud_resource["id"])
                if not graph.has_edge(incoming_internet_host_id, db_instance):
                    graph.add_edge(incoming_internet_host_id, db_instance)
                if not graph.has_edge(db_instance, outgoing_internet_host_id):
                    graph.add_edge(db_instance, outgoing_internet_host_id)
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
                        if not graph.has_edge(db_instance, outgoing_internet_host_id):
                            graph.add_edge(db_instance, outgoing_internet_host_id)
                else:
                    if security_groups[sec_group["VpcSecurityGroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
                        if not graph.has_node(db_instance):
                            graph.add_node(db_instance, name=cloud_resource["name"], node_type=cloud_resource["id"])
                        if not graph.has_edge(incoming_internet_host_id, db_instance):
                            graph.add_edge(incoming_internet_host_id, db_instance)
    for cloud_resource in cloud_resources:
        if cloud_resource["id"] == "aws_rds_db_cluster":
            db_cluster = cloud_resource["arn"]
            # for sec_group in cloud_resource["vpc_security_groups"]:
            #     if security_groups[sec_group["VpcSecurityGroupId"]]["is_egress"]:
            #         if security_groups[sec_group["VpcSecurityGroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
            #             if not graph.has_node(db_cluster):
            #                 graph.add_node(db_cluster, name=cloud_resource["name"], node_type=cloud_resource["id"])
            #             if not graph.has_edge(db_cluster, outgoing_internet_host_id):
            #                 graph.add_edge(db_cluster, outgoing_internet_host_id)
            #             for instance in cloud_resource["members"]:
            #                 instance_id = instance["DBInstanceIdentifier"] + ";<db>"
            #                 if not graph.has_edge(db_cluster, instance_id):
            #                     graph.add_edge(db_cluster, outgoing_internet_host_id)
            #     else:
            #         if security_groups[sec_group["VpcSecurityGroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
            #             if not graph.has_node(db_cluster):
            #                 graph.add_node(db_cluster, name=cloud_resource["name"], node_type=cloud_resource["id"])
            #             if not graph.has_edge(incoming_internet_host_id, db_cluster):
            #                 graph.add_edge(incoming_internet_host_id, db_cluster)
            #             for instance in cloud_resource["members"]:
            #                 db_instance_id = instance["DBInstanceIdentifier"] + ";<db>"
            #                 if not graph.has_edge(db_cluster, db_instance_id):
            #                     graph.add_edge(db_cluster, outgoing_internet_host_id)
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
            if cloud_resource["service_name"] in publicly_accessible_services:
                if not graph.has_node(cloud_resource["arn"]):
                    graph.add_node(cloud_resource["arn"], name=cloud_resource["name"], node_type=cloud_resource["id"])
                if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                    graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
                if not graph.has_edge(cloud_resource["arn"], outgoing_internet_host_id):
                    graph.add_edge(cloud_resource["arn"], outgoing_internet_host_id)
        if cloud_resource["id"] == "aws_lambda_function":
            lambda_fun = cloud_resource["arn"]
            if not cloud_resource.get("policy_std"):
                continue
            for stmt in cloud_resource.get("policy_std", {}).get("Statement", []):
                if stmt["Effect"] == "Allow" and "*" in stmt["Principal"].get("AWS", []):
                    if not graph.has_node(lambda_fun):
                        graph.add_node(lambda_fun, name=cloud_resource["name"], node_type=cloud_resource["id"])
                    if not graph.has_edge(incoming_internet_host_id, lambda_fun):
                        graph.add_edge(incoming_internet_host_id, lambda_fun)
                    if not graph.has_edge(lambda_fun, outgoing_internet_host_id):
                        graph.add_edge(lambda_fun, outgoing_internet_host_id)
            if lambda_fun in lamda_function_map:
                if isinstance(lamda_function_map[lambda_fun], str):
                    if not graph.has_node(lamda_function_map[lambda_fun]):
                        graph.add_node(lamda_function_map[lambda_fun], name=lamda_function_map[lambda_fun],
                                       node_type="aws_s3_bucket")
                    if not graph.has_edge(lambda_fun, lamda_function_map[lambda_fun]):
                        graph.add_edge(lambda_fun, lamda_function_map[lambda_fun])
                if isinstance(lamda_function_map[lambda_fun], list):
                    for bucket in lamda_function_map[lambda_fun]:
                        if not graph.has_node(bucket):
                            graph.add_node(bucket, name=bucket, node_type="aws_s3_bucket")
                        if not graph.has_edge(lambda_fun, bucket):
                            graph.add_edge(lambda_fun, bucket)
    return graph


def compute_gcp_cloud_network_graph(cloud_resources, graph, include_nodes):
    security_group = {}
    if not cloud_resources:
        return graph
    for cloud_resource in cloud_resources:
        if cloud_resource["id"] == "":
            security_group[cloud_resource.get("group_id")] = cloud_resource
    return graph


def compute_azure_cloud_network_graph(cloud_resources, graph, include_nodes):
    if not cloud_resources:
        return graph
    if not graph.has_node(incoming_internet_host_id):
        graph.add_node(incoming_internet_host_id)
    # outbound_network_security_group = []
    # inbound_network_security_group = []
    for cloud_resource in cloud_resources:
        if cloud_resource["resource_id"] == "azure_storage_account":
            if cloud_resource["allow_blob_public_access"]:
                if not graph.has_node(cloud_resource["id"]):
                    graph.add_node(cloud_resource["name"], name="Azure Storage account",
                                   node_type="azure_storage_account")
                if not graph.has_edge(incoming_internet_host_id, cloud_resource["name"]):
                    graph.add_edge(incoming_internet_host_id, cloud_resource["name"])

    for cloud_resource in cloud_resources:
        if cloud_resource["resource_id"] == "azure_storage_blob":
            if graph.has_edge(incoming_internet_host_id, cloud_resource["storage_account_name"]):
                if not graph.has_node(cloud_resource["name"]):
                    graph.add_node(cloud_resource["name"], name="Azure Storage Blob", node_type="azure_storage_blob")
                if not graph.has_edge(cloud_resource["storage_account_name"], cloud_resource["name"]):
                    graph.add_edge(cloud_resource["storage_account_name"], cloud_resource["name"])
        elif cloud_resource["resource_id"] == "azure_storage_table":
            if graph.has_edge(incoming_internet_host_id, cloud_resource["storage_account_name"]):
                if not graph.has_node(cloud_resource["name"]):
                    graph.add_node(cloud_resource["name"], name="Azure Storage Table", node_type="azure_storage_table")
                if not graph.has_edge(cloud_resource["storage_account_name"], cloud_resource["name"]):
                    graph.add_edge(cloud_resource["storage_account_name"], cloud_resource["name"])
        elif cloud_resource["resource_id"] == "azure_log_profile":
            if graph.has_edge(incoming_internet_host_id, cloud_resource["storage_account_name"]):
                if not graph.has_node(cloud_resource["name"]):
                    graph.add_node(cloud_resource["name"], name="Azure Log Profile", node_type="azure_log_profile")
                if not graph.has_edge(cloud_resource["azure_log_profile"], cloud_resource["name"]):
                    graph.add_edge(cloud_resource["azure_log_profile"], cloud_resource["name"])
        elif cloud_resource["resource_id"] == "azure_compute_virtual_machine":
            for network_interface in cloud_resource["network_interfaces"]:
                if network_interface[id]:
                    pass
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


def _compute_attack_graph():
    # Get count of vulnerability, compliance, secrets
    vulnerability_count_map = get_vulnerability_count()
    compliance_count_map = get_compliance_count()
    cloud_compliance_count_map = get_cloud_compliance_count()
    secrets_count_map = get_secrets_count()
    include_nodes = {**vulnerability_count_map, **compliance_count_map,
                     **cloud_compliance_count_map, **secrets_count_map}

    graph = {CLOUD_AWS: nx.DiGraph(), CLOUD_GCP2: nx.DiGraph(), CLOUD_AZURE: nx.DiGraph(), pvt_cloud: nx.DiGraph()}
    for cloud_provider, _ in graph.items():
        graph[cloud_provider].add_node(incoming_internet_host_id, name="The Internet", node_type="")
        graph[cloud_provider].add_node(outgoing_internet_host_id, name="The Internet", node_type="")
    # Get cloud resources
    cloud_resources = redis.hgetall(CLOUD_RESOURCES_CACHE_KEY)
    for k, v in cloud_resources.items():
        try:
            if k.startswith(CLOUD_AWS):
                graph[CLOUD_AWS] = compute_aws_cloud_network_graph(json.loads(v), graph[CLOUD_AWS], include_nodes)
            elif k.startswith(CLOUD_GCP2):
                graph[CLOUD_GCP2] = compute_gcp_cloud_network_graph(json.loads(v), graph[CLOUD_GCP2], include_nodes)
            elif k.startswith(CLOUD_AZURE):
                graph[CLOUD_AZURE] = compute_azure_cloud_network_graph(json.loads(v), graph[CLOUD_AZURE], include_nodes)
        except nx.NetworkXNoPath:
            pass
        except Exception as ex:
            flask_app.logger.error("Error in attack graph: {0}".format(ex))

    # Get topology data
    topology_hosts = fetch_topology_data(NODE_TYPE_HOST, format="scope")
    topology_containers = fetch_topology_data(NODE_TYPE_CONTAINER, format="scope")
    host_cloud = {}
    cloud_vms = {CLOUD_AWS: {}, CLOUD_AZURE: {}, CLOUD_GCP2: {}, pvt_cloud: {}}
    cloud_containers = {CLOUD_AWS: {}, CLOUD_AZURE: {}, CLOUD_GCP2: {}, pvt_cloud: {}}
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
            cp = CLOUD_GCP2
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

    attack_graph = {
        CLOUD_AWS: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "resources": {}},
        CLOUD_AZURE: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "resources": {}},
        CLOUD_GCP2: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "resources": {}},
        pvt_cloud: {"count": 0, "secrets_count": 0, "vulnerability_count": 0, "compliance_count": 0, "resources": {}}
    }
    attack_graph_paths = defaultdict(dict)
    attack_graph_node = {}

    for cloud_provider in ALL_CLOUD_PROVIDERS:
        node_data = dict(graph[cloud_provider].nodes.data())
        for node_id, meta in node_data.items():
            if incoming_internet_host_id == node_id or outgoing_internet_host_id == node_id:
                continue
            if not meta:
                continue
            try:
                shortest_paths_generator_in = nx.shortest_simple_paths(
                    graph[cloud_provider], incoming_internet_host_id, node_id)
                for _, path in enumerate(shortest_paths_generator_in):
                    p = []
                    p_str = ""
                    counter = 0
                    for i in path:
                        if i == incoming_internet_host_id:
                            p.append("The Internet")
                            p_str += "The Internet"
                        else:
                            n = node_data[i]["node_type"] + "-" + str(counter)
                            p.append(n)
                            p_str += "," + n
                        counter += 1
                    node_type = meta["node_type"]
                    key = node_type + "-" + str(len(path) - 1)
                    label = node_type
                    if node_type in NODE_TYPE_LABEL:
                        label = NODE_TYPE_LABEL[node_type]
                    elif node_type in CSPM_RESOURCES:
                        if CSPM_RESOURCES[node_type] in CSPM_RESOURCE_LABELS:
                            label = CSPM_RESOURCE_LABELS[CSPM_RESOURCES[node_type]]
                    vulnerability_count = 0
                    vulnerability_scan_id = []
                    compliance_scan_id = []
                    secrets_count = 0
                    secrets_scan_id = []
                    if node_type == NODE_TYPE_HOST:
                        vulnerability_count = vulnerability_count_map.get(meta["name"], {}).get("count", 0)
                        if vulnerability_count > 0:
                            vulnerability_scan_id = vulnerability_count_map[meta["name"]]["scan_id"]
                        compliance_count = compliance_count_map.get(node_id, {}).get("count", 0)
                        if compliance_count > 0:
                            compliance_scan_id = compliance_count_map[node_id]["scan_id"]
                        if meta.get("cloud_id"):
                            compliance_count += cloud_compliance_count_map.get(meta["cloud_id"], {}).get("count", 0)
                            compliance_scan_id += cloud_compliance_count_map.get(meta["cloud_id"], {}).get("scan_id",
                                                                                                           [])
                        secrets_count = secrets_count_map.get(node_id, {}).get("count", 0)
                        if secrets_count > 0:
                            secrets_scan_id = secrets_count_map[node_id]["scan_id"]
                    elif node_type == NODE_TYPE_CONTAINER:
                        vulnerability_count = vulnerability_count_map.get(meta["image_name"], {}).get("count", 0)
                        if vulnerability_count > 0:
                            vulnerability_scan_id = vulnerability_count_map[meta["image_name"]]["scan_id"]
                        compliance_count = compliance_count_map.get(node_id, {}).get("count", 0)
                        if compliance_count > 0:
                            compliance_scan_id = compliance_count_map[node_id]["scan_id"]
                        secrets_count = secrets_count_map.get(node_id, {}).get("count", 0)
                        if secrets_count > 0:
                            secrets_scan_id = secrets_count_map[node_id]["scan_id"]
                    else:
                        compliance_count = cloud_compliance_count_map.get(node_id, {}).get("count", 0)
                        compliance_scan_id = cloud_compliance_count_map.get(node_id, {}).get("scan_id", [])
                    if key not in attack_graph_node:
                        attack_graph_node[key] = {
                            "label": label, "id": key, "nodes": {}, "node_type": node_type}
                    attack_graph_node[key]["nodes"][node_id] = {
                        "node_id": node_id, "name": meta["name"], "image_name": meta.get("image_name", ""),
                        "vulnerability_count": vulnerability_count, "vulnerability_scan_id": vulnerability_scan_id,
                        "compliance_count": compliance_count, "compliance_scan_id": compliance_scan_id,
                        "secrets_count": secrets_count, "secrets_scan_id": secrets_scan_id,
                    }
                    if key in attack_graph[cloud_provider]["resources"]:
                        if not attack_graph_paths[key][p_str]:
                            attack_graph[cloud_provider]["resources"][key]["attack_path"].append(p)
                        attack_graph[cloud_provider]["resources"][key]["count"] += 1
                        attack_graph[cloud_provider]["resources"][key]["vulnerability_count"] += vulnerability_count
                        attack_graph[cloud_provider]["resources"][key]["secrets_count"] += secrets_count
                        attack_graph[cloud_provider]["resources"][key]["compliance_count"] += compliance_count
                    else:
                        attack_graph_paths[key][p_str] = True
                        attack_graph[cloud_provider]["resources"][key] = {
                            "attack_path": [p], "count": 1, "vulnerability_count": vulnerability_count,
                            "compliance_count": compliance_count, "secrets_count": secrets_count,
                            "label": label, "id": key, "node_type": node_type,
                        }
                    attack_graph[cloud_provider]["count"] += 1
                    attack_graph[cloud_provider]["vulnerability_count"] += vulnerability_count
                    attack_graph[cloud_provider]["secrets_count"] += secrets_count
                    attack_graph[cloud_provider]["compliance_count"] += compliance_count
            except nx.NetworkXNoPath:
                pass
            except Exception as ex:
                flask_app.logger.error("Error in attack graph: {0}".format(ex))

    for cloud_provider, _ in attack_graph.items():
        attack_graph[cloud_provider]["resources"] = list(attack_graph[cloud_provider]["resources"].values())
    redis.set(ATTACK_GRAPH_CACHE_KEY, json.dumps(attack_graph))
    attack_graph_node_detail = {k: json.dumps(v) for k, v in attack_graph_node.items()}
    if attack_graph_node_detail:
        redis.hset(ATTACK_GRAPH_NODE_DETAIL_KEY, mapping=attack_graph_node_detail)

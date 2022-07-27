from config.app import celery_app, app as flask_app
from config.redisconfig import redis
from utils.scope import fetch_topology_data
from utils.esconn import ESConn
from utils.helper import get_topology_network_graph, get_recent_scan_ids, split_list_into_chunks
from utils.constants import CLOUD_RESOURCES_CACHE_KEY, NODE_TYPE_HOST, NODE_TYPE_CONTAINER, CLOUD_AWS, CLOUD_GCP, \
    CLOUD_AZURE, ATTACK_GRAPH_CACHE_KEY, ATTACK_GRAPH_NODE_DETAIL_KEY, CSPM_RESOURCE_LABELS, NODE_TYPE_LABEL, \
    CSPM_RESOURCES, ES_MAX_CLAUSE, CVE_INDEX, COMPLIANCE_INDEX, CLOUD_COMPLIANCE_LOGS_INDEX, SECRET_SCAN_LOGS_INDEX, \
    TIME_UNIT_MAPPING, ES_TERMS_AGGR_SIZE, CVE_SCAN_LOGS_INDEX, COMPLIANCE_LOGS_INDEX, CLOUD_COMPLIANCE_INDEX, \
    SECRET_SCAN_INDEX, ALERTS_INDEX
import networkx as nx
from collections import defaultdict
import json

incoming_internet_host_id = "in-theinternet"
outgoing_internet_host_id = "out-theinternet"
# Get alerts, vulnerabilities, compliance mis-config in the past 90 days
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
    for cloud_resource in cloud_resources:
        if cloud_resource["id"] == "aws_vpc_security_group_rule":
            security_groups[cloud_resource.get("group_id")] = cloud_resource
        if cloud_resource["arn"] not in include_nodes:
            continue
        if cloud_resource["id"] == "aws_s3_bucket":
            if cloud_resource["bucket_policy_is_public"] is True:
                if not graph.has_node(cloud_resource["arn"]):
                    graph.add_node(cloud_resource["arn"], name=cloud_resource["name"], node_type=cloud_resource["id"])
                if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                    graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
        elif cloud_resource["id"] in ["aws_ec2_classic_load_balancer", "aws_ec2_application_load_balancer",
                                      "aws_ec2_network_load_balancer"]:
            if cloud_resource["scheme"] == "internet-facing":
                if not graph.has_node(cloud_resource["arn"]):
                    graph.add_node(cloud_resource["arn"], name=cloud_resource["name"], node_type=cloud_resource["id"])
                if not graph.has_edge(incoming_internet_host_id, cloud_resource["arn"]):
                    graph.add_edge(incoming_internet_host_id, cloud_resource["arn"])
    for cloud_resource in cloud_resources:
        if cloud_resource["id"] == "aws_ec2_instance":
            host_name = cloud_resource["name"] + ";<host>"
            if (cloud_resource["arn"] not in include_nodes) and (host_name not in include_nodes) and (
                    cloud_resource["name"] not in include_nodes):
                continue
            for sec_group in cloud_resource["security_groups"]:
                security_group_resource_map[sec_group["GroupId"]] = host_name
                if sec_group["GroupId"] not in security_group_resource_map:
                    security_group_resource_map[sec_group["GroupId"]] = host_name
                elif isinstance(security_group_resource_map[sec_group["GroupId"]], list):
                    security_group_resource_map[sec_group["GroupId"]].append(host_name)
                else:
                    security_group_resource_map[sec_group["GroupId"]] = [security_group_resource_map[sec_group["GroupId"]], host_name]
                if security_groups[sec_group["GroupId"]]["is_egress"]:
                    if security_groups[sec_group["GroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
                        if not graph.has_node(host_name):
                            graph.add_node(host_name, name=cloud_resource["name"], node_type=NODE_TYPE_HOST)
                        if not graph.has_edge(host_name, outgoing_internet_host_id):
                            graph.add_edge(host_name, outgoing_internet_host_id)
                else:
                    if security_groups[sec_group["GroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
                        if not graph.has_node(host_name):
                            graph.add_node(host_name, name=cloud_resource["name"], node_type=NODE_TYPE_HOST)
                        if not graph.has_edge(incoming_internet_host_id, host_name):
                            graph.add_edge(incoming_internet_host_id, host_name)
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
            db_instance = cloud_resource["db_instance_identifier"] + ";<db>"
            if cloud_resource["publicly_accessible"] is True:
                if not graph.has_node(db_instance):
                    graph.add_node(db_instance, name=cloud_resource["name"], node_type=cloud_resource["id"])
                if not graph.has_edge(incoming_internet_host_id, db_instance):
                    graph.add_edge(incoming_internet_host_id, db_instance)
                if not graph.has_edge(db_instance, outgoing_internet_host_id):
                    graph.add_edge(db_instance, outgoing_internet_host_id)
            for sec_group in cloud_resource["vpc_security_groups"]:
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
            db_cluster = cloud_resource["db_cluster_identifier"] + ";<db>"
            for sec_group in cloud_resource["vpc_security_groups"]:
                if security_groups[sec_group["VpcSecurityGroupId"]]["is_egress"]:
                    if security_groups[sec_group["VpcSecurityGroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
                        if not graph.has_node(db_cluster):
                            graph.add_node(db_cluster, name=cloud_resource["name"], node_type=cloud_resource["id"])
                        if not graph.has_edge(db_cluster, outgoing_internet_host_id):
                            graph.add_edge(db_cluster, outgoing_internet_host_id)
                        for instance in cloud_resource["members"]:
                            instanceId = instance["DBInstanceIdentifier"] + ";<db>"
                            if not graph.has_edge(db_cluster, instanceId):
                                graph.add_edge(db_cluster, outgoing_internet_host_id)
                else:
                    if security_groups[sec_group["VpcSecurityGroupId"]]["cidr_ipv4"] == '0.0.0.0/0':
                        if not graph.has_node(db_cluster):
                            graph.add_node(db_cluster, name=cloud_resource["name"], node_type=cloud_resource["id"])
                        if not graph.has_edge(incoming_internet_host_id, db_cluster):
                            graph.add_edge(incoming_internet_host_id, db_cluster)
                        for instance in cloud_resource["members"]:
                            instanceId = instance["DBInstanceIdentifier"] + ";<db>"
                            if not graph.has_edge(db_cluster, instanceId):
                                graph.add_edge(db_cluster, outgoing_internet_host_id)
        # check compute to compute mapping
        if cloud_resource["id"] == "aws_ec2_instance":
            host_name = cloud_resource["name"] + ";<host>"
            if (cloud_resource["arn"] not in include_nodes) and (host_name not in include_nodes) and (
                    cloud_resource["name"] not in include_nodes):
                continue
            for sec_group in cloud_resource["security_groups"]:
                if not security_groups[sec_group["GroupId"]]["is_egress"]:
                    if security_groups[sec_group["GroupId"]]["cidr_ipv4"] in list(security_group_resource_map.keys()) :
                        if isinstance(security_group_resource_map[sec_group["GroupId"]], string):
                            if not graph.has_edge(security_group_resource_map[sec_group["GroupId"]], host_name):
                                graph.add_edge(security_group_resource_map[sec_group["GroupId"]], host_name)
                        if isinstance(security_group_resource_map[sec_group["GroupId"]], list):
                            for host in security_group_resource_map[sec_group["GroupId"]]:
                                if not graph.has_edge(host, host_name):
                                    graph.add_edge(host, host_name)

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
        # if cloud_resource["resource_id"] == "azure_network_security_group":
        #     network_security_group[cloud_resource.get("group_id")] = cloud_resource
        #     if  not cloud_resource["security_rules"] is None:
        #         for rule in cloud_resource["security_rules"]:
        #             if rule["properties"]["direction"] == 'Outbound' and rule["properties"]["protocol"] in ["TCP", "*"] and rule["access"]rule["properties"]["sourceAddressPrefixes"] in ["*", "0.0.0.0", "0.0.0.0/0", "Internet", "<nw>/0", "/0"]:
        #                 outbound_network_security_group.append(cloud_resource["id"])
        #             if rule["properties"]["direction"] == 'Inbound' and rule["properties"]["protocol"] in ["TCP", "*"] and rule["properties"]["sourceAddressPrefixes"] in ["*", "0.0.0.0", "0.0.0.0/0", "Internet", "<nw>/0", "/0"]:
        #                 inbound_network_security_group.append(cloud_resource["id"])
        #     security_group[cloud_resource.get("group_id")] = cloud_resource
        if cloud_resource["resource_id"] == "azure_storage_account":
            if cloud_resource["allow_blob_public_access"] == True:
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
    mis_config_count = {}
    recent_scan_id_chunks = split_list_into_chunks(recent_scan_ids, ES_MAX_CLAUSE)
    for scan_id_chunk in recent_scan_id_chunks:
        filters = {"masked": False, "scan_id": scan_id_chunk}
        aggs = {aggs_field: {"terms": {"field": aggs_field + ".keyword", "size": ES_TERMS_AGGR_SIZE}}}
        aggs_response = ESConn.aggregation_helper(
            index_name, filters, aggs, number, TIME_UNIT_MAPPING.get(time_unit), None)
        for bkt in aggs_response.get("aggregations", {}).get(aggs_field, {}).get("buckets", []):
            mis_config_count[bkt["key"]] = bkt["doc_count"]
    return mis_config_count


def get_vulnerability_count():
    return get_mis_config_count(CVE_INDEX, CVE_SCAN_LOGS_INDEX, "cve_container_image")


def get_compliance_count():
    return get_mis_config_count(COMPLIANCE_INDEX, COMPLIANCE_LOGS_INDEX, "node_id")


def get_cloud_compliance_count():
    return get_mis_config_count(CLOUD_COMPLIANCE_INDEX, CLOUD_COMPLIANCE_LOGS_INDEX, "resource")


def get_secrets_count():
    return get_mis_config_count(SECRET_SCAN_INDEX, SECRET_SCAN_LOGS_INDEX, "node_id")


def get_alerts_count():
    aggs = {"host_name": {"terms": {"field": "host_name.keyword", "size": ES_TERMS_AGGR_SIZE}}}
    alerts_count = {}
    aggs_response = ESConn.aggregation_helper(
        ALERTS_INDEX, {"masked": False}, aggs, number, TIME_UNIT_MAPPING.get(time_unit), None)
    for bkt in aggs_response.get("aggregations", {}).get("host_name", {}).get("buckets", []):
        alerts_count[bkt["key"] + ";<host>"] = bkt["doc_count"]
    return alerts_count


def _compute_attack_graph():
    # Get count of vulnerability, compliance, alerts, secrets
    vulnerability_count = get_vulnerability_count()
    alerts_count = get_alerts_count()
    compliance_count = get_compliance_count()
    cloud_compliance_count = get_cloud_compliance_count()
    secrets_count = get_secrets_count()

    include_nodes = {
        **vulnerability_count, **alerts_count, **compliance_count, **cloud_compliance_count, **secrets_count,
    }

    # Get cloud resources
    cloud_resources = redis.hgetall(CLOUD_RESOURCES_CACHE_KEY)
    aws_cloud_resources = []
    gcp_cloud_resources = []
    azure_cloud_resources = []
    for k, v in cloud_resources.items():
        try:
            if k.startswith(CLOUD_AWS):
                aws_cloud_resources.extend(json.loads(v))
            elif k.startswith(CLOUD_GCP):
                gcp_cloud_resources.extend(json.loads(v))
            elif k.startswith(CLOUD_AZURE):
                azure_cloud_resources.extend(json.loads(v))
        except:
            pass
    graph = nx.DiGraph()
    graph.add_node(incoming_internet_host_id, name="The Internet", node_type="")
    graph.add_node(outgoing_internet_host_id, name="The Internet", node_type="")
    if aws_cloud_resources:
        graph = compute_aws_cloud_network_graph(aws_cloud_resources, graph, include_nodes)
    if gcp_cloud_resources:
        graph = compute_gcp_cloud_network_graph(gcp_cloud_resources, graph, include_nodes)
    if azure_cloud_resources:
        graph = compute_azure_cloud_network_graph(azure_cloud_resources, graph, include_nodes)

    # Get topology data
    topology_hosts = fetch_topology_data(NODE_TYPE_HOST, format="scope")
    graph = get_topology_network_graph(topology_hosts, graph, node_type=NODE_TYPE_HOST, include_nodes=include_nodes)
    topology_containers = fetch_topology_data(NODE_TYPE_CONTAINER, format="scope")
    graph = get_topology_network_graph(
        topology_containers, graph, node_type=NODE_TYPE_CONTAINER, include_nodes=include_nodes)

    attack_graph = {}
    attack_graph_paths = defaultdict(dict)
    attack_graph_node = {}
    node_data = dict(graph.nodes.data())

    for node_id, meta in node_data.items():
        if incoming_internet_host_id == node_id:
            continue
        try:
            shortest_paths_generator_in = nx.shortest_simple_paths(graph, incoming_internet_host_id, node_id)
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
                meta_data = {
                    "label": label,
                    "id": key,
                    "node_type": node_type,
                    "image_name": meta.get("image_name", ""),
                    "name": meta["name"],
                }
                vulnerability_count = 0
                compliance_count = 0
                secrets_count = 0
                alerts_count = 0
                if node_type == NODE_TYPE_HOST:
                    vulnerability_count = cloud_compliance_count.get(meta["name"], 0)
                    compliance_count = cloud_compliance_count.get(node_id, 0)
                    secrets_count = cloud_compliance_count.get(node_id, 0)
                    alerts_count = cloud_compliance_count.get(meta["name"], 0)
                elif node_type == NODE_TYPE_CONTAINER:
                    vulnerability_count = cloud_compliance_count.get(meta["image_name"], 0)
                    compliance_count = cloud_compliance_count.get(node_id, 0)
                    secrets_count = cloud_compliance_count.get(node_id, 0)
                else:
                    compliance_count = cloud_compliance_count.get(node_id, 0)
                if key not in attack_graph_node:
                    attack_graph_node[key] = {"label": label, "id": key, "nodes": {}}
                attack_graph_node[key]["nodes"][node_id] = {
                    "node_id": node_id,
                    "name": meta["name"],
                    "image_name": meta.get("image_name", ""),
                    "node_type": node_type,
                    "vulnerability_count": vulnerability_count,
                    "compliance_count": compliance_count,
                    "secrets_count": secrets_count,
                    "alerts_count": alerts_count,
                }
                if key in attack_graph:
                    if not attack_graph_paths[key][p_str]:
                        attack_graph[key]["attack_path"].append(p)
                    attack_graph[key]["count"] += 1
                else:
                    attack_graph_paths[key][p_str] = True
                    attack_graph[key] = {
                        "attack_path": [p],
                        "count": 1,
                        "vulnerability_count": vulnerability_count,
                        "compliance_count": compliance_count,
                        "secrets_count": secrets_count,
                        "alerts_count": alerts_count,
                        **meta_data,
                    }
        except nx.NetworkXNoPath:
            pass
        except Exception as ex:
            flask_app.logger.error("Error in attack graph: {0}".format(ex))

    redis.set(ATTACK_GRAPH_CACHE_KEY, json.dumps(list(attack_graph.values())))
    attack_graph_node_detail = {k: json.dumps(v) for k, v in attack_graph_node.items()}
    if attack_graph_node_detail:
        redis.hset(ATTACK_GRAPH_NODE_DETAIL_KEY, mapping=attack_graph_node_detail)

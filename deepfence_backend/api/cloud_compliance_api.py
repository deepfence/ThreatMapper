import math
import os
import re
from datetime import datetime
import time
from sqlalchemy import func, exc
from urllib.parse import unquote
from config.app import db
from utils.decorators import non_read_only_user
from models.cloud_resource_node import CloudResourceNode
from models.compliance_rules_disabled import ComplianceRulesDisabled
from flask import Blueprint, request, make_response
from flask import current_app as app
from flask_jwt_extended import jwt_required
from resource_models.node import Node

from models.cloud_compliance_node import CloudComplianceNode
from models.compliance_rules import ComplianceRules
from utils.response import set_response
from utils.esconn import ESConn, GroupByParams
from utils.scope import fetch_topology_data
from collections import defaultdict
from utils.constants import TIME_UNIT_MAPPING, ALL_INDICES, \
    NODE_TYPE_CONTAINER, NODE_TYPE_CONTAINER_IMAGE, ES_TERMS_AGGR_SIZE, COMPLIANCE_CHECK_TYPES, \
    CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, CLOUD_COMPLIANCE_LOGS_INDEX, CLOUD_COMPLIANCE_INDEX, \
    PENDING_CLOUD_COMPLIANCE_SCANS_KEY, CLOUD_COMPLIANCE_LOGS_ES_TYPE, NODE_TYPE_HOST, COMPLIANCE_LINUX_HOST, \
    COMPLIANCE_INDEX, COMPLIANCE_LOGS_INDEX, COMPLIANCE_KUBERNETES_HOST, CSPM_RESOURCES, CSPM_RESOURCE_LABELS, \
    CSPM_RESOURCES_INVERTED, CLOUD_RESOURCES_CACHE_KEY, CLOUD_COMPLIANCE_REFRESH_INVENTORY
from utils.custom_exception import InvalidUsage, DFError
import json
from utils.resource import get_nodes_list, get_default_params
import urllib.parse
from utils.helper import modify_es_index
from config.redisconfig import redis

cloud_compliance_api = Blueprint("cloud_compliance_api", __name__)


@cloud_compliance_api.route("compliance/search", methods=["POST"])
@jwt_required()
def search():
    from_arg = request.args.get("from", 0)
    size_arg = request.args.get("size", 50)
    max_result_window = os.environ.get("MAX_RESULT_WINDOW", 10000)

    number = request.args.get("number")
    time_unit = request.args.get("time_unit")

    if number:
        try:
            number = int(number)
        except ValueError:
            raise InvalidUsage("Number should be an integer value.")

    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")

    if time_unit and time_unit not in TIME_UNIT_MAPPING.keys():
        raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")

    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = unquote(lucene_query_string)

    try:
        max_result_window = int(max_result_window)
    except ValueError:
        raise InvalidUsage("max_result_window should be an integer.")

    try:
        size_arg = int(size_arg)
    except ValueError:
        raise InvalidUsage("Size should be an integer value.")

    sort_order = request.args.get("sort_order", "desc")

    sort_order = sort_order.lower()
    if sort_order not in ["asc", "desc"]:
        raise InvalidUsage("Supported values for sort_order are `asc` and `desc`.")

    sort_by = request.args.get("sort_by", "@timestamp")

    try:
        from_arg = int(from_arg)
    except ValueError:
        raise InvalidUsage("From parameter should be an integer value.")
    if from_arg < 0:
        raise InvalidUsage("From parameter should be a positive integer value.")
    if (from_arg + size_arg) > max_result_window:
        raise InvalidUsage("FROM + SIZE cannot exceed {}".format(max_result_window))

    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    filters = request.json.get("filters")
    if not filters:
        raise InvalidUsage("filters key is required.")

    _type = request.json.get("_type")
    index_name = modify_es_index(_type)
    if not index_name:
        raise InvalidUsage("_type is required")

    _source = request.json.get("_source", [])

    if index_name not in ALL_INDICES:
        raise InvalidUsage("_type should be one of {}".format(ALL_INDICES))

    node_filters = request.json.get("node_filters", {})
    if node_filters:
        if index_name == CLOUD_COMPLIANCE_INDEX:
            tmp_filters = filter_node_for_compliance(node_filters)
            if tmp_filters:
                filters = {**filters, **tmp_filters}
    scripted_sort = None
    if request.args.get("node_type", "") in [COMPLIANCE_LINUX_HOST, COMPLIANCE_KUBERNETES_HOST]:
        index_name = COMPLIANCE_INDEX

    search_response = ESConn.search_by_and_clause(
        index_name,
        filters,
        from_arg,
        sort_order,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string,
        size_arg,
        _source,
        sort_by=sort_by,
        scripted_sort=scripted_sort,
    )

    values_for = request.json.get("values_for", [])

    filters.update({
        "type": _type,
        "masked": "false"
    })

    values_for_response = {}
    if values_for:
        values_for_buckets = ESConn.multi_aggr(
            index_name,
            values_for,
            filters,
            number,
            TIME_UNIT_MAPPING.get(time_unit),
            lucene_query_string=lucene_query_string
        )

        for key, value in values_for_buckets.items():
            value_buckets = value.get("buckets", [])
            value_array = []
            for value_bucket in value_buckets:
                if value_bucket["doc_count"] > 0:
                    value_array.append(value_bucket["key"])
            values_for_response[key] = value_array

    # Add max_result_window to the response.
    search_response["max_result_window"] = max_result_window
    search_response["values_for"] = values_for_response
    search_response["total"] = search_response.get("total", {}).get("value", 0)
    return set_response(data=search_response)


@cloud_compliance_api.route("/compliance/<compliance_check_type>/test_status_report", methods=["GET", "POST"])
@jwt_required()
def compliance_test_status_report(compliance_check_type):
    invalidComplianceCheckType = True
    for compliance_check_types in COMPLIANCE_CHECK_TYPES.values():
        if compliance_check_type and compliance_check_type in compliance_check_types:
            invalidComplianceCheckType = False
            break

    if invalidComplianceCheckType:
        raise InvalidUsage("Invalid compliance_check_type: {0}".format(compliance_check_type))

    number = request.args.get("number")
    time_unit = request.args.get("time_unit")

    if number:
        try:
            number = int(number)
        except ValueError:
            raise InvalidUsage("Number should be an integer value.")

    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")

    if time_unit and time_unit not in TIME_UNIT_MAPPING.keys():
        raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")

    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)
    filters = {}
    if request.is_json:
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        filters = request.json.get("filters", {})
    filters["compliance_check_type"] = compliance_check_type
    node_id = request.json.get("node_id", "")
    scan_id = request.json.get("scan_id", "")
    if node_id:
        if request.args.get("node_type", "") == COMPLIANCE_KUBERNETES_HOST:
            filters["kubernetes_cluster_id"] = node_id
        else:
            filters["node_id"] = node_id
    if scan_id:
        filters["scan_id"] = scan_id
    aggs = {
        "scan_id": {
            "terms": {
                "field": "scan_id.keyword",
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
                "status": {
                    "terms": {
                        "field": "status.keyword",
                        "size": 25
                    }
                }
            }
        }
    }
    es_index = CLOUD_COMPLIANCE_INDEX
    if request.args.get("node_type", "") in [COMPLIANCE_LINUX_HOST, COMPLIANCE_KUBERNETES_HOST]:
        es_index = COMPLIANCE_INDEX
    aggs_response = ESConn.aggregation_helper(
        es_index,
        filters,
        aggs,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string
    )
    response = defaultdict(int)
    if "aggregations" in aggs_response:
        for scan_id_aggr in aggs_response["aggregations"]["scan_id"]["buckets"]:
            for status_aggr in scan_id_aggr["status"]["buckets"]:
                response[status_aggr["key"]] += status_aggr["doc_count"]
    list_response = []
    for label, value in response.items():
        list_response.append({"label": label, "value": value})
    return set_response(data=list_response)


@cloud_compliance_api.route("/compliance/<compliance_check_type>/test_category_report", methods=["GET", "POST"])
@jwt_required()
def compliance_test_category_report(compliance_check_type):
    invalidComplianceCheckType = True
    for compliance_check_types in COMPLIANCE_CHECK_TYPES.values():
        if compliance_check_type and compliance_check_type in compliance_check_types:
            invalidComplianceCheckType = False
            break

    if invalidComplianceCheckType:
        raise InvalidUsage("Invalid compliance_check_type: {0}".format(compliance_check_type))

    number = request.args.get("number")
    time_unit = request.args.get("time_unit")

    if number:
        try:
            number = int(number)
        except ValueError:
            raise InvalidUsage("Number should be an integer value.")

    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")

    if time_unit and time_unit not in TIME_UNIT_MAPPING.keys():
        raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")

    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)
    filters = {}
    if request.is_json:
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        filters = request.json.get("filters", {})
    filters["compliance_check_type"] = compliance_check_type
    node_id = request.json.get("node_id", "")
    scan_id = request.json.get("scan_id", "")
    if node_id:
        if request.args.get("node_type", "") == COMPLIANCE_KUBERNETES_HOST:
            filters["kubernetes_cluster_id"] = node_id
        else:
            filters["node_id"] = node_id
    if scan_id:
        filters["scan_id"] = scan_id
    service_key = "service"
    if request.args.get("node_type", "") in [COMPLIANCE_LINUX_HOST, COMPLIANCE_KUBERNETES_HOST]:
        service_key = "test_category"
    aggs = {
        "node_id": {
            "terms": {
                "field": "node_id.keyword",
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
                "service": {
                    "terms": {
                        "field": "{}.keyword".format(service_key),
                        "size": 25
                    },
                    "aggs": {
                        "status": {
                            "terms": {
                                "field": "status.keyword",
                                "size": 25
                            }
                        }
                    }
                }
            }
        }
    }
    es_index = CLOUD_COMPLIANCE_INDEX
    if request.args.get("node_type", "") in [COMPLIANCE_LINUX_HOST, COMPLIANCE_KUBERNETES_HOST]:
        es_index = COMPLIANCE_INDEX
    aggs_response = ESConn.aggregation_helper(
        es_index,
        filters,
        aggs,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string
    )
    response = []
    unique_status_list = set()

    if "aggregations" in aggs_response:
        for node_aggr in aggs_response["aggregations"]["node_id"]["buckets"]:
            for category_aggr in node_aggr["service"]["buckets"]:
                data = {"node": category_aggr.get("key")}
                for status_aggr in category_aggr["status"]["buckets"]:
                    status_data = {"value": status_aggr.get("doc_count"), "type": status_aggr.get("key"), **data}
                    response.append(status_data)

    return set_response(data=response)


def filter_node_for_compliance(node_filters):
    host_names = []
    node_names = []
    k8_names = []
    k8s_namespaces = node_filters.get("kubernetes_namespace", [])
    if k8s_namespaces and type(k8s_namespaces) != list:
        k8s_namespaces = [k8s_namespaces]
    if node_filters.get("host_name"):
        host_names.extend(node_filters["host_name"])
    if node_filters.get("kubernetes_cluster_name"):
        k8_names.extend(node_filters["kubernetes_cluster_name"])
    if node_filters.get("container_name"):
        node_names.extend(node_filters["container_name"])
    container_filters = {k: v for k, v in node_filters.items() if k in [
        "user_defined_tags"]}
    if container_filters:
        containers = get_nodes_list(get_default_params({"filters": {
            "type": NODE_TYPE_CONTAINER, **node_filters}, "size": 50000})).get("data", [])
        if containers:
            for container in containers:
                if container.get("container_name") and container.get("host_name"):
                    container_name = "{0}/{1}".format(
                        container["host_name"], container["container_name"])
                    if container_name not in node_names:
                        if k8s_namespaces:
                            for table in container.get("tables", []):
                                if table.get("id") == "docker_label_":
                                    for row in table.get("rows", []):
                                        if row.get("id") == "label_io.kubernetes.pod.namespace":
                                            if row.get("entries", {}).get("value", "") in k8s_namespaces:
                                                node_names.append(
                                                    container_name)
                        else:
                            node_names.append(container_name)
    if node_filters.get("image_name_with_tag"):
        node_names.extend(node_filters["image_name_with_tag"])
    image_filters = {k: v for k, v in node_filters.items() if k in [
        "user_defined_tags"]}
    if image_filters:
        images = get_nodes_list(get_default_params({"filters": {
            "type": NODE_TYPE_CONTAINER_IMAGE, **node_filters}, "size": 50000})).get("data", [])
        if images:
            for image in images:
                if image.get("image_name_with_tag") and image["image_name_with_tag"] not in node_names:
                    node_names.append(image["image_name_with_tag"])
    filters = {}
    if host_names:
        filters["node_name"] = host_names
    if node_names:
        node_names.extend(host_names)
        filters["node_name"] = node_names
    if k8_names:
        filters["kubernetes_cluster_name"] = k8_names
    return filters


@cloud_compliance_api.route("/cloud-compliance-scan/nodes", methods=["GET"])
@jwt_required()
def cloud_compliance_scan_nodes():
    """
    Get list of nodes available for cloud compliance scans
    :return:
    """

    number = request.args.get("number")
    time_unit = request.args.get("time_unit")

    if number:
        try:
            number = int(number)
        except ValueError:
            raise InvalidUsage("Number should be an integer value.")

    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")

    if time_unit and time_unit not in TIME_UNIT_MAPPING.keys():
        raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")

    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)
    else:
        lucene_query_string = ""

    cloud_provider = request.args.get("cloud_provider")
    if cloud_provider == "linux":
        hosts = fetch_topology_data(node_type=NODE_TYPE_HOST, format="deepfence")
        nodes_list = []
        for host_id, host in hosts.items():
            if host.get("kubernetes_cluster_name", None) is None and host.get("parents", None) \
                    and host.get("is_ui_vm", False) is False:
                nodes_list.append(
                    {"node_name": host.get("host_name", ""), "node_id": host.get("scope_id", ""), "enabled": True})
        return set_response({"nodes": nodes_list})
    if cloud_provider == "kubernetes":
        nodes_list = []
        cloud_compliance_nodes = CloudComplianceNode.query.filter_by(cloud_provider=cloud_provider).all()
        node_ids = []
        for node in cloud_compliance_nodes:
            node_details_str = redis.hget(CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, node.node_id)
            node_details = json.loads(node_details_str)
            nodes_list.append({"node_name": node.node_id, "node_id": node.node_id,
                               "enabled": (datetime.now().timestamp() - node_details.get("updated_at", 0) < 250.0)})
            node_ids.append(node.node_id)
        filters = {
            "scan_status": "COMPLETED",
            "node_id": node_ids
        }
        aggs = {
            "node_id": {
                "terms": {
                    "field": "node_id.keyword",
                    "size": ES_TERMS_AGGR_SIZE
                },
                "aggs": {
                    "compliance_check_type": {
                        "terms": {
                            "field": "compliance_check_type.keyword",
                            "size": ES_TERMS_AGGR_SIZE
                        },
                        "aggs": {
                            "docs": {
                                "top_hits": {
                                    "size": 1,
                                    "sort": [{"@timestamp": {"order": "desc"}}],
                                    "_source": {"includes": ["result"]}
                                }
                            }
                        }
                    }
                }
            }
        }
        aggs_response = ESConn.aggregation_helper(COMPLIANCE_LOGS_INDEX, filters, aggs, number,
                                                  TIME_UNIT_MAPPING.get(time_unit), lucene_query_string)
        node_compliance_percentage = {}
        if "aggregations" in aggs_response:
            cloud_total = defaultdict(int)
            for node_id_aggr in aggs_response['aggregations']['node_id']['buckets']:
                total = defaultdict(int)
                for compliance_check_type_aggr in node_id_aggr['compliance_check_type']['buckets']:
                    if compliance_check_type_aggr["key"] not in COMPLIANCE_CHECK_TYPES.get(cloud_provider, []):
                        continue
                    result_docs = compliance_check_type_aggr.get('docs', {}).get('hits', {}).get('hits', [])
                    if result_docs:
                        result = result_docs[0]['_source']['result']
                        if result['alarm'] > 0:
                            total['alarm'] += result['alarm']
                            cloud_total['alarm'] += result['alarm']
                        if result['info'] > 0:
                            total['info'] += result['info']
                            cloud_total['info'] += result['info']
                        if result['ok'] > 0:
                            total['ok'] += result['ok']
                            cloud_total['ok'] += result['ok']
                        if result['skip'] > 0:
                            total['skip'] += result['skip']
                            cloud_total['skip'] += result['skip']
                if total:
                    node_compliance_percentage[node_id_aggr['key']] = \
                        (total['ok'] + total['info']) * 100 / \
                        (total['ok'] + total['info'] + total['alarm'] + total['skip'])
        for node_item in nodes_list:
            node_item["compliance_percentage"] = node_compliance_percentage.get(node_item["node_id"], 0.0)
        return set_response({"nodes": nodes_list})

    cloud_compliance_nodes = CloudComplianceNode.query.filter_by(cloud_provider=cloud_provider).all()

    if not cloud_compliance_nodes:
        return set_response({"nodes": []})
    nodes_list = []
    current_timestamp = datetime.now().timestamp()
    node_ids = []
    if cloud_provider:
        aggs_cc_scan = {
            "node_id": {
                "terms": {
                    "field": "node_id.keyword"
                },
                "aggs": {
                    "recent_scan_aggr": {
                        "max": {
                            "field": "@timestamp"
                        }
                    }
                }
            }
        }
        aggs_response = ESConn.aggregation_helper(CLOUD_COMPLIANCE_LOGS_INDEX, {"scan_status": "COMPLETED"},
                                                  aggs_cc_scan)
        node_id_ts_map = {}
        for bucket in aggs_response.get("aggregations", {}).get("node_id", {}).get("buckets", []):
            node_id_ts_map[bucket.get("key", "")] = bucket.get("recent_scan_aggr", {}).get("value_as_string", "")
        for node in cloud_compliance_nodes:
            node_item = node.pretty_print()
            node_details_str = redis.hget(CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, node.node_id)
            if node_details_str:
                node_details = json.loads(node_details_str)
                node_item["enabled"] = (current_timestamp - node_details["updated_at"] < 250.0)
            else:
                node_item["enabled"] = False
            node_item["account_id"] = node_item["node_name"]
            if node_id_ts_map.get(node_item["node_id"], None):
                node_item["last_scanned_ts"] = node_id_ts_map[node_item["node_id"]]
            nodes_list.append(node_item)
            node_ids.append(node.node_id)
    filters = {
        "scan_status": "COMPLETED",
        "node_id": node_ids
    }
    aggs = {
        "node_id": {
            "terms": {
                "field": "node_id.keyword",
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
                "compliance_check_type": {
                    "terms": {
                        "field": "compliance_check_type.keyword",
                        "size": ES_TERMS_AGGR_SIZE
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "size": 1,
                                "sort": [{"@timestamp": {"order": "desc"}}],
                                "_source": {"includes": ["result"]}
                            }
                        }
                    }
                }
            }
        }
    }
    aggs_response = ESConn.aggregation_helper(CLOUD_COMPLIANCE_LOGS_INDEX, filters, aggs, number,
                                              TIME_UNIT_MAPPING.get(time_unit), lucene_query_string)
    node_compliance_percentage = {}
    node_total = {}
    cloud_compliance_percentage = 0.0
    if "aggregations" in aggs_response:
        cloud_total = defaultdict(int)
        for node_id_aggr in aggs_response['aggregations']['node_id']['buckets']:
            total = defaultdict(int)
            for compliance_check_type_aggr in node_id_aggr['compliance_check_type']['buckets']:
                if compliance_check_type_aggr["key"] not in COMPLIANCE_CHECK_TYPES.get(cloud_provider, []):
                    continue
                result_docs = compliance_check_type_aggr.get('docs', {}).get('hits', {}).get('hits', [])
                if result_docs:
                    result = result_docs[0]['_source']['result']
                    if result['alarm'] > 0:
                        total['alarm'] += result['alarm']
                        cloud_total['alarm'] += result['alarm']
                    if result['info'] > 0:
                        total['info'] += result['info']
                        cloud_total['info'] += result['info']
                    if result['ok'] > 0:
                        total['ok'] += result['ok']
                        cloud_total['ok'] += result['ok']
                    if result['skip'] > 0:
                        total['skip'] += result['skip']
                        cloud_total['skip'] += result['skip']
            if total:
                node_total[node_id_aggr['key']] = total
                node_compliance_percentage[node_id_aggr['key']] = \
                    (total['ok'] + total['info']) * 100 / \
                    (total['ok'] + total['info'] + total['alarm'] + total['skip'])

        if cloud_total:
            cloud_compliance_percentage = \
                (cloud_total['ok'] + cloud_total['info']) * 100 / \
                (cloud_total['ok'] + cloud_total['info'] + cloud_total['alarm'] + cloud_total['skip'])

    org_map = defaultdict(list)
    for node_item in nodes_list:
        node_item["compliance_percentage"] = node_compliance_percentage.get(node_item["node_id"], 0.0)
        org_map[node_item["org_account_id"]].append(node_item)

    org_list = []
    for org_id, org_nodes in org_map.items():
        if org_id is None:
            for node_item in org_nodes:
                org_list.append(node_item)
            continue
        org_total = defaultdict(int)
        org_node_name = ""
        for org_node in org_nodes:
            if org_node["node_id"].split(";")[0] == org_node["org_account_id"].split(";")[0]:
                org_node_name = org_node["node_name"]
            for status in ["alarm", "info", "ok", "skip"]:
                org_total[status] += node_total.get(org_node["node_id"], {}).get(status, 0)
        org_compliance_percentage = 0.0
        if org_total and (org_total['ok'] + org_total['info'] + org_total['alarm'] + org_total['skip']) != 0:
            org_compliance_percentage = (org_total['ok'] + org_total['info']) * 100 / (org_total['ok'] +
                org_total['info'] + org_total['alarm'] + org_total['skip'])
        org_details_str = redis.hget(CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, org_id)
        enabled = False
        if org_details_str:
            org_details = json.loads(org_details_str)
            enabled = (current_timestamp - org_details["updated_at"] < 250.0)
        org_list.append({
            "node_id": org_id,
            "node_name": org_node_name if org_node_name != "" else org_id.replace("aws-", "").split(";")[0],
            "cloud_provider": cloud_provider,
            "compliance_percentage": org_compliance_percentage,
            "account_id": org_id.replace("aws-", "").split(";")[0],
            "nodes": org_nodes,
            "enabled": enabled,
        })

    resource_count = CloudResourceNode.query.filter_by(cloud_provider=cloud_provider).count()
    total_scans = ESConn.count(CLOUD_COMPLIANCE_LOGS_INDEX, filters)
    return set_response({"nodes": org_list, "compliance_percentage": cloud_compliance_percentage,
                         "total_resources": resource_count, "total_scans": total_scans})


@cloud_compliance_api.route("/cloud-compliance-scan/organization/nodes", methods=["GET"])
@jwt_required()
def cloud_compliance_scan_organization_nodes():
    """
    Get list of organization nodes available for cloud compliance scans
    :return:
    """

    number = request.args.get("number")
    time_unit = request.args.get("time_unit")

    if number:
        try:
            number = int(number)
        except ValueError:
            raise InvalidUsage("Number should be an integer value.")

    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")

    if time_unit and time_unit not in TIME_UNIT_MAPPING.keys():
        raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")

    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)
    else:
        lucene_query_string = ""

    cloud_provider = request.args.get("cloud_provider")
    cloud_compliance_nodes = CloudComplianceNode.query.filter_by(cloud_provider=cloud_provider).filter(
        CloudComplianceNode.org_account_id.is_not(None)).order_by(CloudComplianceNode.org_account_id).all()
    if not cloud_compliance_nodes:
        return set_response({"nodes": []})
    nodes_list = []
    current_timestamp = datetime.now().timestamp()
    node_ids = []
    if cloud_provider:
        aggs_cc_scan = {
            "node_id": {
                "terms": {
                    "field": "node_id.keyword"
                },
                "aggs": {
                    "recent_scan_aggr": {
                        "max": {
                            "field": "@timestamp"
                        }
                    }
                }
            }
        }
        aggs_response = ESConn.aggregation_helper(CLOUD_COMPLIANCE_LOGS_INDEX, {"scan_status": "COMPLETED"},
                                                  aggs_cc_scan)
        node_id_ts_map = {}
        for bucket in aggs_response.get("aggregations", {}).get("node_id", {}).get("buckets", []):
            node_id_ts_map[bucket.get("key", "")] = bucket.get("recent_scan_aggr", {}).get("value_as_string", "")
        for node in cloud_compliance_nodes:
            node_item = node.pretty_print()
            node_details_str = redis.hget(CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, node.node_id)
            if node_details_str:
                node_details = json.loads(node_details_str)
                node_item["enabled"] = (current_timestamp - node_details["updated_at"] < 250.0)
            else:
                node_item["enabled"] = False
            node_item["account_id"] = node_item["node_name"]
            if node_id_ts_map.get(node_item["node_id"], None):
                node_item["last_scanned_ts"] = node_id_ts_map[node_item["node_id"]]
            nodes_list.append(node_item)
            node_ids.append(node.node_id)
    filters = {
        "scan_status": "COMPLETED",
        "node_id": node_ids
    }
    aggs = {
        "node_id": {
            "terms": {
                "field": "node_id.keyword",
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
                "compliance_check_type": {
                    "terms": {
                        "field": "compliance_check_type.keyword",
                        "size": ES_TERMS_AGGR_SIZE
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "size": 1,
                                "sort": [{"@timestamp": {"order": "desc"}}],
                                "_source": {"includes": ["result"]}
                            }
                        }
                    }
                }
            }
        }
    }
    aggs_response = ESConn.aggregation_helper(CLOUD_COMPLIANCE_LOGS_INDEX, filters, aggs, number,
                                              TIME_UNIT_MAPPING.get(time_unit), lucene_query_string)
    node_compliance_percentage = {}
    node_total = {}
    cloud_compliance_percentage = 0.0
    if "aggregations" in aggs_response:
        cloud_total = defaultdict(int)
        for node_id_aggr in aggs_response['aggregations']['node_id']['buckets']:
            total = defaultdict(int)
            for compliance_check_type_aggr in node_id_aggr['compliance_check_type']['buckets']:
                if compliance_check_type_aggr["key"] not in COMPLIANCE_CHECK_TYPES.get(cloud_provider, []):
                    continue
                result_docs = compliance_check_type_aggr.get('docs', {}).get('hits', {}).get('hits', [])
                if result_docs:
                    result = result_docs[0]['_source']['result']
                    if result['alarm'] > 0:
                        total['alarm'] += result['alarm']
                        cloud_total['alarm'] += result['alarm']
                    if result['info'] > 0:
                        total['info'] += result['info']
                        cloud_total['info'] += result['info']
                    if result['ok'] > 0:
                        total['ok'] += result['ok']
                        cloud_total['ok'] += result['ok']
                    if result['skip'] > 0:
                        total['skip'] += result['skip']
                        cloud_total['skip'] += result['skip']
            if total:
                node_total[node_id_aggr['key']] = total
                node_compliance_percentage[node_id_aggr['key']] = (total['ok'] + total['info']) * 100 / (total['ok'] +
                                                                                                         total['info'] +
                                                                                                         total[
                                                                                                             'alarm'] +
                                                                                                         total['skip'])

        if cloud_total:
            cloud_compliance_percentage = (cloud_total['ok'] + cloud_total['info']) * 100 / (cloud_total['ok'] +
                                                                                             cloud_total['info'] +
                                                                                             cloud_total['alarm'] +
                                                                                             cloud_total['skip'])

    org_map = defaultdict(list)
    for node_item in nodes_list:
        node_item["compliance_percentage"] = node_compliance_percentage.get(node_item["node_id"], 0.0)
        org_map[node_item["org_account_id"]].append(node_item)

    org_list = []
    for org_id, org_nodes in org_map.items():
        org_total = defaultdict(int)
        for org_node in org_nodes:
            for status in ["alarm", "info", "ok", "skip"]:
                org_total[status] += node_total.get(org_node["node_id"], {}).get(status, 0)
        org_compliance_percentage = 0.0
        if org_total and (org_total['ok'] + org_total['info'] + org_total['alarm'] + org_total['skip']) != 0:
            org_compliance_percentage = (org_total['ok'] + org_total['info']) * 100 / (org_total['ok'] +
                                                                                       org_total['info'] + org_total[
                                                                                           'alarm'] + org_total['skip'])
        org_list.append({
            "account_id": org_id,
            "compliance_percentage": org_compliance_percentage,
            "nodes": org_nodes
        })

    return set_response({"nodes": org_list, "compliance_percentage": cloud_compliance_percentage})


@cloud_compliance_api.route("/cloud-compliance-scan/scans", methods=["GET"])
@jwt_required()
def cloud_compliance_node_scans():
    """
    Get list of cloud compliance scans for a specific node
    :return:
    """
    # required fields
    number = request.args.get("number")
    time_unit = request.args.get("time_unit")

    if number:
        try:
            number = int(number)
        except ValueError:
            raise InvalidUsage("Number should be an integer value.")

    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")

    if time_unit and time_unit not in TIME_UNIT_MAPPING.keys():
        raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")

    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)
    else:
        lucene_query_string = ""

    node_id = request.args.get("node_id")
    compliance_check_type = request.args.get("compliance_check_type")
    if not node_id:
        raise InvalidUsage("node id is missing")
    invalidComplianceCheckType = True
    for compliance_check_types in COMPLIANCE_CHECK_TYPES.values():
        if compliance_check_type and compliance_check_type in compliance_check_types:
            invalidComplianceCheckType = False
            break

    if invalidComplianceCheckType:
        raise InvalidUsage("Invalid compliance_check_type: {0}".format(compliance_check_type))

    filters = {"compliance_check_type": compliance_check_type, "scan_status": "COMPLETED"}
    if request.args.get("node_type", "") == COMPLIANCE_KUBERNETES_HOST:
        filters["kubernetes_cluster_id"] = node_id
    else:
        filters["node_id"] = node_id
    if ";<cloud_org>" in node_id:
        filters["node_id"] = []
        filters["node_id"].append(node_id)
        cloud_compliance_nodes = CloudComplianceNode.query.filter_by(org_account_id=node_id).all()
        for cloud_compliance_node in cloud_compliance_nodes:
            filters["node_id"].append(cloud_compliance_node.node_id)

    page_size = 10
    start_index = 0
    page_size = request.args.get("size", page_size)
    start_index = request.args.get("start_index", start_index)
    sort_order = request.args.get("sort_order", "desc")
    es_index = CLOUD_COMPLIANCE_LOGS_INDEX
    if request.args.get("node_type", "") in [COMPLIANCE_LINUX_HOST, COMPLIANCE_KUBERNETES_HOST]:
        es_index = COMPLIANCE_LOGS_INDEX
    es_resp = ESConn.search_by_and_clause(
        es_index, filters, start_index, sort_order, number=number,
        time_unit=TIME_UNIT_MAPPING.get(time_unit), size=page_size, lucene_query_string=lucene_query_string)
    if request.args.get("node_type", "") in [COMPLIANCE_LINUX_HOST, COMPLIANCE_KUBERNETES_HOST]:
        added_scan_id = {}
        hits = es_resp.get("hits", [])
        es_resp["hits"] = []
        for scan in hits:
            source = scan.get("_source", {})
            if added_scan_id.get(source.get("scan_id", ""), False):
                continue
            else:
                added_scan_id[source.get("scan_id", "")] =  True
            result = source.get("result", {})
            if request.args.get("node_type", "") == COMPLIANCE_KUBERNETES_HOST:
                total = result.get("alarm", 0) + result.get("error", 0) + result.get("ok", 1) + result.get("info", 1)
                checks_passed = result.get("ok", 0)
            else:
                total = result.get("pass", 0) + result.get("warn", 0) + result.get("note", 1)
                checks_passed = result.get("pass", 0)
            total = 1 if total == 0 else total
            source["result"]["compliance_percentage"] = (checks_passed * 100) / total
            es_resp.get("hits").append(scan)
    es_resp["node_type"] = request.args.get("node_type", "")
    return set_response(data=es_resp)


@cloud_compliance_api.route("/cloud-compliance-scan/summary", methods=["GET"])
@jwt_required()
def get_compliance_report():
    # required fields
    number = request.args.get("number")
    time_unit = request.args.get("time_unit")

    if number:
        try:
            number = int(number)
        except ValueError:
            raise InvalidUsage("Number should be an integer value.")

    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")

    if time_unit and time_unit not in TIME_UNIT_MAPPING.keys():
        raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")
    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)
    else:
        lucene_query_string = ""

    node_id = request.args.get("node_id")
    compliance_check_type = request.args.get("compliance_check_type")
    if not node_id:
        raise InvalidUsage("node id is missing")
    invalidComplianceCheckType = True
    for compliance_check_types in COMPLIANCE_CHECK_TYPES.values():
        if compliance_check_type and compliance_check_type in compliance_check_types:
            invalidComplianceCheckType = False
            break

    if invalidComplianceCheckType:
        raise InvalidUsage("Invalid compliance_check_type: {0}".format(compliance_check_type))

    filters = {"compliance_check_type": compliance_check_type, "scan_status": "COMPLETED"}
    if request.args.get("node_type", "") == COMPLIANCE_KUBERNETES_HOST:
        filters["kubernetes_cluster_id"] = node_id
    else:
        filters["node_id"] = node_id
    if ";<cloud_org>" in node_id:
        filters["node_id"] = []
        filters["node_id"].append(node_id)
        cloud_compliance_nodes = CloudComplianceNode.query.filter_by(org_account_id=node_id).all()
        for cloud_compliance_node in cloud_compliance_nodes:
            filters["node_id"].append(cloud_compliance_node.node_id)
    page_size = 1
    start_index = 0
    page_size = request.args.get("size", page_size)
    start_index = request.args.get("start_index", start_index)
    sort_order = request.args.get("sort_order", "desc")

    es_index = CLOUD_COMPLIANCE_LOGS_INDEX
    if request.args.get("node_type", "") in [COMPLIANCE_LINUX_HOST, COMPLIANCE_KUBERNETES_HOST]:
        es_index = COMPLIANCE_LOGS_INDEX
    es_resp = ESConn.search_by_and_clause(
        es_index, filters, start_index, sort_order, number=number,
        time_unit=TIME_UNIT_MAPPING.get(time_unit), size=page_size, lucene_query_string=lucene_query_string)

    unify = {
        "compliance_scan_status": []
    }

    if es_resp.get("hits", []):
        scan_doc = es_resp["hits"][0]
        if scan_doc.get("_source", {}):
            unify["compliance_scan_status"].append({
                "aggs": [],
                "compliance_check_type": compliance_check_type,
                "count": 0,
                "time_stamp": scan_doc["_source"]["time_stamp"]
            })
            total = 0
            if scan_doc["_source"].get("result", {}).get("alarm", 0) > 0:
                unify["compliance_scan_status"][0]["aggs"].append(
                    {"label": "alarm", "value": scan_doc["_source"]["result"]["alarm"]})
                total = total + scan_doc["_source"]["result"]["alarm"]
            if scan_doc["_source"].get("result", {}).get("ok", 0) > 0:
                unify["compliance_scan_status"][0]["aggs"].append(
                    {"label": "ok", "value": scan_doc["_source"]["result"]["ok"]})
                total = total + scan_doc["_source"]["result"]["ok"]
            if scan_doc["_source"].get("result", {}).get("info", 0) > 0:
                unify["compliance_scan_status"][0]["aggs"].append(
                    {"label": "info", "value": scan_doc["_source"]["result"]["info"]})
                total = total + scan_doc["_source"]["result"]["info"]
            if scan_doc["_source"].get("result", {}).get("skip", 0) > 0:
                unify["compliance_scan_status"][0]["aggs"].append(
                    {"label": "skip", "value": scan_doc["_source"]["result"]["skip"]})
                total = total + scan_doc["_source"]["result"]["skip"]
            if scan_doc["_source"].get("result", {}).get("note", 0) > 0:
                unify["compliance_scan_status"][0]["aggs"].append(
                    {"label": "note", "value": scan_doc["_source"]["result"]["note"]})
                total = total + scan_doc["_source"]["result"]["note"]
            if scan_doc["_source"].get("result", {}).get("pass", 0) > 0:
                unify["compliance_scan_status"][0]["aggs"].append(
                    {"label": "pass", "value": scan_doc["_source"]["result"]["pass"]})
                total = total + scan_doc["_source"]["result"]["pass"]
            if scan_doc["_source"].get("result", {}).get("warn", 0) > 0:
                unify["compliance_scan_status"][0]["aggs"].append(
                    {"label": "warn", "value": scan_doc["_source"]["result"]["warn"]})
                total = total + scan_doc["_source"]["result"]["warn"]
            if total > 0:
                unify["compliance_scan_status"][0]["count"] = total

    return set_response(data=unify)


@cloud_compliance_api.route("/compliance/<compliance_check_type>/controls", methods=["GET"])
@jwt_required()
def compliance_rules(compliance_check_type):
    cloud_provider = request.args.get("cloud_provider", None)
    if cloud_provider not in COMPLIANCE_CHECK_TYPES.keys():
        raise InvalidUsage("Invalid cloud provider {0}".format(cloud_provider))
    if not compliance_check_type or compliance_check_type not in COMPLIANCE_CHECK_TYPES.get(cloud_provider, []):
        raise InvalidUsage("Invalid compliance check type {0}".format(compliance_check_type))
    node_id = request.args.get("node_id", None)
    if not node_id:
        raise InvalidUsage("Node id is required {0}".format(node_id))

    rules = ComplianceRules.get_rules_with_status(compliance_check_type=compliance_check_type,
                                                  cloud_provider=cloud_provider,
                                                  node_id=node_id)

    if not rules:
        rules = []
    response = {
        "rules": [{
            "id": rule.id,
            "compliance_check_type": rule.compliance_check_type,
            "cloud_provider": rule.cloud_provider,
            "test_category": rule.test_category,
            "test_number": rule.test_number,
            "test_desc": rule.test_desc,
            "is_enabled": rule.is_enabled,
        } for rule in rules]
    }
    return set_response(data=response)


@cloud_compliance_api.route("/cloud-compliance-scan/<path:node_id>/start", methods=["POST"],
                            endpoint="api_v1_5_start_cloud_compliance_scan")
@jwt_required()
@non_read_only_user
def start_cloud_compliance_scan(node_id):
    if not request.is_json:
        raise InvalidUsage("Missing JSON post data in request")
    post_data = request.json
    if not post_data.get("compliance_check_type", []):
        raise InvalidUsage("Compliance check type cannot be empty")

    if post_data.get("node_type", "") in [COMPLIANCE_LINUX_HOST, COMPLIANCE_KUBERNETES_HOST]:
        for compliance_check_type in post_data.get("compliance_check_type", []):
            if post_data.get("node_type", "") == COMPLIANCE_LINUX_HOST:
                node = Node.get_node(0, node_id, "host")
                node.compliance_start_scan(compliance_check_type, None)
        if post_data.get("node_type", "") == COMPLIANCE_KUBERNETES_HOST:
            scan_id = node_id + "_" + datetime.now().strftime(
                "%Y-%m-%dT%H:%M:%S") + ".000"
            time_time = time.time()
            es_doc = {
                "total_checks": 0,
                "result": {},
                "node_id": node_id,
                "node_type": COMPLIANCE_KUBERNETES_HOST,
                "compliance_check_type": "cis",
                "masked": "false",
                "node_name": "",
                "host_name": node_id,
                "scan_status": "QUEUED",
                "scan_message": "",
                "scan_id": scan_id,
                "time_stamp": int(time_time * 1000.0),
                "kubernetes_cluster_id": node_id,
                "kubernetes_cluster_name": node_id,
                "@timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.") + repr(time_time).split('.')[1][:3] + "Z"
            }
            ESConn.create_doc(COMPLIANCE_LOGS_INDEX, es_doc)
            scan_list = [{
                "scan_id": scan_id,
                "scan_type": "cis",
                "account_id": node_id
            }]
            redis.hset(PENDING_CLOUD_COMPLIANCE_SCANS_KEY, node_id, json.dumps(scan_list))

        return set_response(data={"message": "Scans queued successfully"}, status=200)

    if node_id.endswith(";<cloud_org>"):
        accounts = CloudComplianceNode.query.filter_by(org_account_id=node_id).all()
    else:
        accounts = [CloudComplianceNode.query.filter_by(node_id=node_id).first()]

    if not accounts:
        return set_response(data={"message": "node_id not found"}, status=404)

    cloud_provider = post_data.get("node_type", "")

    for account in accounts:
        scan_list = []
        current_pending_scans = redis.hget(PENDING_CLOUD_COMPLIANCE_SCANS_KEY, account.node_id)

        if current_pending_scans:
            scan_list.extend(json.loads(current_pending_scans))

        for compliance_check_type in post_data.get("compliance_check_type", []):
            enabled_rules = ComplianceRules.get_rules_with_status(compliance_check_type=compliance_check_type,
                                                                  cloud_provider=cloud_provider,
                                                                  node_id=account.node_id)
            controls = [compliance_rule.test_number for compliance_rule in
                        list(filter(lambda x: x.is_enabled, enabled_rules))]
            if controls:
                time_time = time.time()
                scan_id = account.node_id + "_" + compliance_check_type + "_" + datetime.now().strftime(
                    "%Y-%m-%dT%H:%M:%S") + ".000"
                es_doc = {
                    "total_checks": 0,
                    "result": {},
                    "node_id": account.node_id,
                    "compliance_check_type": compliance_check_type,
                    "masked": "false",
                    "node_name": "",
                    "type": CLOUD_COMPLIANCE_LOGS_ES_TYPE,
                    "scan_status": "QUEUED",
                    "scan_message": "",
                    "scan_id": scan_id,
                    "time_stamp": int(time_time * 1000.0),
                    "@timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.") + repr(time_time).split('.')[1][:3] +
                                  "Z"
                }
                ESConn.create_doc(CLOUD_COMPLIANCE_LOGS_INDEX, es_doc)
                scan_list.append({
                    "scan_id": scan_id,
                    "scan_type": compliance_check_type,
                    "controls": controls,
                    "account_id": account.node_name
                })
        redis.hset(PENDING_CLOUD_COMPLIANCE_SCANS_KEY, account.node_id, json.dumps(scan_list))

    return set_response(data={"message": "Scans queued successfully"}, status=200)


@cloud_compliance_api.route("/cloud-compliance/<path:node_id>/refresh", methods=["POST"],
                            endpoint="api_v1_5_refresh_inventory")
@jwt_required()
@non_read_only_user
def refresh_cloud_compliance_inventory(node_id):
    # set CLOUD_COMPLIANCE_REFRESH_INVENTORY
    redis.hset(CLOUD_COMPLIANCE_REFRESH_INVENTORY, node_id, "true")
    return set_response(data={"message": "Refreshing inventory"}, status=200)


@cloud_compliance_api.route("/compliance/update_controls", methods=["POST"])
@jwt_required()
@non_read_only_user
def compliance_rules_update():
    """
    Compliance API - Enable / Disable Controls
    """
    if not request.is_json:
        raise InvalidUsage("Missing JSON post data in request")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    action = request.json.get("action", "enable")
    if action not in ["enable", "disable"]:
        raise InvalidUsage("action must be enable or disable")

    node_id = request.json.get("node_id", None)
    if not node_id:
        raise InvalidUsage("missing node_id")

    is_enabled = True
    if action == "disable":
        is_enabled = False
    rule_id_list = request.json.get("rule_id_list")
    if not rule_id_list:
        raise InvalidUsage("rule_id_list is required")
    if type(rule_id_list) != list:
        raise InvalidUsage("rule_id_list must be list")

    if is_enabled:
        disabled_rules = ComplianceRulesDisabled.query.filter_by(disabled_rule_id=func.any(rule_id_list)).all()
        for rule_id in rule_id_list:
            if rule_id not in disabled_rules:
                rule_id_list.remove(rule_id)
        ComplianceRulesDisabled.bulk_delete(rule_id_list, node_id)

    else:
        disabled_rules = ComplianceRulesDisabled.query.filter_by(disabled_rule_id=func.any(rule_id_list)).all()
        # remove disabled rules from enabled rules
        for disabled_rule in disabled_rules:
            rule_id_list.remove(disabled_rule.disabled_rule_id)
        ComplianceRulesDisabled.bulk_insert(rule_id_list, node_id)

    return set_response(status=201)


@cloud_compliance_api.route("/cloud_compliance/cloud_account", methods=["POST"],
                            endpoint="api_v1_5_register_cloud_account_cloud_compliance_scan")
@jwt_required()
@non_read_only_user
def register_cloud_account():
    if not request.is_json:
        raise InvalidUsage("Missing JSON post data in request")

    post_data = request.json
    if not post_data["node_id"]:
        raise InvalidUsage("Node ID is required for cloud registration")

    monitored_account_ids = post_data.get("monitored_account_ids", {})
    org_account_id = post_data.get("org_acc_id", None)
    updated_at_timestamp = datetime.now().timestamp()
    scan_list = {}

    # get refresh status and set false
    do_refresh = redis.hget(CLOUD_COMPLIANCE_REFRESH_INVENTORY, post_data["node_id"])
    if not do_refresh:
        do_refresh = "false"
    if do_refresh == "true":
        redis.hset(CLOUD_COMPLIANCE_REFRESH_INVENTORY, post_data["node_id"], "false")
    if monitored_account_ids:
        if not org_account_id:
            raise InvalidUsage("Org account id is needed for multi account setup")
        monitored_account_ids[post_data["cloud_account"]] = post_data["node_id"]
        node = {
            "node_id": "{}-{};<cloud_org>".format(post_data["cloud_provider"], org_account_id),
            "cloud_provider": post_data["cloud_provider"],
            "account_id": org_account_id,
            "updated_at": updated_at_timestamp
        }
        redis.hset(CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, node["node_id"], json.dumps(node))
        for monitored_account_id, monitored_node_id in monitored_account_ids.items():
            node = None
            compliance_scan_node_details_str = redis.hget(CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, monitored_node_id)
            if compliance_scan_node_details_str:
                node = json.loads(compliance_scan_node_details_str)

            if node and updated_at_timestamp > node["updated_at"]:
                node["updated_at"] = updated_at_timestamp
            elif not node:
                node = {
                    "node_id": monitored_node_id,
                    "cloud_provider": post_data["cloud_provider"],
                    "account_id": monitored_account_id,
                    "updated_at": updated_at_timestamp
                }
            redis.hset(CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, monitored_node_id, json.dumps(node))
            cloud_compliance_node = CloudComplianceNode.query.filter_by(node_id=monitored_node_id).first()
            if not cloud_compliance_node:
                cloud_compliance_node = CloudComplianceNode(
                    node_id=monitored_node_id,
                    node_name=monitored_account_id,
                    cloud_provider=post_data["cloud_provider"],
                    org_account_id="aws-{};<cloud_org>".format(org_account_id),
                )
                try:
                    cloud_compliance_node.save()
                except exc.IntegrityError as e:
                    app.logger.error("Duplicate cloud compliance node {}".format(e))
                    print(e)
                    raise InvalidUsage("Duplicate cloud compliance node")

            current_pending_scans_str = redis.hget(PENDING_CLOUD_COMPLIANCE_SCANS_KEY, monitored_node_id)
            if not current_pending_scans_str:
                continue
            current_pending_scans = json.loads(current_pending_scans_str)
            pending_scans_available = False
            for scan in current_pending_scans:
                filters = {
                    "node_id": monitored_node_id,
                    "scan_id": scan["scan_id"],
                    "scan_status": ["IN_PROGRESS", "ERROR", "COMPLETED"]
                }
                compliance_log = ESConn.search_by_and_clause(CLOUD_COMPLIANCE_LOGS_INDEX, filters, size=1)
                if not compliance_log.get("hits", []):
                    pending_scans_available = True
                    scan_list[scan["scan_id"]] = scan
            if not pending_scans_available:
                redis.hset(PENDING_CLOUD_COMPLIANCE_SCANS_KEY, monitored_node_id, "")
    else:
        node = None
        compliance_scan_node_details_str = redis.hget(CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, post_data["node_id"])
        if compliance_scan_node_details_str:
            node = json.loads(compliance_scan_node_details_str)

        if node and updated_at_timestamp > node["updated_at"]:
            node["updated_at"] = updated_at_timestamp
        elif not node:
            node = {
                "node_id": post_data["node_id"],
                "cloud_provider": post_data["cloud_provider"],
                "account_id": post_data["cloud_account"],
                "updated_at": updated_at_timestamp
            }
        redis.hset(CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, post_data["node_id"], json.dumps(node))

        cloud_compliance_node = CloudComplianceNode.query.filter_by(node_id=post_data["node_id"]).one_or_none()
        if not cloud_compliance_node:
            cloud_compliance_node = CloudComplianceNode(
                node_id=post_data["node_id"],
                node_name=post_data["cloud_account"],
                cloud_provider=post_data["cloud_provider"]
            )
            try:
                cloud_compliance_node.save()
            except exc.IntegrityError as e:
                app.logger.error("Duplicate cloud compliance node {}".format(e))
                print(e)
                raise InvalidUsage("Duplicate cloud compliance node")

        current_pending_scans_str = redis.hget(PENDING_CLOUD_COMPLIANCE_SCANS_KEY, post_data["node_id"])
        if not current_pending_scans_str:
            return set_response(data={"scans": {}, "refresh": do_refresh}, status=200)
        current_pending_scans = json.loads(current_pending_scans_str)
        for scan in current_pending_scans:
            filters = {
                "node_id": post_data["node_id"],
                "scan_id": scan["scan_id"],
                "scan_status": ["IN_PROGRESS", "ERROR", "COMPLETED"]
            }
            compliance_log = ESConn.search_by_and_clause(CLOUD_COMPLIANCE_LOGS_INDEX, filters, size=1)
            if not compliance_log.get("hits", []):
                scan_list[scan["scan_id"]] = scan
        if not scan_list:
            redis.hset(PENDING_CLOUD_COMPLIANCE_SCANS_KEY, post_data["node_id"], "")

    return set_response(data={"scans": scan_list, "refresh": do_refresh}, status=200)


@cloud_compliance_api.route("/cloud_compliance/cloud_resource/<path:cloud_provider>", methods=["POST"],
                            endpoint="api_v1_5_register_cloud_resource")
@jwt_required()
@non_read_only_user
def register_cloud_resource(cloud_provider):
    if not request.is_json:
        raise InvalidUsage("Missing JSON post data in request")

    post_data = request.json
    if not cloud_provider:
        raise InvalidUsage("cloud_provider is required for cloud resource registration")
    for resource in post_data:
        cloud_resource_node = CloudResourceNode.query.filter_by(node_id=resource["arn"],
                                                                cloud_provider=cloud_provider).first()
        if not cloud_resource_node:
            try:
                cloud_resource_node = CloudResourceNode(
                    node_id=resource.get("arn", ""),
                    node_name=resource.get("name", ""),
                    node_type=resource.get("resource_id", resource.get("id", "")),
                    cloud_provider=cloud_provider,
                    account_id=resource.get("account_id"),
                    region=resource.get("region","global"),
                    service_name=CSPM_RESOURCES.get(resource.get("id", ""), None),
                    is_active=True
                )
                cloud_resource_node.save()
            except exc.IntegrityError as e:
                app.logger.error("Duplicate cloud resource node {}".format(e))
                continue
    redis.hset(CLOUD_RESOURCES_CACHE_KEY, cloud_provider, json.dumps(post_data))
    return set_response(data={}, status=200)


@cloud_compliance_api.route("/cloud_compliance/kubernetes", methods=["POST"],
                            endpoint="api_v1_5_register_kubernetes_compliance")
@jwt_required()
@non_read_only_user
def register_kubernetes():
    if not request.is_json:
        raise InvalidUsage("Missing JSON post data in request")

    post_data = request.json
    if not post_data.get("node_id", None):
        raise InvalidUsage("Node ID is required for kube registration")
    kubernetes_id = post_data.get("node_id", None)
    updated_at_timestamp = datetime.now().timestamp()
    node = None
    compliance_scan_node_details_str = redis.hget(CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, post_data["node_id"])
    if compliance_scan_node_details_str:
        node = json.loads(compliance_scan_node_details_str)
    if node and updated_at_timestamp > node["updated_at"]:
        node["updated_at"] = updated_at_timestamp
    elif not node:
        node = {
            "node_id": post_data["node_id"],
            "cloud_provider": COMPLIANCE_KUBERNETES_HOST,
            "account_id": post_data["node_id"],
            "updated_at": updated_at_timestamp
        }
    redis.hset(CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY, post_data["node_id"], json.dumps(node))
    cloud_compliance_node = CloudComplianceNode.query.filter_by(node_id=kubernetes_id).first()
    if not cloud_compliance_node:
        cloud_compliance_node = CloudComplianceNode(
            node_id=kubernetes_id,
            node_name=kubernetes_id,
            cloud_provider=COMPLIANCE_KUBERNETES_HOST,
        )
        try:
            cloud_compliance_node.save()
        except exc.IntegrityError as e:
            app.logger.error("Duplicate cloud compliance kube node {}".format(e))
            print(e)
            raise InvalidUsage("Duplicate cloud compliance kube node")

    current_pending_scans_str = redis.hget(PENDING_CLOUD_COMPLIANCE_SCANS_KEY, kubernetes_id)
    if not current_pending_scans_str:
        return set_response(data={"scans": {}}, status=200)
    current_pending_scans = json.loads(current_pending_scans_str)
    pending_scans_available = False
    scan_list = {}
    for scan in current_pending_scans:
        filters = {
            "node_id": kubernetes_id,
            "scan_id": scan["scan_id"],
            "scan_status": ["IN_PROGRESS", "ERROR", "COMPLETED"]
        }
        compliance_log = ESConn.search_by_and_clause(COMPLIANCE_LOGS_INDEX, filters, size=1)
        if not compliance_log.get("hits", []):
            pending_scans_available = True
            scan_list[scan["scan_id"]] = scan
    if not pending_scans_available:
        redis.hset(PENDING_CLOUD_COMPLIANCE_SCANS_KEY, kubernetes_id, "")
    return set_response(data={"scans": scan_list}, status=200)


@cloud_compliance_api.route("/cloud-compliance/cloud_resources/<path:account_id>", methods=["GET"])
@jwt_required()
def cloud_resources(account_id):
    """
    Get list of resources available for cloud account id
    :return:
    """

    if account_id.endswith(";<cloud_org>"):
        accounts = CloudComplianceNode.query.filter_by(org_account_id=account_id).all()
    else:
        accounts = [CloudComplianceNode.query.filter_by(node_id=account_id).first()]

    if not accounts:
        return set_response([])

    if account_id.endswith(";<cloud_org>"):
        cloud_resource_nodes_ = db.session.query(CloudResourceNode.node_type,
                                                 func.count(CloudResourceNode.node_type).label('count')). \
                                                 filter(CloudResourceNode.account_id.in_(map(lambda x: x.node_id, accounts))). \
                                                 group_by(CloudResourceNode.node_type).all()
    else:
        cloud_resource_nodes_ = db.session.query(CloudResourceNode.node_type,
                                                 func.count(CloudResourceNode.node_type).label('count')). \
                                                 filter_by(account_id=account_id). \
                                                 group_by(CloudResourceNode.node_type).all()
    node_type_data_with_count = []  #
    cloud_resource_nodes_map = defaultdict(int)

    # print("cloud_resource_nodes_", cloud_resource_nodes_)
    # node_type is here table name example aws_s3_bucket
    for node_type, count in cloud_resource_nodes_:
        cloud_resource_nodes_map[CSPM_RESOURCES.get(node_type, node_type)] += count

    # print("cloud_resource_nodes_map", cloud_resource_nodes_map)
    # node_type here is service name aws_s3
    for node_type in CSPM_RESOURCE_LABELS:
        cp = accounts[0].cloud_provider
        if not node_type.startswith(cp):
            continue
        if not node_type:
            raise InvalidUsage("Missing node_type")
        service_resource_nodes_count = 0
        total_count_dict_node_id_wise = {"alarm": 0, "ok": 0, "info": 0, "skip": 0}
        for table_name in CSPM_RESOURCES_INVERTED.get(node_type, node_type):
            if account_id.endswith(";<cloud_org>"):
                cloud_resource_nodes = CloudResourceNode.query.filter_by(node_type=table_name). \
                                           filter(CloudResourceNode.account_id.in_(map(lambda x: x.node_id, accounts))).all()
            else:
                cloud_resource_nodes = CloudResourceNode.query.filter_by(node_type=table_name,
                                                                         account_id=account_id).all()
            if not cloud_resource_nodes:
                continue
            number = request.args.get("number")
            time_unit = request.args.get("time_unit")
            if number:
                try:
                    number = int(number)
                except ValueError:
                    raise InvalidUsage("Number should be an integer value.")

            if bool(number is not None) ^ bool(time_unit):
                raise InvalidUsage("Require both number and time_unit or ignore both of them.")

            if time_unit and time_unit not in TIME_UNIT_MAPPING.keys():
                raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")

            lucene_query_string = request.args.get("lucene_query")
            if lucene_query_string:
                lucene_query_string = urllib.parse.unquote(lucene_query_string)
            node_type_data = []
            node_type_data_map = {}
            for cloud_resource in cloud_resource_nodes:
                node_data = {"scan_data": {}}
                node_type_data.append(node_data)
                node_type_data_map[cloud_resource.node_id] = node_data

            aggs_cc_scan = {
                "check_type": {
                    "terms": {
                        "field": "compliance_check_type.keyword",
                        "size": ES_TERMS_AGGR_SIZE
                    },
                    "aggs": {
                        "scan_id": {
                            "terms": {
                                "field": "scan_id.keyword",
                                "order": {"recent_scan_aggr": "desc"},
                                "size": 1,
                            },
                            "aggs": {
                                "recent_scan_aggr": {
                                    "max": {
                                        "field": "@timestamp"
                                    }
                                }
                            }
                        }
                    }
                }
            }
            es_filter = {"scan_status": "COMPLETED", "node_id": list(map(lambda x: x.node_id, accounts))}
            aggs_response = ESConn.aggregation_helper(
                CLOUD_COMPLIANCE_LOGS_INDEX,
                es_filter,
                aggs_cc_scan,
                number,
                TIME_UNIT_MAPPING.get(time_unit),
                lucene_query_string
            )
            most_recent_scan_time = 0
            most_recent_scan_ts = ""
            type_scan_id_map = {}
            for bucket in aggs_response.get("aggregations", {}).get("check_type", {}).get("buckets", []):
                scan_id_buckets = bucket.get("scan_id", {}).get("buckets", [])
                if len(scan_id_buckets) > 0:
                    type_scan_id_map[bucket["key"]] = scan_id_buckets[0]["key"]
                    if scan_id_buckets[0].get("recent_scan_aggr", {}).get("value", most_recent_scan_time) > most_recent_scan_time:
                        most_recent_scan_time = scan_id_buckets[0].get("recent_scan_aggr", {}).get("value", most_recent_scan_time)
                        most_recent_scan_ts = scan_id_buckets[0].get("recent_scan_aggr", {}).get("value_as_string", most_recent_scan_ts)
            for check_type in type_scan_id_map:
                es_filter = {"scan_id": type_scan_id_map[check_type]}
                aggs_cc_scan = {
                    "resource": {
                        "terms": {
                            "field": "resource.keyword",
                            "size": ES_TERMS_AGGR_SIZE
                        },
                        "aggs": {
                            "status": {
                                "terms": {
                                    "field": "status.keyword",
                                }
                            }
                        }
                    }
                }
                aggs_response = ESConn.aggregation_helper(
                    CLOUD_COMPLIANCE_INDEX,
                    es_filter,
                    aggs_cc_scan,
                    number,
                    TIME_UNIT_MAPPING.get(time_unit),
                    lucene_query_string
                )

                for rbucket in aggs_response.get("aggregations", {}).get("resource", {}).get("buckets", []):
                    arn = rbucket.get("key", "")
                    resource_data = node_type_data_map.get(arn, None)
                    if resource_data:
                        status_data = {}
                        resource_data[check_type] = status_data
                        for status_bucket in rbucket.get("status", {}).get("buckets", []):
                            status_data[status_bucket.get("key", "")] = status_bucket.get("doc_count", "")

            # print("node_type_data_map", node_type_data_map)
            for arn, scan_data in node_type_data_map.items():
                for available_scan_type, scan_counts in scan_data.items():
                    for scan_type in scan_counts.keys():
                        if total_count_dict_node_id_wise.get(scan_type, None) is not None:
                            total_count_dict_node_id_wise[scan_type] += scan_counts[scan_type]

            service_resource_nodes_count += cloud_resource_nodes_map.get(node_type, 0)

            # print(total_count_dict_node_id_wise)
        if service_resource_nodes_count > 0:
            node_type_data_with_count.append({"id": node_type, "count": cloud_resource_nodes_map.get(node_type, 0),
                                              "label": CSPM_RESOURCE_LABELS.get(node_type, node_type.replace("_", " ")),
                                              "total_scan_count": total_count_dict_node_id_wise})
        else:
            node_type_data_with_count.append({"id": node_type, "count": cloud_resource_nodes_map.get(node_type, 0),
                                              "label": CSPM_RESOURCE_LABELS.get(node_type, node_type.replace("_", " ")),
                                              "total_scan_count": {"alarm": 0, "ok": 0, "info": 0, "skip": 0}})

    return set_response(node_type_data_with_count)
    # TODO: Resolve node type data merge
    #    return set_response(node_type_data)


@cloud_compliance_api.route("/cloud-compliance/cloud_resource/<path:account_id>", methods=["GET"])
@jwt_required()
def cloud_resources_type(account_id):
    """
    Get list of resource available for cloud account id and resource_type
    :return:
    """

    if account_id.endswith(";<cloud_org>"):
        accounts = CloudComplianceNode.query.filter_by(org_account_id=account_id).all()
    else:
        accounts = [CloudComplianceNode.query.filter_by(node_id=account_id).first()]

    if not accounts:
        return set_response([])

    node_type = request.args.get("node_type")
    if not node_type:
        raise InvalidUsage("Missing node_type")

    cloud_resource_nodes = CloudResourceNode.query.filter(
        CloudResourceNode.node_type.in_(CSPM_RESOURCES_INVERTED.get(node_type, node_type))).filter(
        CloudResourceNode.account_id.in_(map(lambda x: x.node_id, accounts))).all()
    if not cloud_resource_nodes:
        return set_response([])
    number = request.args.get("number")
    time_unit = request.args.get("time_unit")

    if number:
        try:
            number = int(number)
        except ValueError:
            raise InvalidUsage("Number should be an integer value.")

    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")

    if time_unit and time_unit not in TIME_UNIT_MAPPING.keys():
        raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")

    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)
    node_type_data = []
    node_type_data_map = {}
    for cloud_resource in cloud_resource_nodes:
        node_data = {
            "label": CSPM_RESOURCE_LABELS.get(CSPM_RESOURCES.get(node_type, node_type), node_type.replace("_", " ")),
            "name": cloud_resource.node_name,
            "arn": cloud_resource.node_id, "region": cloud_resource.region, "last_scanned": "",
            "scan_data": {}}
        node_type_data.append(node_data)
        node_type_data_map[cloud_resource.node_id] = node_data

    aggs_cc_scan = {
        "check_type": {
            "terms": {
                "field": "compliance_check_type.keyword",
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
                "scan_id": {
                    "terms": {
                        "field": "scan_id.keyword",
                        "order": {"recent_scan_aggr": "desc"},
                        "size": 1,
                    },
                    "aggs": {
                        "recent_scan_aggr": {
                            "max": {
                                "field": "@timestamp"
                            }
                        }
                    }
                }
            }
        }
    }
    es_filter = {"scan_status": "COMPLETED", "node_id": list(map(lambda x: x.node_id, accounts))}
    aggs_response = ESConn.aggregation_helper(
        CLOUD_COMPLIANCE_LOGS_INDEX,
        es_filter,
        aggs_cc_scan,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string
    )
    most_recent_scan_time = 0
    most_recent_scan_ts = ""
    type_scan_id_map = {}
    for bucket in aggs_response.get("aggregations", {}).get("check_type", {}).get("buckets", []):
        scan_id_buckets = bucket.get("scan_id", {}).get("buckets", [])
        if len(scan_id_buckets) > 0:
            type_scan_id_map[bucket["key"]] = scan_id_buckets[0]["key"]
            if scan_id_buckets[0].get("recent_scan_aggr", {}).get("value",
                                                                  most_recent_scan_time) > most_recent_scan_time:
                most_recent_scan_time = scan_id_buckets[0].get("recent_scan_aggr", {}).get("value",
                                                                                           most_recent_scan_time)
                most_recent_scan_ts = scan_id_buckets[0].get("recent_scan_aggr", {}).get("value_as_string",
                                                                                         most_recent_scan_ts)
    for check_type in type_scan_id_map:
        es_filter = {"scan_id": type_scan_id_map[check_type]}
        aggs_cc_scan = {
            "resource": {
                "terms": {
                    "field": "resource.keyword",
                    "size": ES_TERMS_AGGR_SIZE
                },
                "aggs": {
                    "status": {
                        "terms": {
                            "field": "status.keyword",
                        }
                    }
                }
            }
        }
        aggs_response = ESConn.aggregation_helper(
            CLOUD_COMPLIANCE_INDEX,
            es_filter,
            aggs_cc_scan,
            number,
            TIME_UNIT_MAPPING.get(time_unit),
            lucene_query_string
        )
        for rbucket in aggs_response.get("aggregations", {}).get("resource", {}).get("buckets", []):
            arn = rbucket.get("key", "")
            resource_data = node_type_data_map.get(arn, None)
            if resource_data:
                status_data = {}
                resource_data["scan_data"][check_type] = status_data
                resource_data["scan_data"]["last_scanned"] = most_recent_scan_ts
                resource_data["scan_data"][check_type]["scan_id"] = type_scan_id_map[check_type]
                for status_bucket in rbucket.get("status", {}).get("buckets", []):
                    status_data[status_bucket.get("key", "")] = status_bucket.get("doc_count", "")
                for status_name in ['alarm', 'info', 'pass', 'ok']:
                    if not status_data.get(status_name, None):
                        status_data[status_name] = 0
    return set_response(node_type_data)


@cloud_compliance_api.route("compliance/mask_doc", methods=["POST"], endpoint="api_v1_5_mask_compliance_doc")
@jwt_required()
@non_read_only_user
def mask_doc():
    if not request.is_json:
        raise InvalidUsage("Missing JSON post data in request")

    doc_ids_to_be_masked = request.json.get("docs", [])
    if not doc_ids_to_be_masked:
        raise InvalidUsage("Missing docs value")
    node_type = request.json.get("node_type", "")
    index = CLOUD_COMPLIANCE_INDEX
    if node_type == COMPLIANCE_LINUX_HOST:
        index = COMPLIANCE_INDEX
    docs_to_be_masked = []
    for doc_id in doc_ids_to_be_masked:
        docs_to_be_masked.append({"_id": doc_id, "_index": index})
    ESConn.bulk_mask_docs(docs_to_be_masked)
    return set_response(status=200)


@cloud_compliance_api.route("compliance/unmask_doc", methods=["POST"], endpoint="api_v1_5_unmask_compliance_doc")
@jwt_required()
@non_read_only_user
def mask_doc():
    if not request.is_json:
        raise InvalidUsage("Missing JSON post data in request")

    doc_ids_to_be_unmasked = request.json.get("docs", [])
    if not doc_ids_to_be_unmasked:
        raise InvalidUsage("Missing docs value")
    node_type = request.json.get("node_type", "")
    index = CLOUD_COMPLIANCE_INDEX
    if node_type == COMPLIANCE_LINUX_HOST:
        index = COMPLIANCE_INDEX
    docs_to_be_unmasked = []
    for doc_id in doc_ids_to_be_unmasked:
        docs_to_be_unmasked.append({"_id": doc_id, "_index": index})
    ESConn.bulk_unmask_docs(docs_to_be_unmasked)
    return set_response(status=200)

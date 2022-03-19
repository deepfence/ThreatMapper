import math
import os
from urllib.parse import unquote
from flask import Blueprint, request, make_response
from collections import defaultdict
from flask import current_app as app
from flask_jwt_extended import jwt_required
import networkx as nx
from api.vulnerability_api import get_top_vulnerable_nodes_helper
from models.notification import RunningNotification
import urllib.parse
from utils.response import set_response
from utils.helper import split_list_into_chunks, get_deepfence_logs, get_process_ids_for_pod, md5_hash
from utils.esconn import ESConn, GroupByParams
from utils.decorators import user_permission, non_read_only_user, admin_user_only
from collections import defaultdict
from utils.constants import USER_ROLES, TIME_UNIT_MAPPING, CVE_INDEX, ALL_INDICES, \
    CVE_SCAN_LOGS_INDEX, SCOPE_TOPOLOGY_COUNT, NODE_TYPE_HOST, NODE_TYPE_CONTAINER, NODE_TYPE_POD, ES_MAX_CLAUSE, \
    TOPOLOGY_ID_CONTAINER, TOPOLOGY_ID_CONTAINER_IMAGE, TOPOLOGY_ID_HOST, NODE_TYPE_CONTAINER_IMAGE, \
    TOPOLOGY_ID_KUBE_SERVICE, NODE_TYPE_KUBE_CLUSTER, ES_TERMS_AGGR_SIZE, \
    REGISTRY_IMAGES_CACHE_KEY_PREFIX, NODE_TYPE_KUBE_NAMESPACE, SECRET_SCAN_LOGS_INDEX, SECRET_SCAN_INDEX, SBOM_INDEX, \
    SBOM_ARTIFACT_INDEX
from utils.scope import fetch_topology_data
from utils.node_helper import determine_node_status
from datetime import datetime, timedelta
from utils.helper import is_network_attack_vector, get_topology_network_graph
from utils.node_utils import NodeUtils
from flask.views import MethodView
from utils.custom_exception import InvalidUsage, InternalError, DFError, NotFound
from models.node_tags import NodeTags
from models.container_image_registry import RegistryCredential
from models.user import User, Role
from models.user_activity_log import UserActivityLog
from models.email_configuration import EmailConfiguration
from config.redisconfig import redis
from utils.es_query_utils import get_latest_cve_scan_id
import json
from flask_jwt_extended import get_jwt_identity
from utils.resource import filter_node_for_vulnerabilities, get_default_params
from utils.resource import encrypt_cloud_credential
from resource_models.node import Node

common_api = Blueprint("common_api", __name__)


@common_api.route("/topology-metrics", methods=["GET"])
@jwt_required()
def topology_metrics():
    count = redis.hgetall(SCOPE_TOPOLOGY_COUNT)
    if not count:
        count = {}
    total_hosts = int(count.get(NODE_TYPE_HOST, 0))
    unprotected_hosts = int(count.get(NODE_TYPE_HOST + "_unprotected", 0))
    response = {
        "coverage": {
            "discovered": str(total_hosts),
            "protected": str(total_hosts - unprotected_hosts),
        },
        "cloud": {
            k.replace("_", " ").title(): v for k, v in count.items()
            if k not in ["host_unprotected", NODE_TYPE_KUBE_CLUSTER, NODE_TYPE_POD, NODE_TYPE_KUBE_NAMESPACE]
        },
        "kubernetes": {
            "kubernetes_cluster": count.get(NODE_TYPE_KUBE_CLUSTER, "0"),
            "kubernetes_namespace": count.get(NODE_TYPE_KUBE_NAMESPACE, "0"),
            NODE_TYPE_POD: count.get(NODE_TYPE_POD, "0"),
        },
    }
    return set_response(data=response)


@common_api.route("/stats", methods=["GET"])
@jwt_required()
def stats():
    """
    Provides data for stats panel.

    ```
    - Total alerts
    - Severity count
        - Critical
        - High
        - Medium
        - Low
    ```

    `_type: alert/cve`

    ---
    tags:
      - Common API
    security:
      - Bearer: []
    parameters:
      - name: _type
        in: query
        type: string
        required: true
        description: alert/cve
      - name: number
        in: query
        type: string
        required: false
        description: Number of (months, days, hours, minutes).
      - name: time_unit
        in: query
        type: string
        required: false
        description: Time unit (month/day/hour/minute).
      - name: lucene_query
        in: query
        type: string
        required: false
        description: Lucene query.
    responses:
      200:
        description: with a valid request and response ... uses standard response codes

    """
    number = request.args.get("number")
    time_unit = request.args.get("time_unit")
    _type = request.args.get("_type")

    if not _type:
        raise InvalidUsage("_type is required.")

    if number:
        try:
            number = int(number)
        except ValueError:
            raise InvalidUsage("Number should be an integer value.")

    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")

    if time_unit and time_unit not in TIME_UNIT_MAPPING.keys():
        raise InvalidUsage("time_unit should be one of these, month/day/hour/minute/all")

    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = unquote(lucene_query_string)

    if _type == CVE_INDEX:
        severity_field = "cve_severity"
    else:
        raise InvalidUsage("Unsupported _type")

    severities = ["critical", "medium", "high", "low", "info"]
    search_queries = []
    for severity in severities:
        search_queries.append({"index": _type})
        filters = {"type": _type, "masked": "false", severity_field: severity}
        search_queries.append(
            ESConn.create_filtered_query(filters, number=number, time_unit=TIME_UNIT_MAPPING.get(time_unit),
                                         lucene_query_string=lucene_query_string))
    responses = ESConn.msearch(search_queries).get("responses", [])

    severity_counts = {}
    total_alerts_count = 0
    for i in range(len(severities)):
        severity_total = responses[i].get("hits", {}).get("total", {}).get("value", 0)
        severity_counts[severities[i]] = severity_total
        if severities[i] != "info" and severities[i] != "low":
            total_alerts_count += severity_total

    result = {
        "alerts": total_alerts_count,
        "severities": severity_counts
    }

    return set_response(data=result)


@common_api.route("/search", methods=["POST"])
@jwt_required()
def search():
    """
    EL Search.
    Input should be a json object with the below format
    ```
    {
        "_type": "alert",
        "filters": {
            "severity": [
                "critical"
            ],
        },
        "values_for": [
            "severity"
        ]
    }
    ```

    For cve
    ```
    {
        "_type": "cve",
        "filters": {
            "cve_severity": [
                "critical"
            ],
        },
        "values_for": [
            "cve_severity"
        ]
    }
    ```


    ---
    tags:
      - Common API
    security:
      - Bearer: []
    parameters:
      - name: from
        in: query
        type: string
        required: true
        description: Start index in pagination.
      - name: size
        in: query
        type: string
        required: false
        description: Number of results to be returned.
      - name: sort_order
        in: query
        type: string
        required: false
        description: Sort order of the results (asc/desc)
      - name: number
        in: query
        type: string
        required: false
        description: Number of (months, days, hours, minutes).
      - name: time_unit
        in: query
        type: string
        required: false
        description: Time unit (month/day/hour/minute).
      - name: lucene_query
        in: query
        type: string
        required: false
        description: Lucene query.
      - name: input_json
        in: body
        type: string
        required: true
        description: Input filter values.
        schema:
          properties:
            _type:
              type: string
              description: doc_type (alert/cve)
              example: cve
            filters:
              type: object
              description: host
              schema:
                properties:
                  cve_severity:
                    type: array
                    description: severity
                    example: ["critical"]
            values_for:
              type: array
              description: cve_severity
              example: ["severity"]
    responses:
      200:
        description: with a valid request and response ... uses standard response codes
      400:
        description: bad request (like missing text data)
    """
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

    index_name = request.json.get("_type")
    if not index_name:
        raise InvalidUsage("_type is required")

    _source = request.json.get("_source", [])

    if index_name not in ALL_INDICES:
        raise InvalidUsage("_type should be one of {}".format(ALL_INDICES))

    node_filters = request.json.get("node_filters", {})
    if node_filters:
        if index_name == CVE_INDEX:
            tmp_filters = filter_node_for_vulnerabilities(node_filters)
            if tmp_filters:
                filters = {**filters, **tmp_filters}
    scripted_sort = None
    severity_sort = False
    if index_name == CVE_INDEX:
        if sort_by == "cve_severity":
            severity_sort = True
    if severity_sort:
        scripted_sort = [
            {
                "_script": {
                    "type": "number",
                    "script": {
                        "lang": "painless",
                        "source": "params.sortOrder.indexOf(doc['" + sort_by + ".keyword'].value)",
                        "params": {"sortOrder": ["info", "low", "high", "medium", "critical"]}
                    },
                    "order": sort_order
                }
            }
        ]
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
        "type": index_name,
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


@common_api.route("/search_corelation", methods=["POST"])
@jwt_required()
def search_corelation():
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

    index_name = request.json.get("_type")
    if not index_name:
        raise InvalidUsage("_type is required")

    _source = request.json.get("_source", [])

    if index_name not in ALL_INDICES:
        raise InvalidUsage("_type should be one of {}".format(ALL_INDICES))

    node_filters = request.json.get("node_filters", {})
    if node_filters:
        if index_name == CVE_INDEX:
            tmp_filters = filter_node_for_vulnerabilities(node_filters)
            if tmp_filters:
                filters = {**filters, **tmp_filters}

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
    )

    values_for = request.json.get("values_for", [])

    filters.update({
        "type": index_name,
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

    data = {"name": "Alerts", "children": []}
    severity_list = []
    for hit in search_response.get("hits", []):
        if len(data["children"]) == 0:
            child = {}
            child["name"] = hit.get("_source", {}).get("severity", "")
            severity_list.append(hit.get("_source", {}).get("severity", ""))
            child["value"] = 1
            child["children"] = [{"name": hit.get("_source", {}).get("classtype", ""), "value": 1}]
            data["children"].append(child)
        else:
            for datum in data["children"]:
                if hit.get("_source", {}).get("severity", "") not in severity_list:
                    child = {}
                    child["name"] = hit.get("_source", {}).get("severity", "")
                    severity_list.append(hit.get("_source", {}).get("severity", ""))
                    child["value"] = 1
                    child["children"] = [{"name": hit.get("_source", {}).get("classtype", ""), "value": 1}]
                    data["children"].append(child)
                    break
                if hit.get("_source", {}).get("severity", "") == datum.get("name"):
                    if len(datum.get("children", [])) == 0:
                        sub_child = {}
                        sub_child["name"] = hit.get("_source", {}).get("classtype", "")
                        sub_child["value"] = 1
                        datum["children"].append(sub_child)
                        break
                    else:
                        found = False
                        for sub_datum in datum.get("children", []):
                            if hit.get("_source", {}).get("classtype", "") == sub_datum.get("name"):
                                sub_datum["value"] = sub_datum["value"] + 1
                                found = True
                                break

                        if found != True:
                            sub_child = {}
                            sub_child["name"] = hit.get("_source", {}).get("classtype", "")
                            sub_child["value"] = 1
                            datum["children"].append(sub_child)
                            break
    return set_response(data=data)


@common_api.route("/unmask-doc", methods=["POST"])
@jwt_required()
@user_permission(USER_ROLES.ADMIN_USER)
def unmask_doc():
    """
    Unmask a document. Specify type (alert or cve)

    ```
    input_json = {
        "docs": [
            {
                "_id": "AV9snfn4fobgNCxxOlvR",
                "_index": "logstash-2017.10.30",
                "_type": "cve"
            }
        ]
    }
    ```

    ---
    tags:
      - Common API
    security:
      - Bearer: []
    parameters:
      - name: input_json
        in: body
        type: string
        required: false
        description: Map of index and id.
        schema:
          properties:
            docs:
              type: array
              items:
                type: object
                properties:
                  _id:
                    type: string
                    description: document _id
                    example: "AV9snfn4fobgNCxxOlvR"
                  _index:
                    type: string
                    description: document _index
                    example: "logstash-2017.10.30"
                  _type:
                    type: string
                    description: doc_type
                    example: "cve"

    responses:
      200:
        description: with a valid request and response ... uses standard response codes
      400:
        description: bad request (like missing text data)
      404:
        description: Document does not exist.
    """
    if not request.is_json:
        raise InvalidUsage("Missing json value")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    docs_to_be_unmasked = request.json.get("docs")

    cve_id_list = request.json.get("cve_id_list")
    if cve_id_list:
        if not docs_to_be_unmasked:
            docs_to_be_unmasked = []
        filters = {'cve_id': cve_id_list, 'masked': 'true'}
        es_resp = ESConn.search_by_and_clause(CVE_INDEX, filters, 0, "desc", ES_TERMS_AGGR_SIZE,
                                              _source=["doc_id"])
        if es_resp.get('hits'):
            for hit in es_resp.get('hits'):
                _source = hit.get('_source')
                if _source:
                    docs_to_be_unmasked.append(
                        {"_id": _source.get("doc_id"), "_index": CVE_INDEX})

    if not docs_to_be_unmasked:
        raise InvalidUsage("docs key is missing")
    cve_docs_to_be_unmasked = []
    all_docs_to_be_unmasked = []
    for doc in docs_to_be_unmasked:
        if doc["_index"] == CVE_INDEX:
            cve_docs_to_be_unmasked.append(doc)
        else:
            all_docs_to_be_unmasked.append(doc)
    if cve_docs_to_be_unmasked:
        unmask_across_images = request.json.get("unmask_across_images", False)
        resp = ESConn.mget(body={"docs": cve_docs_to_be_unmasked}, _source=["cve_id", "cve_container_image"])
        if unmask_across_images:
            cve_id_list = []
            for es_doc in resp:
                if es_doc.get("_source", {}).get("cve_id", ""):
                    cve_id_list.append(es_doc["_source"]["cve_id"])
            filters = {"cve_id": cve_id_list, "masked": "true"}
            es_resp = ESConn.search_by_and_clause(CVE_INDEX, filters, 0, size=49999, _source=["_id"])
            all_docs_to_be_unmasked.extend(es_resp.get("hits", []))
        else:
            image_cve_id_list = defaultdict(list)
            for es_doc in resp:
                if es_doc.get("_source", {}).get("cve_id", ""):
                    image_cve_id_list[es_doc["_source"]["cve_container_image"]].append(es_doc["_source"]["cve_id"])
            search_queries = []
            for image_name, cve_id_list in image_cve_id_list.items():
                search_queries.append({"index": CVE_INDEX})
                search_queries.append({
                    "query": {"bool": {"must": [
                        {"term": {"cve_container_image.keyword": image_name}},
                        {"term": {"masked.keyword": "true"}}, {"terms": {"cve_id.keyword": cve_id_list}}]}},
                    "from": 0, "size": 49999, "_source": ["_id"]})
            if search_queries:
                responses = ESConn.msearch(search_queries).get("responses", [])
                for msearch_resp in responses:
                    all_docs_to_be_unmasked.extend(msearch_resp["hits"]["hits"])

    ESConn.bulk_unmask_docs(all_docs_to_be_unmasked)

    return set_response(status=200)


@common_api.route("/mask-doc", methods=["POST"])
@jwt_required()
@user_permission(USER_ROLES.ADMIN_USER)
def mask_doc():
    """
    Mask a document. Specify type (alert or cve)

    ```
    input_json = {
        "docs": [
            {
                "_id": "AV9snfn4fobgNCxxOlvR",
                "_index": "logstash-2017.10.30",
                "_type": "cve"
            },
            {
                "_id": "AV9snfn4fobgNCxxOlvL",
                "_index": "logstash-2017.10.30",
                "_type": "alert"
            }
        ]
    }
    ```

    ---
    tags:
      - Common API
    security:
      - Bearer: []
    parameters:
      - name: input_json
        in: body
        type: string
        required: false
        description: Map of index and id.
        schema:
          properties:
            docs:
              type: array
              items:
                type: object
                properties:
                  _id:
                    type: string
                    description: document _id
                    example: "AV9snfn4fobgNCxxOlvR"
                  _index:
                    type: string
                    description: document _index
                    example: "logstash-2017.10.30"
                  _type:
                    type: string
                    description: doc_type
                    example: "cve"

    responses:
      200:
        description: with a valid request and response ... uses standard response codes
      400:
        description: bad request (like missing text data)
      404:
        description: Document does not exist.
    """
    if not request.is_json:
        raise InvalidUsage("Missing json value")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    docs_to_be_masked = request.json.get("docs")

    cve_id_list = request.json.get("cve_id_list")
    if cve_id_list:
        if not docs_to_be_masked:
            docs_to_be_masked = []
        filters = {'cve_id': cve_id_list, 'masked': 'false'}
        es_resp = ESConn.search_by_and_clause(CVE_INDEX, filters, 0, "desc", ES_TERMS_AGGR_SIZE,
                                              _source=["doc_id"])
        if es_resp.get('hits'):
            for hit in es_resp.get('hits'):
                _source = hit.get('_source')
                if _source:
                    docs_to_be_masked.append(
                        {"_id": _source.get("doc_id"), "_index": CVE_INDEX})

    if not docs_to_be_masked:
        raise InvalidUsage("docs key is missing")
    cve_docs_to_be_masked = []
    all_docs_to_be_masked = []
    for doc in docs_to_be_masked:
        if doc["_index"] == CVE_INDEX:
            cve_docs_to_be_masked.append(doc)
        else:
            all_docs_to_be_masked.append(doc)

    if cve_docs_to_be_masked:
        mask_across_images = request.json.get("mask_across_images", False)
        resp = ESConn.mget(body={"docs": cve_docs_to_be_masked}, _source=["cve_id", "cve_container_image"])
        if mask_across_images:
            cve_id_list = []
            for es_doc in resp:
                if es_doc.get("_source", {}).get("cve_id", ""):
                    cve_id_list.append(es_doc["_source"]["cve_id"])
            filters = {"cve_id": cve_id_list, "masked": "false"}
            es_resp = ESConn.search_by_and_clause(CVE_INDEX, filters, 0, size=49999, _source=["_id"])
            all_docs_to_be_masked.extend(es_resp.get("hits", []))
        else:
            image_cve_id_list = defaultdict(list)
            for es_doc in resp:
                if es_doc.get("_source", {}).get("cve_id", ""):
                    image_cve_id_list[es_doc["_source"]["cve_container_image"]].append(es_doc["_source"]["cve_id"])
            search_queries = []
            for image_name, cve_id_list in image_cve_id_list.items():
                search_queries.append({"index": CVE_INDEX})
                search_queries.append({
                    "query": {"bool": {"must": [
                        {"term": {"cve_container_image.keyword": image_name}},
                        {"term": {"masked.keyword": "false"}}, {"terms": {"cve_id.keyword": cve_id_list}}]}},
                    "from": 0, "size": 49999, "_source": ["_id"]})
            if search_queries:
                responses = ESConn.msearch(search_queries).get("responses", [])
                for msearch_resp in responses:
                    all_docs_to_be_masked.extend(msearch_resp["hits"]["hits"])

    comments = request.json.get('comments', '')
    ESConn.bulk_mask_docs(all_docs_to_be_masked, comments)

    return set_response(status=200)


@common_api.route("/docs/delete", methods=["POST"])
@jwt_required()
@user_permission(USER_ROLES.ADMIN_USER)
def delete_resources():
    """
    Delete cve based on a query.

    ```
    {
        "severity": "critical",
        "number": 7,
        "time_unit": "day",
        "doc_type": ["cve"]
    }
    ```

    Note: For `time_unit: all` the value for `number` will be ignored. But the key is
    required. So specify 0, though this is not strictly enforced, it is recommended.

    Permission: ADMIN
    ---
    tags:
      - Common API
    security:
      - Bearer: []
    parameters:
      - name: input_json
        in: body
        type: string
        required: false
        description: Map of index and id.
        schema:
          properties:
            severity:
              type: string
              description: low
              example: low
            doc_type:
              type: string
              description: "cve"
              example: cve
            number:
              type: integer
              description: Number
              example: 7
            time_unit:
              type: string
              description: day
              example: day


    responses:
      200:
        description: with a valid request and response ... uses standard response codes
      400:
        description: bad request (like missing text data)
    """
    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    severity = request.json.get("severity")
    number = request.json.get("number")
    time_unit = request.json.get("time_unit")
    index_name = request.json.get("doc_type")
    scan_id = request.json.get("scan_id")
    only_masked = bool(request.json.get("only_masked", False))
    only_dead_nodes = bool(request.json.get("only_dead_nodes", False))
    dead_nodes_since_days = int(request.json.get("dead_nodes_since_days", 0))
    if dead_nodes_since_days < 0:
        dead_nodes_since_days = 0
    dead_nodes_since_dt = datetime.now() - timedelta(days=dead_nodes_since_days)
    message = ""

    if not number:
        raise InvalidUsage("number is required")
    elif not (time_unit == "day" or time_unit == "all"):
        raise InvalidUsage("time_unit should be day or all only")
    elif not index_name:
        raise InvalidUsage("doc_type is required")

    # cve
    if index_name == CVE_INDEX:
        filters = {"type": CVE_INDEX}
        host_names_to_delete = []
        image_names_to_delete = []
        if only_masked:
            filters["masked"] = "true"
        if severity:
            filters["cve_severity"] = severity
        if scan_id:
            filters["scan_id"] = scan_id
        if only_dead_nodes:
            exclude_nodes = fetch_topology_data(NODE_TYPE_HOST, format="deepfence")
            if not exclude_nodes:
                raise InvalidUsage("found no dead nodes, please try later")
            exclude_node_names = [i["host_name"] for _, i in exclude_nodes.items() if
                                  i.get("host_name") and not i.get("pseudo")]
            exclude_nodes = fetch_topology_data(NODE_TYPE_CONTAINER_IMAGE, format="deepfence")
            for _, i in exclude_nodes.items():
                if i.get("image_name_with_tag") and not i.get("pseudo"):
                    exclude_node_names.append(i["image_name_with_tag"])
            for registry_cred in RegistryCredential.query.all():
                redis_cache_key = "{0}:{1}".format(REGISTRY_IMAGES_CACHE_KEY_PREFIX, registry_cred.id)
                registry_images = redis.get(redis_cache_key)
                if not registry_images:
                    registry_images = "{}"
                registry_images = json.loads(registry_images)
                for i in registry_images["image_list"]:
                    exclude_node_names.append(i["image_name_with_tag"])
            aggs = {
                "node_id": {
                    "terms": {
                        "field": "node_id.keyword",
                        "size": 200000
                    },
                    "aggs": {
                        "docs": {
                            "top_hits": {
                                "size": 1,
                                "sort": [{"@timestamp": {"order": "desc"}}],
                                "_source": {"includes": ["@timestamp", "node_type"]}
                            }
                        },
                        "node_type": {
                            "terms": {
                                "field": "node_type.keyword",
                                "size": 10
                            }
                        }
                    }
                }
            }
            aggs_response = ESConn.aggregation_helper(CVE_SCAN_LOGS_INDEX, {}, aggs, add_masked_filter=False)
            for image_aggr in aggs_response["aggregations"]["node_id"]["buckets"]:
                if image_aggr["key"] in exclude_node_names:
                    continue
                node_type = ""
                for node_type_aggr in image_aggr["node_type"]["buckets"]:
                    if node_type_aggr.get("key"):
                        node_type = node_type_aggr["key"]
                if not node_type:
                    if ":" in image_aggr["key"]:
                        node_type = NODE_TYPE_CONTAINER_IMAGE
                    else:
                        node_type = NODE_TYPE_HOST
                es_doc = image_aggr["docs"]["hits"]["hits"][0]["_source"]
                if dead_nodes_since_days > 0:
                    recent_alert_dt = datetime.strptime(es_doc["@timestamp"], "%Y-%m-%dT%H:%M:%S.%fZ")
                    if recent_alert_dt <= dead_nodes_since_dt:
                        if node_type == NODE_TYPE_HOST:
                            host_names_to_delete.append(image_aggr["key"])
                        else:
                            image_names_to_delete.append(image_aggr["key"])
                else:
                    if node_type == NODE_TYPE_HOST:
                        host_names_to_delete.append(image_aggr["key"])
                    else:
                        image_names_to_delete.append(image_aggr["key"])
            for delete_node_name_chunk in split_list_into_chunks(host_names_to_delete, ES_MAX_CLAUSE):
                ESConn.bulk_delete(CVE_INDEX, {
                    **filters, "cve_container_image": delete_node_name_chunk, "node_type": NODE_TYPE_HOST})
            for delete_node_name_chunk in split_list_into_chunks(image_names_to_delete, ES_MAX_CLAUSE):
                ESConn.bulk_delete(CVE_INDEX, {
                    **filters, "cve_container_image": delete_node_name_chunk, "node_type": NODE_TYPE_CONTAINER_IMAGE})
        else:
            ESConn.bulk_delete(CVE_INDEX, filters, number, TIME_UNIT_MAPPING[time_unit])

        if (not only_masked and not severity) or scan_id or only_dead_nodes:
            scan_log_filters = {}
            if scan_id:
                scan_log_filters["scan_id"] = scan_id
            if only_dead_nodes:
                for delete_node_name_chunk in split_list_into_chunks(host_names_to_delete, ES_MAX_CLAUSE):
                    ESConn.bulk_delete(CVE_SCAN_LOGS_INDEX, {
                        **scan_log_filters, "node_id": delete_node_name_chunk, "node_type": NODE_TYPE_HOST})
                    ESConn.bulk_delete(SBOM_INDEX, {
                        **scan_log_filters, "node_id": delete_node_name_chunk, "node_type": NODE_TYPE_HOST})
                    ESConn.bulk_delete(SBOM_ARTIFACT_INDEX, {
                        **scan_log_filters, "node_id": delete_node_name_chunk, "node_type": NODE_TYPE_HOST})
                for delete_node_name_chunk in split_list_into_chunks(image_names_to_delete, ES_MAX_CLAUSE):
                    ESConn.bulk_delete(CVE_SCAN_LOGS_INDEX, {
                        **scan_log_filters, "node_id": delete_node_name_chunk, "node_type": NODE_TYPE_CONTAINER_IMAGE})
                    ESConn.bulk_delete(SBOM_INDEX, {
                        **scan_log_filters, "node_id": delete_node_name_chunk, "node_type": NODE_TYPE_CONTAINER_IMAGE})
                    ESConn.bulk_delete(SBOM_ARTIFACT_INDEX, {
                        **scan_log_filters, "node_id": delete_node_name_chunk, "node_type": NODE_TYPE_CONTAINER_IMAGE})
            else:
                ESConn.bulk_delete(CVE_SCAN_LOGS_INDEX, scan_log_filters, number,
                                   TIME_UNIT_MAPPING[time_unit])
                ESConn.bulk_delete(SBOM_INDEX, scan_log_filters, number,
                                   TIME_UNIT_MAPPING[time_unit])
                ESConn.bulk_delete(SBOM_ARTIFACT_INDEX, scan_log_filters, number,
                                   TIME_UNIT_MAPPING[time_unit])
        message = "Successfully scheduled deletion of selected vulnerabilities"

    elif index_name == SECRET_SCAN_INDEX:
        filters = {}
        if scan_id:
            filters["scan_id"] = scan_id
            ESConn.bulk_delete(SECRET_SCAN_INDEX, filters)
            ESConn.bulk_delete(SECRET_SCAN_LOGS_INDEX, filters)
            message = "Successfully deleted scan id"
        else:
            if severity:
                filters["Severity.level"] = severity
            ESConn.bulk_delete(SECRET_SCAN_INDEX, filters, number, TIME_UNIT_MAPPING[time_unit])
            ESConn.bulk_delete(SECRET_SCAN_LOGS_INDEX, filters, number, TIME_UNIT_MAPPING[time_unit])
    else:
        raise InvalidUsage("doc_type is invalid")

    return set_response(data={"message": message}, status=200)


@common_api.route("/cve-scan/<path:node_id>", methods=["GET"])
@jwt_required()
def cve_scan_detail(node_id):
    """
    Get the latest cve-scan document from Elasticserach for a given node_id
    ---
    tags:
      - Common API
    security:
      - Bearer: []
    parameters:
      - name: node_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Returns the latest document for the requested node_id
      400:
        description: bad request (like missing text data)
    """

    if request.method == "GET":
        es_response = ESConn.search_by_and_clause(
            CVE_SCAN_LOGS_INDEX,
            {"node_id": node_id},
            0
        )
        latest_cve_scan = {}
        cve_scan_list = es_response.get("hits", [])
        if len(cve_scan_list) > 0:
            latest_cve_scan = cve_scan_list[0].get('_source', {})
            latest_cve_scan.update({'_id': cve_scan_list[0].get('_id', "")})

        return set_response(data=latest_cve_scan)


@common_api.route("/docs/delete_by_id", methods=["POST"])
@jwt_required()
@user_permission(USER_ROLES.ADMIN_USER)
def delete_docs_by_id():
    """
    Delete multiple documents by id

    ```
    input_json = {
      "index_name": "myindex",
      "doc_type": "mytype",
      "ids": ["d3498h93z4r092", "2zr24t2t24t4t"]
    }
    ```

    ---
    """
    if not request.is_json:
        raise InvalidUsage("Missing json value")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    index_name = request.json.get("index_name")
    ids = request.json.get("ids")
    if not index_name:
        raise InvalidUsage("index_name is mandatory")
    if not ids:
        raise InvalidUsage("ids is mandatory")
    if len(ids) < 1:
        raise InvalidUsage("Atleast one id is required")

    ESConn.delete_docs(ids, index_name)

    return set_response(status=200)


@common_api.route("/groupby", methods=["POST"])
@jwt_required()
def groupby():
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

    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    index_name = request.json.get("doc_type")
    if not index_name:
        raise InvalidUsage("doc_type is required")

    if index_name not in ALL_INDICES:
        raise InvalidUsage("doc_type should be one of {}".format(ALL_INDICES))

    # currently supports max 2 fields
    fields = request.json.get("fields")
    if not fields:
        raise InvalidUsage("fields is required")

    params = GroupByParams(index_name)
    params.addrelativetimerange(number, time_unit)

    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = unquote(lucene_query_string)
        params.addlucenequery(lucene_query_string)

    field = fields[0]
    aggs_name = field.get('name')
    user_options = field.get('options', {})
    all_options = {
        "order": {
            "_count": "desc"
        }
    }
    all_options.update(user_options)
    sub_aggs_name = None
    params.add_agg_field(field.get('name'), field.get('type'), **all_options)
    if len(fields) > 1:
        sub_field = fields[1]
        sub_aggs_name = sub_field.get('name')
        user_sub_options = sub_field.get('options', {})
        all_sub_options = {
            "order": {
                "_count": "desc"
            }
        }
        all_sub_options.update(user_sub_options)
        params.add_sub_agg_field(sub_field.get('name'), field.get('type'), **all_sub_options)

    filters = request.json.get("filters", {})
    for key, value in filters.items():
        params.add_filter('term', "{0}.keyword".format(key), value)

    # Hack alert on a generic API.
    # Assuming all CVE related grouping requires analysis
    # on only the latest scans, we apply the latest scan id filter
    if index_name == 'cve':
        latest_scan_ids = get_latest_cve_scan_id()
        # TODO: maxClause issue
        params.add_filter('terms', "scan_id.keyword", latest_scan_ids[:ES_MAX_CLAUSE])

    not_filters = request.json.get("not_filters", {})
    for key, value in not_filters.items():
        params.add_not_filter('term', "{0}.keyword".format(key), value)
    aggs_result = ESConn.group_by(params, aggs_name, sub_aggs_name=sub_aggs_name)
    buckets = aggs_result.get(aggs_name, {}).get('buckets', [])
    data = []
    for bucket in buckets:
        el = {
            aggs_name: bucket.get('key'),
            "count": bucket.get('doc_count'),
        }
        if sub_aggs_name:
            el["aggs"] = [{
                sub_aggs_name: bucket.get('key'),
                "count": bucket.get('doc_count')
            } for bucket in bucket.get(sub_aggs_name, {}).get('buckets', [])]
        data.append(el)
    return set_response(data=data)


@common_api.route("/top_affected_node", methods=["POST"])
@jwt_required()
def top_affected_node():
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

    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    index_name = request.json.get("doc_type")
    if not index_name:
        raise InvalidUsage("doc_type is required")

    if index_name not in ALL_INDICES:
        raise InvalidUsage("doc_type should be one of {}".format(ALL_INDICES))

    # currently supports max 2 fields
    fields = request.json.get("fields")
    if not fields:
        raise InvalidUsage("fields is required")

    params = GroupByParams(index_name)
    params.addrelativetimerange(number, time_unit)

    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = unquote(lucene_query_string)
        params.addlucenequery(lucene_query_string)

    field = fields[0]
    aggs_name = field.get('name')
    user_options = field.get('options', {})
    all_options = {
        "order": {
            "_count": "desc"
        }
    }
    all_options.update(user_options)
    sub_aggs_name = None
    params.add_agg_field(field.get('name'), field.get('type'), **all_options)
    if len(fields) > 1:
        sub_field = fields[1]
        sub_aggs_name = sub_field.get('name')
        user_sub_options = sub_field.get('options', {})
        all_sub_options = {
            "order": {
                "_count": "desc"
            }
        }
        all_sub_options.update(user_sub_options)
        params.add_sub_agg_field(sub_field.get('name'), field.get('type'), **all_sub_options)

    filters = request.json.get("filters", {})
    for key, value in filters.items():
        params.add_filter('term', "{0}.keyword".format(key), value)

    if index_name == 'cve':
        latest_scan_ids = get_latest_cve_scan_id()
        # TODO: maxClause issue
        params.add_filter('terms', "scan_id.keyword", latest_scan_ids[:ES_MAX_CLAUSE])

    not_filters = request.json.get("not_filters", {})
    for key, value in not_filters.items():
        params.add_not_filter('term', "{0}.keyword".format(key), value)
    aggs_result = ESConn.group_by(params, aggs_name, sub_aggs_name=sub_aggs_name)
    buckets = aggs_result.get(aggs_name, {}).get('buckets', [])
    data = []
    for data_dict in buckets:
        host_name = data_dict.get("key")
        inner_buckets = data_dict.get('severity.keyword').get('buckets')
        if inner_buckets is not None:
            if host_name:
                for bucket in inner_buckets:
                    el = {}
                    el['node'] = host_name
                    el['value'] = bucket.get('doc_count')
                    el['type'] = bucket.get('key')
                    data.append(el)

    return set_response(data=data)


@common_api.route("/node_status", methods=["GET"])
@jwt_required()
def get_node_status():
    node_type = request.args.get('node_type', default='all')
    if len(node_type) == 0:
        node_type = 'all'
    status_type_filter = request.args.getlist('status_type')
    if not status_type_filter:
        status_type_filter = ['cve']
    taglist_filter = request.args.getlist('taglist')

    if not node_type == TOPOLOGY_ID_CONTAINER and not node_type == TOPOLOGY_ID_HOST and \
            not node_type == TOPOLOGY_ID_CONTAINER_IMAGE and not node_type == 'all':
        raise InvalidUsage("Invalid node_type")

    node_status = {}
    for status_type in status_type_filter:
        if status_type not in ["cve"]:
            raise InvalidUsage('Invalid status_type')
        status = determine_node_status(node_type, status_type, taglist_filter)
        node_status[status_type] = status
    return set_response(data=node_status)


@common_api.route("/running_notification", methods=["GET"])
@jwt_required()
def get_running_notification():
    try:
        notifications = RunningNotification.query.all()
        # TODO: add expiry filter
        return set_response([notification.pretty_print() for notification in notifications])
    except Exception as ex:
        print(ex)
        raise InvalidUsage()


@common_api.route("/diagnosis/logs", methods=["GET"])
@jwt_required()
@admin_user_only
def diagnosis_logs():
    try:
        deepfence_logs, ok = get_deepfence_logs({})
        if not ok:
            print("There was an error fetching deepfence logs from diagnosis service")
            raise InternalError()
        response = make_response(deepfence_logs)
        response.headers['Content-Disposition'] = 'attachment; filename=deepfence-logs.tgz'
        response.headers['Content-type'] = 'application/tgz'
        return response
    except Exception as e:
        print("diagnosis_logs handler: Err: {}".format(e))
        raise InternalError()


@common_api.route("/enumerate_kube_services/<host_name>", methods=["GET"])
@jwt_required()
def enumerate_kube_services_api(host_name):
    # Enumerate all Kubernetes services with optional filters
    # {
    #   "kube_service_pid_map": [
    #     {
    #       "pid_list": ["3218"],
    #       "service_name": "default-http-backend"
    #     },
    #     {
    #       "pid_list": ["2875"],
    #       "service_name": "nginx-ingress-default-backend"
    #     }
    #   ]
    # }
    #
    response = {"kube_service_pid_map": []}
    kube_service_pids = defaultdict(list)
    try:
        pods_topology = fetch_topology_data(NODE_TYPE_POD, format="scope")
        for pod_scope_id, node_detail in pods_topology.items():
            if node_detail.get("pseudo", False):
                continue
            kube_service_name = ""
            pod_in_given_host = False
            for parent in node_detail.get("parents", []):
                if parent.get("topologyId", "") == TOPOLOGY_ID_HOST:
                    if parent.get("label", "") == host_name:
                        pod_in_given_host = True
                    else:
                        break
                elif parent.get("topologyId", "") == TOPOLOGY_ID_KUBE_SERVICE:
                    kube_service_name = parent.get("label", "")
            if not kube_service_name or not pod_in_given_host:
                continue
            kube_service_pids[kube_service_name].extend(get_process_ids_for_pod(pod_scope_id))
        for service_name, pid_list in kube_service_pids.items():
            response["kube_service_pid_map"].append({"service_name": service_name, "pid_list": pid_list})
    except Exception as ex:
        raise InternalError(str(ex))
    return set_response(data=response)


@common_api.route("/node_tags", methods=["GET"])
@jwt_required()
def get_node_tags():
    try:
        results = NodeTags.query.with_entities(NodeTags.tags).distinct().all()
        taglist = []
        for result in results:
            taglist.extend(result.tags.split(','))
        tagset = set(taglist)
        return set_response(list(tagset))
    except Exception as e:
        print("get_node_tags handler: Err: {}".format(e))
        raise InternalError()


@common_api.route("/initialize-redis", methods=["GET"])
def sync_deepfence_key_in_redis():
    from tasks.reaper_tasks import update_deepfence_key_in_redis
    update_deepfence_key_in_redis()
    return set_response(data="ok")


@common_api.route("/user-activity-log", methods=["POST"])
@jwt_required()
@admin_user_only
def user_activity_log():
    try:
        if not request.is_json:
            raise InvalidUsage("Missing JSON post data in request")
        post_data = request.json
        logs = UserActivityLog.query.order_by(UserActivityLog.created_at.desc()).all()
        total = len(logs)
        if not post_data:
            post_data = {}
        params = get_default_params(post_data)
        if params.get("size"):
            start_index = int(params.get("start_index"))
            page = params.get("page")
            if not page:
                page = math.floor(start_index / params["size"] + 1)
            logs_paginate = UserActivityLog.query.order_by(UserActivityLog.created_at.desc()). \
                paginate(page, int(params["size"]), False)
            logs = logs_paginate.items
        logs_pretty_print = [log.pretty_print() for log in logs]
        response = {
            "user_audit_logs": logs_pretty_print,
            "total": total
        }
        return set_response(response)
    except Exception as ex:
        print(ex)
        raise InvalidUsage()

@common_api.route("/registry_images_tags", methods=["POST"])
@jwt_required()
def registry_images_tags():
    if not request.is_json:
        raise InvalidUsage("Missing JSON post data in request")
    post_data = request.json
    if not post_data.get("registry_id", None):
        raise InvalidUsage("registry id is required")
    image_list_details_str = redis.get("{0}:{1}".format(REGISTRY_IMAGES_CACHE_KEY_PREFIX, post_data.get("registry_id")))
    if not image_list_details_str:
        return set_response([])
    image_dict = json.loads(image_list_details_str)
    images_set = set()
    for image in image_dict['image_list']:
        images_set.add(image["image_tag"])
    return set_response(list(images_set))

@common_api.route("/attack-path", methods=["GET"])
@jwt_required()
def attack_path():
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
    else:
        lucene_query_string = ""

    graph_type = request.args.get("graph_type")
    if graph_type not in ["most_vulnerable_attack_paths", "direct_internet_exposure", "indirect_internet_exposure"]:
        raise InvalidUsage("invalid type")

    top_attack_paths = {}
    node_utils = NodeUtils()
    top_vulnerablities = get_top_vulnerable_nodes_helper(
        number, time_unit, lucene_query_string, size=ES_TERMS_AGGR_SIZE)
    if not top_vulnerablities:
        return set_response(data=[])
    top_nodes = {}
    top_node_cves = defaultdict(list)
    ignore_nodes = {}
    for vulnerability in top_vulnerablities:
        cve_doc = vulnerability.get("_source", {})
        cve_container_image = cve_doc.get("cve_container_image")
        node_type = cve_doc.get("node_type")
        scope_id = cve_container_image + ";<" + node_type + ">"
        if cve_doc.get("cve_id") not in top_node_cves[scope_id]:
            top_node_cves[scope_id].append(cve_doc.get("cve_id"))
        if len(top_nodes) >= 10:
            continue
        if ignore_nodes.get(scope_id):
            continue
        if cve_container_image in top_nodes:
            continue
        if not is_network_attack_vector(cve_doc.get("cve_attack_vector", "")):
            continue
        node = Node.get_node("", scope_id, node_type)
        attack_path = node.get_attack_path_for_node(top_n=1)
        if not attack_path:
            ignore_nodes[node.scope_id] = True
            continue
        top_attack_paths[node.node_id] = attack_path
        top_nodes[node.node_id] = True

    if graph_type == "most_vulnerable_attack_paths":
        response = []
        for node_id in top_nodes.keys():
            node = Node(node_id)
            response.append(
                {
                    "cve_attack_vector": "network",
                    "attack_path": top_attack_paths.get(node_id, []),
                    "ports": node.get_live_open_ports(),
                    "cve_id": top_node_cves.get(node.scope_id, [])[:3]
                }
            )
        return set_response(data=response)
    elif graph_type == "direct_internet_exposure":
        top_attack_paths = {}
        topology_hosts = fetch_topology_data(NODE_TYPE_HOST, format="scope")
        hosts_graph = get_topology_network_graph(topology_hosts)
        incoming_internet_host_id = "in-theinternet"
        outgoing_internet_host_id = "out-theinternet"
        incoming_host_paths = {}
        try:
            incoming_host_paths = nx.shortest_path(hosts_graph, source=incoming_internet_host_id)
        except nx.exception.NodeNotFound:
            pass

        for scope_id, shortest_path in incoming_host_paths.items():
            if scope_id == "in-theinternet" or scope_id == "out-theinternet":
                continue
            if len(shortest_path) == 2:
                labelled_path = [topology_hosts[i]["label"] for i in shortest_path]
                top_attack_paths[scope_id] = [labelled_path]

        outgoing_host_paths = {}
        try:
            outgoing_host_paths = nx.shortest_path(hosts_graph, target=outgoing_internet_host_id)
        except nx.exception.NodeNotFound:
            pass

        for scope_id, shortest_path in outgoing_host_paths.items():
            if scope_id == "out-theinternet" or scope_id == "in-theinternet":
                continue
            if len(shortest_path) == 2:
                labelled_path = [topology_hosts[i]["label"] for i in shortest_path]
                labelled_path.reverse()
                top_attack_paths[scope_id] = [labelled_path]

        topology_containers = fetch_topology_data(NODE_TYPE_CONTAINER, format="scope")
        containers_graph = get_topology_network_graph(topology_containers)
        incoming_internet_container_id = "in-theinternet"
        outgoing_internet_container_id = "out-theinternet"
        incoming_container_paths = {}
        try:
            incoming_container_paths = nx.shortest_path(containers_graph, source=incoming_internet_container_id)
        except nx.exception.NodeNotFound:
            pass

        for scope_id, shortest_path in incoming_container_paths.items():
            if scope_id == "in-theinternet" or scope_id == "out-theinternet":
                continue
            if len(shortest_path) == 2:
                labelled_path = []
                for i in shortest_path:
                    labelled_element = ""
                    if i not in [incoming_internet_container_id, outgoing_internet_container_id]:
                        labelled_element = next((x["label"] for x in topology_containers[i]["parents"] if x["topologyId"] == "containers-by-image"), "")
                    if not labelled_element:
                        labelled_element = topology_containers[i]["label"]
                    labelled_path.append(labelled_element)
                top_attack_paths[scope_id] = [labelled_path]

        outgoing_container_paths = {}
        try:
            outgoing_container_paths = nx.shortest_path(containers_graph, target=outgoing_internet_container_id)
        except nx.exception.NodeNotFound:
            pass

        for scope_id, shortest_path in outgoing_container_paths.items():
            if scope_id == "out-theinternet" or scope_id == "in-theinternet":
                continue
            if len(shortest_path) == 2:
                labelled_path = []
                for i in shortest_path:
                    labelled_element = ""
                    if i not in [incoming_internet_container_id, outgoing_internet_container_id]:
                        labelled_element = next((x["label"] for x in topology_containers[i]["parents"] if x["topologyId"] == "containers-by-image"), "")
                    if not labelled_element:
                        labelled_element = topology_containers[i]["label"]
                    labelled_path.append(labelled_element)
                labelled_path.reverse()
                top_attack_paths[scope_id] = [labelled_path]

        response = []
        count = 0
        for scope_id in top_attack_paths.keys():
            if count == 5:
                break
            node_type = NODE_TYPE_HOST
            node_scope_id = ""
            if not scope_id.endswith(NODE_TYPE_HOST, 0, -1):
                node_type = NODE_TYPE_CONTAINER
                node_scope_id = next((x["id"] for x in topology_containers[scope_id]["parents"] if x["topologyId"] == "containers-by-image"), "")
            node_id = node_utils.get_df_id_from_scope_id(scope_id, node_type)
            node = Node(node_id)
            if not node:
                continue
            if not node_scope_id:
                node_scope_id = node.scope_id
            response.append(
                {
                    "cve_attack_vector": "network",
                    "attack_path": top_attack_paths.get(scope_id, []),
                    "ports": node.get_live_open_ports(),
                    "cve_id": top_node_cves.get(node_scope_id, [])[:3]
                }
            )
            count += 1
        return set_response(data=response)
    elif graph_type == "indirect_internet_exposure":
        top_attack_paths = {}
        topology_hosts = fetch_topology_data(NODE_TYPE_HOST, format="scope")
        hosts_graph = get_topology_network_graph(topology_hosts)
        incoming_internet_host_id = "in-theinternet"
        outgoing_internet_host_id = "out-theinternet"
        incoming_host_paths = {}
        try:
            incoming_host_paths = nx.shortest_path(hosts_graph, source=incoming_internet_host_id)
        except nx.exception.NodeNotFound:
            pass

        for scope_id, shortest_path in incoming_host_paths.items():
            if scope_id == "in-theinternet" or scope_id == "out-theinternet":
                continue
            if len(shortest_path) > 2:
                labelled_path = [topology_hosts[i]["label"] for i in shortest_path]
                top_attack_paths[scope_id] = [labelled_path]
        outgoing_host_paths = {}
        try:
            outgoing_host_paths = nx.shortest_path(hosts_graph, target=outgoing_internet_host_id)
        except nx.exception.NodeNotFound:
            pass

        for scope_id, shortest_path in outgoing_host_paths.items():
            if scope_id == "out-theinternet" or scope_id == "in-theinternet":
                continue
            if len(shortest_path) > 2:
                labelled_path = [topology_hosts[i]["label"] for i in shortest_path]
                labelled_path.reverse()
                top_attack_paths[scope_id] = [labelled_path]

        topology_containers = fetch_topology_data(NODE_TYPE_CONTAINER, format="scope")
        containers_graph = get_topology_network_graph(topology_containers)
        incoming_internet_container_id = "in-theinternet"
        outgoing_internet_container_id = "out-theinternet"
        incoming_container_paths = {}
        try:
            incoming_container_paths = nx.shortest_path(containers_graph, source=incoming_internet_container_id)
        except nx.exception.NodeNotFound:
            pass

        for scope_id, shortest_path in incoming_container_paths.items():
            if scope_id == "in-theinternet" or scope_id == "out-theinternet":
                continue
            if len(shortest_path) > 2:
                labelled_path = []
                for i in shortest_path:
                    labelled_element = ""
                    if i not in [incoming_internet_container_id, outgoing_internet_container_id]:
                        labelled_element = next((x["label"] for x in topology_containers[i]["parents"] if x["topologyId"] == "containers-by-image"), "")
                    if not labelled_element:
                        labelled_element = topology_containers[i]["label"]
                    labelled_path.append(labelled_element)
                top_attack_paths[scope_id] = [labelled_path]

        outgoing_container_paths = {}
        try:
            outgoing_container_paths = nx.shortest_path(containers_graph, target=outgoing_internet_container_id)
        except nx.exception.NodeNotFound:
            pass

        for scope_id, shortest_path in outgoing_container_paths.items():
            if scope_id == "out-theinternet" or scope_id == "in-theinternet":
                continue
            if len(shortest_path) > 2:
                labelled_path = []
                for i in shortest_path:
                    labelled_element = ""
                    if i not in [incoming_internet_container_id, outgoing_internet_container_id]:
                        labelled_element = next((x["label"] for x in topology_containers[i]["parents"] if x["topologyId"] == "containers-by-image"), "")
                    if not labelled_element:
                        labelled_element = topology_containers[i]["label"]
                    labelled_path.append(labelled_element)
                labelled_path.reverse()
                top_attack_paths[scope_id] = [labelled_path]

        response = []
        count = 0
        for scope_id in top_attack_paths.keys():
            if count == 5:
                break
            node_type = NODE_TYPE_HOST
            node_scope_id = ""
            if not scope_id.endswith(NODE_TYPE_HOST, 0, -1):
                node_type = NODE_TYPE_CONTAINER
                node_scope_id = next((x["id"] for x in topology_containers[scope_id]["parents"] if x["topologyId"] == "containers-by-image"), "")
            node_id = node_utils.get_df_id_from_scope_id(scope_id, node_type)
            node = Node(node_id)
            if not node:
                continue
            if not node_scope_id:
                node_scope_id = node.scope_id
            response.append(
                {
                    "cve_attack_vector": "network",
                    "attack_path": top_attack_paths.get(scope_id, []),
                    "ports": node.get_live_open_ports(),
                    "cve_id": top_node_cves.get(node_scope_id, [])[:3]
                }
            )
            count += 1
        return set_response(data=response)

class EmailConfigurationView(MethodView):
    @jwt_required()
    @admin_user_only
    def post(self, config_id=None):
        if not request.is_json:
            raise InvalidUsage("Missing JSON post data in request")

        current_user = get_jwt_identity()
        user = User.query.filter_by(id=current_user["id"]).one_or_none()

        email_config_row = None
        if config_id:
            email_config_row = EmailConfiguration.query.get(config_id)
            if not email_config_row:
                raise NotFound("no configuration found with given config_id")
        else:
            if EmailConfiguration.query.count() >= 1:
                raise InvalidUsage("only one email configuration allowed")

        post_data = request.json
        email_provider = post_data.get('email_provider')
        if email_provider == "amazon_ses":
            if (post_data.get('email') is None) or (post_data.get('amazon_access_key') is None) or (
                    post_data.get('amazon_secret_key') is None) or (post_data.get('ses_region') is None):
                raise InvalidUsage("Data is missing")
        elif email_provider == "smtp":
            if (post_data.get('email') is None) or (post_data.get('password') is None) or (
                    post_data.get('port') is None) or (post_data.get('smtp') is None):
                raise InvalidUsage("Data is missing")
        else:
            raise InvalidUsage("invalid email_provider")

        email_config = {}
        if email_provider == "amazon_ses":
            email_config = {
                "email": post_data.get("email"),
                "amazon_access_key": encrypt_cloud_credential(post_data.get("amazon_access_key")),
                "amazon_secret_key": encrypt_cloud_credential(post_data.get("amazon_secret_key")),
                "ses_region": post_data.get("ses_region")
            }
        elif email_provider == "smtp":
            email_config = {
                "email": post_data.get('email'),
                "password": encrypt_cloud_credential(post_data.get('password')),
                "port": int(post_data.get('port')),
                "smtp": post_data.get('smtp')
            }

        if not email_config_row:
            email_config_row = EmailConfiguration(email_config=email_config, user=user, company=user.company)

        try:
            email_config_row.email_provider = email_provider
            email_config_row.save()
        except Exception as ex:
            app.logger.error("while adding email creds: error={}".format(ex))
            raise InvalidUsage("error saving email configuration")
        return set_response(data="email configuration saved", status=201)

    @jwt_required()
    @non_read_only_user
    def get(self, config_id=None):
        if config_id is not None:
            email_config = EmailConfiguration.query.get(config_id)
            if email_config:
                return set_response(data=[email_config.pretty_print()])
            else:
                raise NotFound("email config with id {} not found".format(config_id))
        else:
            return set_response(data=[email_config.pretty_print() for email_config in EmailConfiguration.query.all()])

    @jwt_required()
    @admin_user_only
    def delete(self, config_id):
        email_config = EmailConfiguration.query.get(config_id)
        if not email_config:
            raise NotFound("email config with id {0} not found".format(config_id))
        try:
            email_config.delete()
        except:
            raise InvalidUsage("could not delete email configuration")
        return set_response(status=204)


email_configuration_view = EmailConfigurationView.as_view('email_configuration')
common_api.add_url_rule('/settings/email_configuration', defaults={'config_id': None},
                        view_func=email_configuration_view, methods=['GET', 'POST'])
common_api.add_url_rule('/settings/email_configuration/<int:config_id>', view_func=email_configuration_view,
                        methods=['GET', 'POST'], endpoint='api_v1_3_email_configuration')
common_api.add_url_rule('/settings/email_configuration/<int:config_id>', view_func=email_configuration_view,
                        methods=['DELETE', ], endpoint='api_v1_3_email_configuration_delete')

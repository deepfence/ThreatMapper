from flask import Blueprint, request
from models.compliance_rules import ComplianceRules
from flask_jwt_extended import jwt_required
import urllib.parse
from utils.response import set_response
from utils.custom_exception import InvalidUsage
from utils.scope import fetch_topology_data
from utils.helper import async_http_post
from config.redisconfig import redis
from utils.constants import TIME_UNIT_MAPPING, COMPLIANCE_INDEX, COMPLIANCE_LOGS_INDEX, \
    ES_TERMS_AGGR_SIZE, NODE_TYPE_HOST, COMPLIANCE_CHECK_TYPES, SCOPE_TOPOLOGY_COUNT, \
    NODE_TYPE_CONTAINER, DF_ID_TO_SCOPE_ID_REDIS_KEY_PREFIX, TOPOLOGY_HOSTS_PROBE_MAP_REDIS_KEY, \
    REDIS_COMPLIANCE_APPLICABLE_SCANS_PREFIX, NODE_TYPE_CONTAINER_IMAGE, NODE_ACTION_COMPLIANCE_START_SCAN, \
    NODE_ACTION_COMPLIANCE_APPLICABLE_SCANS, SCOPE_HOST_API_CONTROL_URL, SCOPE_TOPOLOGY_COUNT_PREFIX, \
    COMPLIANCE_ES_TYPE, COMPLIANCE_LOGS_ES_TYPE
from utils.esconn import ESConn
from collections import defaultdict
from resource_models.node import Node
import time
import json
from datetime import datetime, timedelta
import hashlib
from utils.resource import filter_node_for_compliance
from utils.node_helper import get_node_compliance_status

compliance_api = Blueprint("compliance_api", __name__)


@compliance_api.route("/compliance/unique_scan_count", methods=["GET", "POST"])
@jwt_required()
def compliance_unique_scan_count():
    """
    Get no of nodes scanned / total no of nodes
    :return:
    """
    topology_count = redis.hgetall(SCOPE_TOPOLOGY_COUNT)
    if not topology_count:
        topology_count = {}
    response = {
        "total": {
            NODE_TYPE_HOST: int(topology_count.get(NODE_TYPE_HOST, 0)),
            NODE_TYPE_CONTAINER: int(topology_count.get(NODE_TYPE_CONTAINER, 0)),
            NODE_TYPE_CONTAINER_IMAGE: int(topology_count.get(NODE_TYPE_CONTAINER_IMAGE, 0))
        },
        "scanned": {
            NODE_TYPE_HOST: 0, NODE_TYPE_CONTAINER: 0, NODE_TYPE_CONTAINER_IMAGE: 0
        }
    }
    compliance_status = get_node_compliance_status(node_type="all", user_defined_tags_filter=None)
    for node_id, scan_details in compliance_status.items():
        for scan_detail in scan_details:
            response["scanned"][scan_detail["node_type"]] += 1
            # One compliance check type is enough
            break
    return set_response(data=response)


@compliance_api.route("/compliance/<compliance_check_type>/scan_count", methods=["GET", "POST"])
@jwt_required()
def compliance_scan_count(compliance_check_type):
    """
    Get no of nodes scanned / total no of nodes
    :param compliance_check_type: cis | nist_master | nist_slave | pcidss | hipaa
    :return:
    """
    if not compliance_check_type or compliance_check_type not in COMPLIANCE_CHECK_TYPES:
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

    filters = {}
    if request.is_json:
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        filters = request.json.get("filters", {})
    filters["compliance_check_type"] = compliance_check_type
    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)
    aggs = {
        "scan_id": {
            "terms": {
                "field": "scan_id.keyword",
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
                "node_type": {
                    "terms": {
                        "field": "node_type.keyword",
                        "size": 20
                    }
                }
            }
        }
    }
    aggs_response = ESConn.aggregation_helper(
        COMPLIANCE_INDEX,
        filters,
        aggs,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string
    )
    response = defaultdict(int)
    if "aggregations" in aggs_response:
        for scan_id_aggr in aggs_response["aggregations"]["scan_id"]["buckets"]:
            for node_type_aggr in scan_id_aggr["node_type"]["buckets"]:
                response[node_type_aggr["key"]] += 1
    return set_response(data=dict(response))


@compliance_api.route("/compliance/<compliance_check_type>/node_report", methods=["GET", "POST"])
@jwt_required()
def compliance_scanned_nodes(compliance_check_type):
    """
    Get compliance info grouped by scanned nodes
    :param compliance_check_type: cis | nist_master | nist_slave | pcidss | hipaa | mission_critical_classified

    Response:
    {
        "standard_8c8671120700f5c01beca24d266cba4bf078846d98451385686bac8a84f2fee9;<container>_2020-07-09T09:25:34.358":
        {
            "node_id": "8c8671120700f5c01beca24d266cba4bf078846d98451385686bac8a84f2fee9;<container>",
            "status": {
                "fail": 1,
                "notapplicable": 26,
                "notselected": 194,
                "pass": 17
            },
            "node_name": "ramanan-dev-3.deepfence.io/debian8",
            "node_type": "container",
            "scan_id": "standard_8c8671120700f5c01beca24d266cba4bf078846d98451385686bac8a84f2fee9;<container>_2020-07-09T09:25:34.358",
            "time_stamp": "2020-07-09T09:44:41.517Z"
        }
    }
    """
    if not compliance_check_type or compliance_check_type not in COMPLIANCE_CHECK_TYPES:
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

    filters = {}
    node_filters = {}
    page_size = 10
    start_index = 0
    if request.is_json:
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        filters = request.json.get("filters", {})
        node_filters = request.json.get("node_filters", {})
        page_size = request.json.get("size", page_size)
        start_index = request.json.get("start_index", start_index)
    filters["compliance_check_type"] = compliance_check_type
    if node_filters:
        tmp_filters = filter_node_for_compliance(node_filters)
        if tmp_filters:
            filters = {**filters, **tmp_filters}
    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)
    aggs = {
        "node_id": {
            "terms": {
                "field": "node_id.keyword",
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
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
                        },
                        "scan_recent_timestamp": {
                            "max": {
                                "field": "@timestamp"
                            }
                        },
                        "node_name": {
                            "terms": {
                                "field": "node_name.keyword"
                            }
                        }
                    }
                },
                "node_type": {
                    "terms": {
                        "field": "node_type.keyword",
                        "size": 1
                    },
                }
            }
        }
    }
    aggs_response = ESConn.aggregation_helper(
        COMPLIANCE_INDEX,
        filters,
        aggs,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string,
        add_masked_filter=False
    )
    response = []
    if "aggregations" in aggs_response:
        for node_id_aggr in aggs_response["aggregations"]["node_id"]["buckets"]:
            node_type = ""
            if node_id_aggr["node_type"]["buckets"]:
                node_type = node_id_aggr["node_type"]["buckets"][0]["key"]
            scan_list = []
            for scan_id_aggr in node_id_aggr["scan_id"]["buckets"]:
                scan_details = {
                    "time_stamp": scan_id_aggr["scan_recent_timestamp"]["value_as_string"], "status": {},
                    "node_name": "", "node_id": node_id_aggr["key"], "scan_id": scan_id_aggr["key"],
                    "node_type": node_type}
                if scan_id_aggr["node_name"]["buckets"]:
                    scan_details["node_name"] = scan_id_aggr["node_name"]["buckets"][0]["key"]
                for status_aggr in scan_id_aggr["status"]["buckets"]:
                    scan_details["status"][status_aggr["key"]] = status_aggr["doc_count"]
                scan_list.append(scan_details)
            scan_list = sorted(scan_list, key=lambda k: k["time_stamp"], reverse=True)
            if not scan_list:
                continue
            response.append({
                "node_name": scan_list[0]["node_name"],
                "node_type": scan_list[0]["node_type"],
                "scans": scan_list,
                "time_stamp": scan_list[0]["time_stamp"],
            })
    response = sorted(response, key=lambda k: k["time_stamp"], reverse=True)
    return set_response(data={"data": response[start_index:(start_index + page_size)], "total": len(response)})


@compliance_api.route("/compliance/<compliance_check_type>/test_status_report", methods=["GET", "POST"])
@jwt_required()
def compliance_test_status_report(compliance_check_type):
    """
    Get compliance details for compliance_check_type, grouped by test status
    :param compliance_check_type: cis | nist_master | nist_slave | pcidss | hipaa
    """
    if not compliance_check_type or compliance_check_type not in COMPLIANCE_CHECK_TYPES:
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
    aggs_response = ESConn.aggregation_helper(
        COMPLIANCE_INDEX,
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
    return set_response(data=response)


@compliance_api.route("/compliance/<compliance_check_type>/test_category_report", methods=["GET", "POST"])
@jwt_required()
def compliance_test_category_report(compliance_check_type):
    """
    Get compliance details for a node, grouped by test category and test status
    :param compliance_check_type: cis | nist_master | nist_slave | pcidss | hipaa

    {"data": {
    "container": {
      "info": 3,
      "note": 3,
      "pass": 10,
      "warn": 15
    },
    "container_image": {
      "info": 2,
      "note": 6,
      "pass": 0,
      "warn": 3
    }}
    """
    if not compliance_check_type or compliance_check_type not in COMPLIANCE_CHECK_TYPES:
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
    aggs = {
        "node_id": {
            "terms": {
                "field": "node_id.keyword",
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
                "test_category": {
                    "terms": {
                        "field": "test_category.keyword",
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
    aggs_response = ESConn.aggregation_helper(
        COMPLIANCE_INDEX,
        filters,
        aggs,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string
    )
    response = []
    unique_status_list = set()

    # if "aggregations" in aggs_response:
    #     for node_aggr in aggs_response["aggregations"]["node_id"]["buckets"]:
    #         for category_aggr in node_aggr["test_category"]["buckets"]:
    #             if category_aggr["key"] not in response:
    #                 response[category_aggr["key"]] = defaultdict(int)
    #             for status_aggr in category_aggr["status"]["buckets"]:
    #                 response[category_aggr["key"]][status_aggr["key"]] += status_aggr["doc_count"]
    #                 unique_status_list.add(status_aggr["key"])
    # # If one category has only "info", not "pass, fail" fix it by adding "0" as val
    # for category, status_data in response.items():
    #     missing_status = unique_status_list - set(list(status_data.keys()))
    #     for msng_st in missing_status:
    #         response[category][msng_st] = 0

    if "aggregations" in aggs_response:
        for node_aggr in aggs_response["aggregations"]["node_id"]["buckets"]:
            for category_aggr in node_aggr["test_category"]["buckets"]:
                data = {}
                data["node"] = category_aggr.get("key")
                for status_aggr in category_aggr["status"]["buckets"]:
                    data["value"] = status_aggr.get("doc_count")
                    data["type"] = status_aggr.get("key")
                    response.append(data)

    return set_response(data=response)


def get_compliance_check_status(node_id, compliance_check_type):
    es_response = ESConn.search_by_and_clause(
        COMPLIANCE_LOGS_INDEX, {"node_id": node_id, "compliance_check_type": compliance_check_type}, 0,
        size=1)
    latest_compliance_scan = {}
    compliance_scan_list = es_response.get("hits", [])
    if len(compliance_scan_list) > 0:
        latest_compliance_scan = compliance_scan_list[0].get('_source', {})
        latest_compliance_scan.update({'_id': compliance_scan_list[0].get('_id', "")})
    return set_response(data=latest_compliance_scan)


@compliance_api.route("/compliance/<path:node_id>/<compliance_check_type>/status", methods=["GET"])
@jwt_required()
def compliance_check_status(node_id, compliance_check_type):
    """
    Get status of most recent compliance scan for this node
    :param compliance_check_type:
    :param node_id:
    :return:
    """
    return get_compliance_check_status(node_id, compliance_check_type)


def get_all_compliance_check_status(node_id):
    search_queries = []
    for compliance_check_type in COMPLIANCE_CHECK_TYPES:
        search_queries.append({"index": COMPLIANCE_LOGS_INDEX})
        search_queries.append(ESConn.search_by_and_clause(
            COMPLIANCE_LOGS_INDEX, {"node_id": node_id, "compliance_check_type": compliance_check_type},
            0, size=1, get_only_query=True))
    es_responses = ESConn.msearch(search_queries).get("responses", [])
    # print("search_queries",search_queries)
    # print("es_responses",es_responses)
    latest_compliance_scan = {"compliance_status": {}}
    summary = ""
    completed_count = 0
    in_progress_count = 0
    error_count = 0
    for i, compliance_check_type in enumerate(COMPLIANCE_CHECK_TYPES):
        if es_responses[i].get("hits", {}).get("hits", []):
            latest_scan = es_responses[i]["hits"]["hits"][0].get('_source', {})
            latest_scan.update({'_id': es_responses[i]["hits"]["hits"][0].get('_id', "")})
            latest_compliance_scan["compliance_status"][compliance_check_type] = latest_scan
            if latest_scan.get("scan_status") in ["QUEUED", "INPROGRESS", "SCAN_IN_PROGRESS"]:
                in_progress_count += 1
            if latest_scan.get("scan_status") == 'ERROR':
                error_count += 1
            if latest_scan.get("scan_status") == 'COMPLETED':
                completed_count += 1
        else:
            latest_compliance_scan["compliance_status"][compliance_check_type] = {}
    if in_progress_count:
        scan_str = "scan"
        if in_progress_count > 1:
            scan_str = "scans"
        summary = "{0} {1} in progress".format(in_progress_count, scan_str)
    elif completed_count:
        scan_str = "scan"
        if completed_count > 1:
            scan_str = "scans"
        summary = "{0} {1} completed".format(completed_count, scan_str)
    elif error_count:
        scan_str = "scan"
        if error_count > 1:
            scan_str = "scans"
        summary = "{0} {1} failed".format(error_count, scan_str)
    if not summary:
        summary = "Never Scanned"
    latest_compliance_scan["summary"] = summary
    return latest_compliance_scan


@compliance_api.route("/compliance/<path:node_id>/status", methods=["GET"])
@jwt_required()
def node_compliance_check_status(node_id):
    """
    Get status of most recent compliance scan for this node
    :param node_id:
    :return:
    """
    return set_response(data=get_all_compliance_check_status(node_id))


@compliance_api.route("/compliance/<path:node_id>/<compliance_check_type>/scan_status", methods=["GET"],
                      endpoint="api_v1_5_compliance_scan_status")
@jwt_required()
def compliance_scan_check_status(node_id, compliance_check_type):
    """
    Compliance API - Check Compliance Scan Status
    ---
    tags:
      - Compliance
    security:
      - Bearer: []
    operationId: checkComplianceScanStatus
    description: Check status of compliance scan on this node (Applicable node type - `host`, `container`)
    parameters:
      - in: path
        name: node_id
        description: Node ID (refer enumerate api)
        type: string
      - in: path
        name: compliance_check_type
        type: string
        example: pcidss
        description: Compliance check type. Not all options are available. Check applicable compliance scans first.
        enum: [cis, nist_master, nist_slave, pcidss, hipaa, standard]
    responses:
      200:
        description: Request success
        properties:
          data:
            type: string
            description: Response message
          error:
            type: string
            description: Error message, if any. Otherwise `null`
          success:
            type: boolean
            description: Success status
            enum: [true, false]
      400:
        description: Bad request
      401:
        description: Unauthorized
    """
    node = Node(node_id)
    return get_compliance_check_status(node.scope_id, compliance_check_type)


def mask_scan_results(es_resp):
    docs_to_be_masked = [{"_index": doc["_index"], "_id": doc["_id"]} for doc in es_resp]
    ESConn.bulk_mask_docs(docs_to_be_masked)
    return len(docs_to_be_masked)


@compliance_api.route("/compliance/scan_results", methods=["POST"],
                      endpoint="api_v1_5_compliance_scan_results")
@jwt_required()
def compliance_scan_results():
    """
    Compliance API - Get/Delete Compliance Scan Results with filters
    ---
    tags:
      - Compliance
    security:
      - Bearer: []
    operationId: findComplianceScanResults
    description: Get/Delete compliance scan results with filters for node_id, compliance_check_type, etc
    parameters:
    - in: body
      name: Options
      description: Options to get or delete compliance scan results
      schema:
        type: object
        properties:
          action:
            type: string
            enum: [get, delete]
            default: get
            description: Action to perform - `get` or `delete`
          size:
            type: integer
            example: 10
            default: 10
            minimum: 1
            maximum: 10000
            description: The numbers of scan results to return
          start_index:
            type: integer
            example: 0
            minimum: 0
            maximum: 9999
            default: 0
            description: The number of items to skip before starting to collect the result set
          filters:
            description: Filter compliance scan results by various fields (key value pairs)
            type: object
            properties:
              node_id:
                type: array
                uniqueItems: true
                description: Node ID (refer enumerate api)
                example: ["wekgfewgj"]
                items:
                  type: string
              scan_id:
                type: array
                uniqueItems: true
                description: Scan ID
                example: ["wekgfewgj"]
                items:
                  type: string
              compliance_check_type:
                type: array
                uniqueItems: true
                description: Compliance check type. Not all options are available. Check applicable compliance scans first.
                example: ["pcidss"]
                items:
                  type: string
                  enum: [cis, nist_master, nist_slave, pcidss, hipaa, standard]
              status:
                type: array
                uniqueItems: true
                description: Test status
                example: ["pass", "fail"]
                items:
                  type: string
              host_name:
                type: array
                uniqueItems: true
                description: Host names
                example: ["dev-1", "dev-2"]
                items:
                  type: string
    responses:
      200:
        description: Request success
        properties:
          data:
            type: object
            description: Response message
            properties:
              message:
                type: string
          error:
            type: string
            description: Error message, if any. Otherwise `null`
          success:
            type: boolean
            description: Success status
            enum: [true, false]
      400:
        description: Bad request
      401:
        description: Unauthorized
    """
    es_source = [
        "@timestamp", "host_name", "type", "node_name", "test_category", "compliance_check_type", "test_rationale",
        "test_severity", "node_type", "test_info", "test_number", "test_desc", "status", "scan_id"]
    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    req_json = request.json
    action = req_json.get("action", "get")
    filters = req_json.get("filters", {})
    if not filters:
        filters = {"type": COMPLIANCE_ES_TYPE}
    filters["masked"] = "false"
    if "node_id" in filters:
        scope_ids = []
        for node_id in filters["node_id"]:
            node = Node(node_id)
            scope_ids.append(node.scope_id)
        filters["node_id"] = scope_ids
    if action == "get":
        es_resp = ESConn.search_by_and_clause(
            COMPLIANCE_INDEX, filters, req_json.get("start_index", 0),
            req_json.get("sort_order", "desc"), size=req_json.get("size", 10), _source=es_source)
        return set_response(data=es_resp["hits"])
    elif action == "delete":
        es_resp = ESConn.search_by_and_clause(
            COMPLIANCE_INDEX, filters, req_json.get("start_index", 0),
            req_json.get("sort_order", "desc"), size=req_json.get("size", 10), _source=["_id"])
        no_of_docs_to_be_masked = mask_scan_results(es_resp["hits"])
        return set_response(data={"message": "deleted {0} scan results".format(no_of_docs_to_be_masked)})
    else:
        raise InvalidUsage("Unsupported action: {0}".format(action))


def write_compliance_scan_log(params):
    time_time = time.time()
    datetime_now = datetime.now()
    es_doc = {
        "total_checks": 0,
        "masked": "false",
        "node_name": "",
        "scan_id": "{0}_{1}_{2}".format(params["compliance_check_type"], params["node_id"],
                                        datetime_now.strftime("%Y-%m-%dT%H:%M:%S") + ".000"),
        "type": COMPLIANCE_LOGS_ES_TYPE,
        "result": {},
        "scan_message": "",
        "time_stamp": int(time_time * 1000.0),
        "@timestamp": datetime_now.strftime("%Y-%m-%dT%H:%M:%S.") + repr(time_time).split('.')[1][:3] + "Z"
    }
    es_doc.update(params)
    es_doc["doc_id"] = hashlib.md5(
        (es_doc["node_id"] + es_doc["node_type"] + es_doc["compliance_check_type"] + es_doc["scan_status"] + str(
            es_doc["time_stamp"])).encode("utf-8")).hexdigest()
    es_response = ESConn.overwrite_doc_having_id(COMPLIANCE_LOGS_INDEX, es_doc, es_doc["doc_id"])
    return es_response


@compliance_api.route("/add-compliance-scan-log", methods=["POST"])
@jwt_required()
def add_compliance_scan_log():
    """
    Add a compliance scan log document to ES
    Input should be a json object with the below format
    ```
    {
      "total_checks" : 0,
      "time_stamp" : 1538391985756,
      "scan_status" : "INPROGRESS",
      "masked" : "false",
      "node_name" : "",
      "input_type" : "log",
      "type" : "compliance-scan-logs",
      "doc_id" : "09f4e6f052733f4dd150c0d404ff3c40",
      "compliance_check_type" : "standard",
      "result" : { },
      "scan_message" : "",
      "node_type" : "container",
      "@timestamp" : "2018-10-01T11:06:26.954Z",
      "container_name" : "ip-172-31-22-210",
      "@version" : "1",
      "host" : "ip-172-31-22-210",
      "host_name" : "ip-172-31-22-210",
      "node_id" : "cfbedd94369557f889264a400a82c5e44213e8099ebdcccdaeb7af6b58457fcb;<container>"
    }
    ```
    ---
    security:
      - Bearer: []
    parameters:
      - name: input_json
        in: body
        type: string
        required: true
        schema:
          properties:
            node_id:
              type: string
              description: The node_id of container or host name
              example: mysql;<container>
              required: true
            scan_status:
              type: string
              description: Status of the scan
              example: QUEUED
              required: true
              enum: [QUEUED, INPROGRESS, SCAN_IN_PROGRESS, COMPLETED, ERROR]
            scan_message:
              type: string
              description: Information regarding the compliance scan
              example: Invalid compliance_check_type
              required: false
            compliance_check_type:
              type: string
              description: Compliance check type. Not all options are available. Check applicable compliance scans first.
              example: pcidss
              enum: [cis, nist_master, nist_slave, pcidss, hipaa, standard]
            node_type:
              type: string
              description: Node type
              example: host
              enum: [host, container]
    responses:
      200:
        description: Returns the document ID of the newly inserted document
      400:
        description: bad request (like missing text data)
    """
    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    req_json = request.get_json()
    if 'node_id' not in req_json:
        raise InvalidUsage("node_id is mandatory")
    if 'node_type' not in req_json:
        raise InvalidUsage("node_type is mandatory")
    if 'scan_status' not in req_json:
        raise InvalidUsage("scan_status is mandatory")
    if "compliance_check_type" not in req_json:
        raise InvalidUsage("compliance_check_type is mandatory")
    es_response = write_compliance_scan_log(req_json)
    return set_response(es_response['_id'])


@compliance_api.route("/compliance/start-for-tag", methods=["POST"])
@jwt_required()
def compliance_bulk_start():
    if not request.is_json:
        raise InvalidUsage("Missing json in request")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    tags_list = request.json.get("tags_list", [])
    if type(tags_list) != list:
        raise InvalidUsage("tags_list should be list of tags")
    tags_list = [tag for tag in tags_list if tag]
    if not tags_list:
        raise InvalidUsage("tags_list is required")
    compliance_check_type_list = request.json.get("compliance_check_type_list", [])
    if type(compliance_check_type_list) != list:
        raise InvalidUsage("compliance_check_type_list should be list of tags")
    compliance_check_type_list = [check_type for check_type in compliance_check_type_list if COMPLIANCE_CHECK_TYPES]
    if not compliance_check_type_list:
        raise InvalidUsage("compliance_check_type_list is required")

    nodetypes = [NODE_TYPE_HOST, NODE_TYPE_CONTAINER, NODE_TYPE_CONTAINER_IMAGE]
    url_data_list = []
    bulk_es_query = []
    for node_type in nodetypes:
        topology_data = fetch_topology_data(node_type, format="deepfence")
        df_id_to_scope_id = redis.hgetall(DF_ID_TO_SCOPE_ID_REDIS_KEY_PREFIX + node_type.upper())
        # filter by given tag
        filtered_topology = {k: v for k, v in topology_data.items() if
                             v.get("user_defined_tags", []) and (set(v.get("user_defined_tags", [])) & set(tags_list))}
        # Get node applicable compliance scans
        node_id_applicable_scans_map = {}
        applicable_scans_url_data_list = []
        url_to_node_data = {}
        host_name_probe_map = redis.get(TOPOLOGY_HOSTS_PROBE_MAP_REDIS_KEY)
        if not host_name_probe_map:
            host_name_probe_map = "{}"
        host_name_probe_map = json.loads(host_name_probe_map)
        for node_id, node_details in filtered_topology.items():
            host_name = node_details.get("host_name", "")
            probe_id = host_name_probe_map.get(host_name, "")
            if not probe_id:
                continue
            if node_type == NODE_TYPE_HOST:
                redis_key = "{0}:{1}:{2}".format(REDIS_COMPLIANCE_APPLICABLE_SCANS_PREFIX, node_type, host_name)
            else:
                redis_key = "{0}:{1}:{2}".format(REDIS_COMPLIANCE_APPLICABLE_SCANS_PREFIX,
                                                 NODE_TYPE_CONTAINER_IMAGE, node_details.get("image_name_with_tag", ""))
            applicable_scans = redis.get(redis_key)
            if applicable_scans:
                node_id_applicable_scans_map[node_id] = json.loads(applicable_scans)
            else:
                scope_id = df_id_to_scope_id.get(node_id, None)
                if not scope_id:
                    continue
                post_data = {"node_type": node_type}
                if node_type == NODE_TYPE_CONTAINER:
                    post_data["container_id"] = node_details.get("docker_container_id", "")
                elif node_type == NODE_TYPE_CONTAINER_IMAGE:
                    post_data["image_id"] = node_details.get("docker_image_id", "")
                applicable_scans_api_url = SCOPE_HOST_API_CONTROL_URL.format(
                    probe_id=probe_id, host_name=host_name, action=NODE_ACTION_COMPLIANCE_APPLICABLE_SCANS)
                applicable_scans_url_data_list.append((applicable_scans_api_url, json.dumps(post_data)))
                url_to_node_data[applicable_scans_api_url] = {"node_id": node_id, "redis_key": redis_key}
        if applicable_scans_url_data_list:
            redis_pipe = redis.pipeline()
            output = async_http_post(applicable_scans_url_data_list)
            for url, response in output.items():
                if type(response) == dict:
                    node_id_applicable_scans_map[url_to_node_data[url]["node_id"]] = response
                    redis_pipe.setex(url_to_node_data[url]["redis_key"], timedelta(days=14), json.dumps(response))
            redis_pipe.execute()
        # Start compliance scan
        time_time = time.time()
        datetime_now = datetime.now()

        aggs = {"node_id": {"terms": {"field": "node_id.keyword", "size": ES_TERMS_AGGR_SIZE}, "aggs": {
            "compliance_check_type": {"terms": {"field": "compliance_check_type.keyword"}, "aggs": {
                "scan_status": {"terms": {"field": "scan_status.keyword"},
                                "aggs": {"scan_recent_timestamp": {"max": {"field": "@timestamp"}}}}}}}}}
        aggs_response = ESConn.aggregation_helper(COMPLIANCE_LOGS_INDEX, {}, aggs, None, None, None,
                                                  add_masked_filter=False)
        in_progress_scans = defaultdict(list)
        if "aggregations" in aggs_response:
            for node_id_aggr in aggs_response["aggregations"]["node_id"]["buckets"]:
                for check_type_aggr in node_id_aggr["compliance_check_type"]["buckets"]:
                    latest_status = ""
                    latest_timestamp = 0.0
                    for scan_status_aggr in check_type_aggr["scan_status"]["buckets"]:
                        if scan_status_aggr["scan_recent_timestamp"]["value"] >= latest_timestamp:
                            latest_status = scan_status_aggr["key"]
                            latest_timestamp = scan_status_aggr["scan_recent_timestamp"]["value"]
                    if latest_status in ["INPROGRESS", "SCAN_IN_PROGRESS", "QUEUED"]:
                        in_progress_scans[check_type_aggr["key"]].append(node_id_aggr["key"])

        for node_id, node_details in filtered_topology.items():
            scope_id = df_id_to_scope_id.get(node_id, None)
            if not scope_id:
                continue
            applicable_scans = node_id_applicable_scans_map.get(node_id, {}).get("complianceScanLists", [])
            host_name = node_details.get("host_name", "")
            probe_id = host_name_probe_map.get(host_name, "")
            for check_type in compliance_check_type_list:
                check_type_found = False
                for applicable_check_type in applicable_scans:
                    if applicable_check_type["code"] == check_type:
                        check_type_found = True
                        break
                if not check_type_found:
                    continue
                if scope_id in in_progress_scans.get(check_type, []):
                    # scan is already in progress
                    continue
                es_doc = {
                    "total_checks": 0,
                    "result": {},
                    "node_id": scope_id,
                    "node_type": node_type,
                    "compliance_check_type": check_type,
                    "masked": "false",
                    "node_name": "",
                    "host_name": host_name,
                    "type": COMPLIANCE_LOGS_ES_TYPE,
                    "scan_status": "QUEUED",
                    "scan_message": "",
                    "scan_id": check_type + "_" + scope_id + "_" + datetime_now.strftime(
                        "%Y-%m-%dT%H:%M:%S") + ".000",
                    "time_stamp": int(time_time * 1000.0),
                    "@timestamp": datetime_now.strftime("%Y-%m-%dT%H:%M:%S.") + repr(time_time).split('.')[1][:3] + "Z"
                }
                bulk_es_query.append('{"index":{"_index":"' + COMPLIANCE_LOGS_INDEX + '"}}')
                bulk_es_query.append(json.dumps(es_doc))
                post_data = {"check_type": check_type, "node_type": node_type}
                if node_type == NODE_TYPE_CONTAINER:
                    post_data["container_id"] = node_details.get("docker_container_id", "")
                elif node_type == NODE_TYPE_CONTAINER_IMAGE:
                    post_data["image_id"] = node_details.get("docker_image_id", "")
                    post_data["image_name"] = node_details.get("image_name_with_tag", "")
                disabled_rules = ComplianceRules.query.filter_by(
                    compliance_check_type=check_type, is_enabled=False).all()
                ignore_test_numbers = []
                if disabled_rules:
                    ignore_test_numbers = [rule.test_number for rule in disabled_rules]
                post_data["ignore_test_number_list"] = json.dumps(ignore_test_numbers)
                compliance_start_api = SCOPE_HOST_API_CONTROL_URL.format(
                    probe_id=probe_id, host_name=host_name, action=NODE_ACTION_COMPLIANCE_START_SCAN)
                url_data_list.append((compliance_start_api, json.dumps(post_data)))
    if url_data_list:
        output = async_http_post(url_data_list)
    if bulk_es_query:
        ESConn.bulk_query(COMPLIANCE_LOGS_INDEX, bulk_es_query)
    return set_response("OK")


@compliance_api.route("/compliance/<compliance_check_type>/controls", methods=["GET"])
@jwt_required()
def compliance_rules(compliance_check_type):
    """
    Compliance API - Get Controls
    ---
    tags:
      - Compliance
    security:
      - Bearer: []
    operationId: getComplianceControls
    description: Get list of all controls defined for compliance
    parameters:
      - in: path
        name: compliance_check_type
        type: string
        example: pcidss
        description: Compliance check type. Not all options are available. Check applicable compliance scans first.
        enum: [cis, nist_master, nist_slave, pcidss, hipaa, standard]
    responses:
      200:
        description: Request success
        properties:
          data:
            type: string
            description: Response message
          error:
            type: string
            description: Error message, if any. Otherwise `null`
          success:
            type: boolean
            description: Success status
            enum: [true, false]
      400:
        description: Bad request
      401:
        description: Unauthorized
    """
    if not compliance_check_type or compliance_check_type not in COMPLIANCE_CHECK_TYPES:
        raise InvalidUsage("Invalid compliance_check_type: {0}".format(compliance_check_type))

    rules = ComplianceRules.query.filter_by(compliance_check_type=compliance_check_type).order_by(
        ComplianceRules.created_at.asc()).all()
    if not rules:
        rules = []
    response = {
        "rules": [{
            "id": rule.id,
            "compliance_check_type": rule.compliance_check_type,
            "test_category": rule.test_category,
            "test_number": rule.test_number,
            "test_desc": rule.test_desc,
            "is_enabled": rule.is_enabled,
        } for rule in rules]
    }
    return set_response(data=response)


@compliance_api.route("/compliance/update_controls", methods=["POST"])
@jwt_required()
def compliance_rules_update():
    """
    Compliance API - Enable / Disable Controls
    ---
    tags:
      - Compliance
    security:
      - Bearer: []
    operationId: updateComplianceControls
    description: Enable or disable controls defined for compliance
    parameters:
    - in: body
      name: Options
      description: Options to enable or disable controls defined for compliance
      schema:
        type: object
        properties:
          action:
            type: string
            enum: [enable, disable]
            description: Action to perform - `enable` or `disable`
          rule_id_list:
            type: array
            uniqueItems: true
            required: true
            description: List of rule ids
            example: [1,3,5]
            items:
              type: integer
    responses:
      201:
        description: Updated successfully.
      400:
        description: Bad request.
    """
    if not request.is_json:
        raise InvalidUsage("Missing JSON post data in request")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    action = request.json.get("action", "enable")
    if action not in ["enable", "disable"]:
        raise InvalidUsage("action must be enable or disable")
    is_enabled = True
    if action == "disable":
        is_enabled = False
    rule_id_list = request.json.get("rule_id_list")
    if not rule_id_list:
        raise InvalidUsage("rule_id_list is required")
    if type(rule_id_list) != list:
        raise InvalidUsage("rule_id_list must be list")
    ComplianceRules.bulk_update_rules(ComplianceRules.query.filter(ComplianceRules.id.in_(rule_id_list)), is_enabled)
    return set_response(status=201)


@compliance_api.route("/compliance/summary", methods=["GET"])
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

    aggs_scan_count = {
        "compliance_check_type": {
            "terms": {
                "field": "compliance_check_type.keyword",
                "size": 30
            },
            "aggs": {
                "node_name": {
                    "cardinality": {
                        "field": "node_name.keyword"
                    }
                }
            }
        }
    }
    scan_count_query = ESConn.aggregation_helper(
        COMPLIANCE_INDEX,
        {"type": COMPLIANCE_ES_TYPE},
        aggs_scan_count,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string,
        add_masked_filter=False,
        get_only_query=True
    )

    aggs_scan_status = {
        "compliance_check_type": {
            "terms": {
                "field": "compliance_check_type.keyword",
            },
            "aggs": {
                "status": {
                    "terms": {
                        "field": "status.keyword",
                    }
                }
            },
        }
    }
    scan_status_query = ESConn.aggregation_helper(
        COMPLIANCE_INDEX,
        {"type": COMPLIANCE_ES_TYPE},
        aggs_scan_status,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string,
        add_masked_filter=False,
        get_only_query=True
    )

    search_queries = [
        {"index": COMPLIANCE_INDEX}, scan_count_query,
        {"index": COMPLIANCE_INDEX}, scan_status_query
    ]
    multisearch_response = ESConn.msearch(search_queries).get("responses", [])

    scan_count_data = []
    if "aggregations" in multisearch_response[0]:
        for check_type_aggr in multisearch_response[0]["aggregations"]["compliance_check_type"]["buckets"]:
            el = {
                "compliance_check_type": check_type_aggr.get('key'),
                "count": check_type_aggr.get("node_name", {}).get("value", 0)
            }
            scan_count_data.append(el)

    scan_status_data = []
    scan_status_data_pass = []
    if "aggregations" in multisearch_response[1]:
        for check_type_aggr in multisearch_response[1]["aggregations"]["compliance_check_type"]["buckets"]:
            el = {
                "compliance_check_type": check_type_aggr.get('key'),
                "count": check_type_aggr.get("doc_count"),
                "aggs": check_type_aggr["status"]["buckets"]
            }
            scan_status_data.append(el)

    for scan_status_info in scan_status_data:
        compliance_info_pass_data = {}
        compliance_info_pass_data["node"] = scan_status_info.get("compliance_check_type")
        compliance_info_pass_data["type"] = "pass"
        for scan_status_pass_count in scan_status_info.get("aggs"):
            if scan_status_pass_count.get("key") == "pass":
                pass_count = scan_status_pass_count.get("doc_count")
                compliance_info_pass_data["value"] = round(pass_count / scan_status_info.get("count") * 100, 2)
                break
        scan_status_data_pass.append(compliance_info_pass_data)

    # Dont change mget order: [0] = host, [1] = container
    resp = redis.mget(SCOPE_TOPOLOGY_COUNT_PREFIX + NODE_TYPE_HOST.upper(),
                      SCOPE_TOPOLOGY_COUNT_PREFIX + NODE_TYPE_CONTAINER.upper(),
                      SCOPE_TOPOLOGY_COUNT_PREFIX + NODE_TYPE_CONTAINER_IMAGE.upper())

    # unique_scan_data = {
    #     "total": {
    #         NODE_TYPE_HOST: int(resp[0]) if resp[0] else 0,
    #         NODE_TYPE_CONTAINER: int(resp[1]) if resp[1] else 0,
    #         NODE_TYPE_CONTAINER_IMAGE: int(resp[2]) if resp[2] else 0
    #     },
    #     "scanned": {
    #         NODE_TYPE_HOST: 0, NODE_TYPE_CONTAINER: 0, NODE_TYPE_CONTAINER_IMAGE: 0
    #     }
    # }    

    unique_scan_data = [
        {
            "type": "total",
            "node": NODE_TYPE_HOST,
            "value": int(resp[0]) if resp[0] else 0
        },
        {
            "type": "total",
            "node": NODE_TYPE_CONTAINER,
            "value": int(resp[1]) if resp[1] else 0
        },
        {
            "type": "total",
            "node": NODE_TYPE_CONTAINER_IMAGE,
            "value": int(resp[2]) if resp[2] else 0
        }
    ]

    # compliance_status = get_node_compliance_status(node_type="all", user_defined_tags_filter=None)
    # for node_id, scan_details in compliance_status.items():
    #     for scan_detail in scan_details:
    #         unique_scan_data["scanned"][scan_detail["node_type"]] += 1
    #         # One compliance check type is enough
    #         break

    compliance_status = get_node_compliance_status(node_type="all", user_defined_tags_filter=None)
    # print("compliance_status",compliance_status)

    scanned_data = {}
    for node_id, scan_details in compliance_status.items():
        scanned_data["type"] = "scanned"
        scanned_data["value"] = 0
        for scan_detail in scan_details:
            scanned_data["node"] = scan_detail["node_type"]
            scanned_data["value"] += 1
            unique_scan_data.append(scanned_data)
            # One compliance check type is enough
            break

    unify = {
        "compliance_scan_count": scan_count_data,
        "compliance_scan_status": scan_status_data,
        "compliance_scan_status_pass": scan_status_data_pass,
        "compliance_unique_scan": unique_scan_data,
    }

    return set_response(data=unify)

import json
from datetime import datetime

from flask import Blueprint, request
from flask_jwt_extended import jwt_required
import urllib.parse

from collections import defaultdict

from config.redisconfig import redis
from models.container_image_registry import RegistryCredential
from models.scheduler import Scheduler
from utils import constants
from utils.common import calculate_interval
from utils.es_query_utils import get_latest_secret_scan_id
from utils.helper import websocketio_channel_name_format, get_all_secret_scanned_images
from utils.response import set_response
from utils.custom_exception import InvalidUsage, InternalError
from utils.resource import filter_node_for_secret_scan
from utils.constants import TIME_UNIT_MAPPING, SECRET_SCAN_INDEX, SECRET_SCAN_LOGS_INDEX, \
    ES_TERMS_AGGR_SIZE, ES_MAX_CLAUSE
from utils.esconn import ESConn, GroupByParams
from resource_models.node import Node
import pandas as pd
import re
import requests
import time

secret_api = Blueprint("secret_api", __name__)


@secret_api.route("/secret/node_report", methods=["GET", "POST"])
@jwt_required()
def secret_scanned_nodes():
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
        req_filters = request.json.get("filters", {})
        node_ids = []
        node_ids.extend(req_filters.get("image_name_with_tag", []))
        node_ids.extend(req_filters.get("host_name", []))
        filters["node_id"] = node_ids
        if len(req_filters.get("container_name", [])) > 0:
            filters["container_name"] = req_filters.get("container_name", [])
        if len(req_filters.get("kubernetes_cluster_name", [])) > 0:
            filters["kubernetes_cluster_name"] = req_filters.get("kubernetes_cluster_name", [])
        node_filters = request.json.get("node_filters", {})
        page_size = request.json.get("size", page_size)
        start_index = request.json.get("start_index", start_index)
    if node_filters:
        tmp_filters = filter_node_for_secret_scan(node_filters)
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
                        "severity": {
                            "terms": {
                                "field": "Severity.level.keyword",
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
                        },
                        "container_name": {
                            "terms": {
                                "field": "container_name.keyword"
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
        SECRET_SCAN_INDEX,
        filters,
        aggs,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string
    )
    response = []
    active_containers = defaultdict(int)
    containers_topology_data = redis.get(
        websocketio_channel_name_format("{0}?format=deepfence".format(constants.NODE_TYPE_CONTAINER))[1])
    if containers_topology_data:
        containers_topology_data = json.loads(containers_topology_data)
        for df_id, container in containers_topology_data.items():
            if container.get("image_name"):
                if container.get("docker_container_state") != "running":
                    continue
                active_containers[
                    "{0}:{1}".format(container.get("image_name", ""), container.get("image_tag", ""))] += 1

    scan_aggs = {
        "node_id": {
            "terms": {
                "field": "node_id.keyword",
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
                "scan_status": {
                    "terms": {
                        "field": "scan_status.keyword",
                        "size": ES_TERMS_AGGR_SIZE
                    }
                }
            }
        }
    }
    scan_aggs_response = ESConn.aggregation_helper(
        SECRET_SCAN_LOGS_INDEX,
        {},
        scan_aggs
    )
    status_map = {}
    for node in scan_aggs_response["aggregations"]["node_id"]["buckets"]:
        status_map[node["key"]] = {"error_count": 0, "total_count": 0}
        for status_bucket in node["scan_status"]["buckets"]:
            if status_bucket["key"] == constants.SECRET_SCAN_STATUS_COMPLETED or \
                    status_bucket["key"] == constants.CVE_SCAN_STATUS_ERROR:
                status_map[node["key"]]["total_count"] += status_bucket["doc_count"]
            if status_bucket["key"] == constants.CVE_SCAN_STATUS_ERROR:
                status_map[node["key"]]["error_count"] += status_bucket["doc_count"]

    if "aggregations" in aggs_response:
        for node_id_aggr in aggs_response["aggregations"]["node_id"]["buckets"]:
            node_type = ""
            if node_id_aggr["node_type"]["buckets"]:
                node_type = node_id_aggr["node_type"]["buckets"][0]["key"]
            scan_list = []
            for scan_id_aggr in node_id_aggr["scan_id"]["buckets"]:
                scan_details = {
                    "time_stamp": scan_id_aggr["scan_recent_timestamp"]["value_as_string"], "severity": {},
                    "node_name": "", "node_id": node_id_aggr["key"], "scan_id": scan_id_aggr["key"],
                    "node_type": node_type, "scan_status": constants.SECRET_SCAN_STATUS_COMPLETED}
                if scan_id_aggr["node_name"]["buckets"]:
                    scan_details["node_name"] = node_id_aggr["key"].split(";")[0]
                if scan_id_aggr["container_name"]["buckets"] and scan_id_aggr["container_name"]["buckets"][0]["key"] != "":
                    scan_details["container_name"] = scan_id_aggr["container_name"]["buckets"][0]["key"]
                    scan_details["node_name"] = scan_details["container_name"]
                for status_aggr in scan_id_aggr["severity"]["buckets"]:
                    scan_details["severity"][status_aggr["key"]] = status_aggr["doc_count"]
                scan_details["total"] = 0
                for severity in scan_details["severity"]:
                    scan_details["total"] += scan_details["severity"][severity]
                scan_details["active_containers"] = active_containers.get(scan_details["node_name"].split(";")[0], 0)
                scan_list.append(scan_details)
            scan_list = sorted(scan_list, key=lambda k: k["time_stamp"], reverse=True)
            if not scan_list:
                continue
            node_data = {
                "node_name": scan_list[0].get("container_name", "") if scan_list[0]["node_type"] == constants.NODE_TYPE_CONTAINER else scan_list[0]["node_name"],
                "node_id": scan_list[0]["node_id"],
                "node_type": scan_list[0]["node_type"],
                "scans": scan_list,
                "time_stamp": scan_list[0]["time_stamp"],
            }
            node_data["total_count"] = status_map.get(node_data["node_id"], {}).get("total_count", 0)
            node_data["error_count"] = status_map.get(node_data["node_id"], {}).get("error_count", 0)
            response.append(node_data)
    response = sorted(response, key=lambda k: k["time_stamp"], reverse=True)
    return set_response(data={"data": response[start_index:(start_index + page_size)], "total": len(response)})


@secret_api.route("/secret/scan_results", methods=["POST"],
                  endpoint="api_v1_5_secret_scan_results")
@jwt_required()
def secret_scan_results():
    """
    Secret API - Get/Delete Secret Scan Results with filters
    ---
    tags:
      - Secret
    security:
      - Bearer: []
    operationId: findSecretScanResults
    description: Get/Delete secret scan results with filters for node_id
    parameters:
    - in: body
      name: Options
      description: Options to get or delete secret scan results
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
            description: Filter secret scan results by various fields (key value pairs)
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
    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    req_json = request.json
    action = req_json.get("action", "get")
    filters = req_json.get("filters", {})
    lucene_query = request.args.get("lucene_query", None)
    if not filters:
        filters = {}
    if "node_id" in filters:
        scope_ids = []
        for node_id in filters["node_id"]:
            node = Node(node_id)
            scope_ids.append(node.scope_id)
        filters["node_id"] = scope_ids
    if action == "get":
        es_resp = ESConn.search_by_and_clause(
            SECRET_SCAN_INDEX, filters, req_json.get("start_index", 0),
            req_json.get("sort_order", "desc"), size=req_json.get("size", 10),
            scripted_sort=[{"Severity.score": {"order": "desc", "unmapped_type": "double"}}],
            lucene_query_string=lucene_query)
        return set_response(data={"rows": es_resp["hits"], "total": es_resp.get("total", {}).get("value", 0)})
    elif action == "delete":
        es_resp = ESConn.search_by_and_clause(
            SECRET_SCAN_INDEX, filters, req_json.get("start_index", 0),
            req_json.get("sort_order", "desc"), size=req_json.get("size", 10), _source=["_id"])
        # no_of_docs_to_be_masked = mask_scan_results(es_resp["hits"])
        # no_of_docs_to_be_masked parameter of format func
        return set_response(data={"message": "deleted {0} scan results".format(0)})
    else:
        raise InvalidUsage("Unsupported action: {0}".format(action))


@secret_api.route("/secret/scan_registry", methods=["POST"])
@jwt_required()
def secret_scan_results():
    post_data = request.json
    registry_images = post_data.get("registry_images", {})
    action = post_data.get("", constants.NODE_ACTION_SECRET_SCAN_START)
    cron_expr = post_data.get("action_args", {}).get("cron", "")
    if type(registry_images) != dict:
        raise InvalidUsage("registry_images is required for scanning registry_image")
    if not registry_images.get("registry_id") or type(registry_images["registry_id"]) != int:
        raise InvalidUsage("registry_id is required in registry_images key")
    if registry_images.get("image_name_with_tag_list") and type(
            registry_images["image_name_with_tag_list"]) != list:
        raise InvalidUsage("image_name_with_tag_list must be a list")
    for img in registry_images["image_name_with_tag_list"]:
        if not img:
            raise InvalidUsage("image_name_with_tag_list must not have empty values")
    try:
        registry_credential = RegistryCredential.query.get(
            registry_images["registry_id"])
    except Exception as ex:
        raise InternalError("Failed to get registry credential {}".format(registry_images["registry_id"]))
    datetime_now = datetime.now()
    scan_id_list = []
    image_list_details_str = redis.get("{0}:{1}".format(constants.REGISTRY_IMAGES_CACHE_KEY_PREFIX,
                                                        registry_images["registry_id"]))
    if action == constants.NODE_ACTION_SCHEDULE_SECRET_SCAN:
        try:
            node_action_details = {"action": action, "registry_images": registry_images,
                                   "action_args":  post_data.get("action_args", {})}
            check_existing = Scheduler.query.filter_by(action=action, nodes=node_action_details).all()
            if check_existing:
                raise InvalidUsage("A similar schedule already exists")
            scheduled_action = Scheduler(
                action=action, description=str(node_action_details["action_args"].get("description", "")),
                cron_expr=cron_expr, nodes=node_action_details, is_enabled=True, node_names=repr(node_action_details),
                status="")
            scheduled_action.save()
        except Exception as exc:
            return set_response(error="Could not save scheduled task: {}".format(exc), status=400)

    if registry_images.get("all_registry_images", False):
        image_dict = json.loads(image_list_details_str)
        image_df = pd.DataFrame(image_dict['image_list'])
        image_df['timestamp'] = pd.to_datetime(image_df.pushed_at)
        sorted_df = image_df.sort_values(by=['timestamp'], ascending=False)
        df_unique_list = sorted_df["image_tag"].unique()
        df_unique = pd.DataFrame(data=df_unique_list, columns=["image_tag"])
        sorted_df_by_image_tag = image_df.sort_values("image_tag")
        images_by_tags = df_unique.merge(sorted_df_by_image_tag, on=["image_tag"], how="outer")["image_name_with_tag"]
        registry_images["image_name_with_tag_list"] = images_by_tags
    elif registry_images.get("only_new_images", False):
        image_dict = json.loads(image_list_details_str)
        all_registry_images = set([image["image_name_with_tag"] for image in image_dict['image_list']])
        if cron_expr:
            pattern = '^0.*?\*/(\d).*?$'
            match = re.search(pattern, cron_expr)
            if match:
                days_interval = int(match.group(1))
            else:
                days_interval = 1
        images_need_to_be_scanned = all_registry_images - get_all_secret_scanned_images(days_interval)
        registry_images["image_name_with_tag_list"] = list(images_need_to_be_scanned)
    elif registry_images.get("registry_scan_type", None) == "latest_timestamp":
        image_dict = json.loads(image_list_details_str)
        image_df = pd.DataFrame(image_dict['image_list'])
        image_df['timestamp'] = pd.to_datetime(image_df.pushed_at)
        grouped = image_df.groupby(['image_name']).agg({"timestamp": max}).reset_index()
        latest_images_by_tags = image_df.merge(grouped, on=["image_name", "timestamp"], how="inner")[
            'image_name_with_tag']
        registry_images["image_name_with_tag_list"] = latest_images_by_tags
    elif registry_images.get("registry_scan_type", None) == "image_tags":
        if registry_images.get("image_tags", []):
            image_tags = registry_images.get("image_tags", [])
            image_dict = json.loads(image_list_details_str)
            image_df = pd.DataFrame(image_dict['image_list'])
            images_by_tags = image_df[image_df["image_tag"].isin(image_tags)]["image_name_with_tag"]
            registry_images["image_name_with_tag_list"] = images_by_tags
    for image_name_with_tag in registry_images.get("image_name_with_tag_list"):
        scan_id = image_name_with_tag + "_" + datetime_now.strftime("%Y-%m-%dT%H:%M:%S") + ".000"
        scan_id_list.append(scan_id)
        body = {
            "masked": "false", "type": constants.SECRET_SCAN_LOGS_INDEX, "scan_id": scan_id, "host": "",
            "@timestamp": datetime_now.strftime("%Y-%m-%dT%H:%M:%S.%fZ"), "scan_message": "",
            "scan_status": constants.CVE_SCAN_STATUS_QUEUED, "host_name": "", "node_id": image_name_with_tag,
            "time_stamp": int(time.time() * 1000.0), "node_type": constants.NODE_TYPE_CONTAINER_IMAGE,
            "node_name": image_name_with_tag
        }
        ESConn.create_doc(constants.SECRET_SCAN_LOGS_INDEX, body)

    scan_details = {
        "registry_type": registry_credential.registry_type, "scan_id_list": scan_id_list,
        "credential_id": registry_credential.id, "masked": "false", "host_name": "",
        "node_type": constants.NODE_TYPE_CONTAINER_IMAGE,
        "image_name_with_tag_list": registry_images["image_name_with_tag_list"]}
    response = requests.post(constants.SECRET_SCAN_API_URL, data=scan_details)
    status_code = response.status_code
    if status_code != 200:
        InternalError(response.text)
    return set_response("Ok")


@secret_api.route("/secret-scan/<path:node_id>", methods=["GET"])
@jwt_required()
def secret_scan_detail(node_id):
    """
    Get the latest secret-scan document from Elasticsearch for a given node_id
    ---
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
            SECRET_SCAN_LOGS_INDEX,
            {"node_id": urllib.parse.unquote(node_id)},
            0
        )
        latest_secret_scan = {}
        secret_scan_list = es_response.get("hits", [])
        if len(secret_scan_list) > 0:
            latest_secret_scan = secret_scan_list[0].get('_source', {})
            latest_secret_scan.update({'_id': secret_scan_list[0].get('_id', "")})

        return set_response(data=latest_secret_scan)


@secret_api.route("/secret/top_exposing_nodes", methods=["GET"])
@jwt_required()
def secret_exposing_nodes():
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
    active_hosts = []
    active_images = []
    nodes_data = redis.mget(
        websocketio_channel_name_format(constants.NODE_TYPE_HOST + "?format=deepfence")[1],
        websocketio_channel_name_format(constants.NODE_TYPE_CONTAINER + "?format=deepfence")[1])
    if nodes_data[0]:
        hosts_topology_data = json.loads(nodes_data[0])
        for node_id, node_details in hosts_topology_data.items():
            if node_details.get("host_name") and not node_details.get("is_ui_vm", False) and not node_details.get(
                    "pseudo", False):
                active_hosts.append(node_details["host_name"] + ";<host>")
    if nodes_data[1]:
        containers_topology_data = json.loads(nodes_data[1])
        for node_id, node_details in containers_topology_data.items():
            if node_details.get("image_name_with_tag") and not node_details.get("is_ui_vm", False) and \
                    not node_details.get("pseudo", False) and node_details.get("docker_container_state") == "running":
                if node_details["image_name_with_tag"] not in active_images:
                    active_images.append(node_details["image_name_with_tag"] + ";<container_image>")
                    active_images.append(node_details["scope_id"])
    # TODO: es max clause
    active_hosts = active_hosts[:ES_MAX_CLAUSE]
    active_images = active_images[:ES_MAX_CLAUSE]
    aggs = {
        "node_id": {
            "terms": {
                "field": "node_id.keyword",
                "size": 5
            },
            "aggs": {
                "scan_id": {
                    "terms": {
                        "field": "scan_id.keyword",
                        "size": 1,
                        "order": {"recent_scan_aggr": "desc"}
                    },
                    "aggs": {
                        "recent_scan_aggr": {
                            "max": {
                                "field": "@timestamp"
                            }
                        },
                        "severity": {
                            "terms": {
                                "field": "Severity.level.keyword",
                                "size": ES_TERMS_AGGR_SIZE
                            }
                        },
                        "container_name": {
                            "terms": {
                                "field": "container_name.keyword"
                            }
                        }
                        ,
                        "node_type": {
                            "terms": {
                                "field": "node_type.keyword"
                            }
                        }
                    }
                }
            }
        }
    }
    host_filters = {"node_type": constants.NODE_TYPE_HOST, "node_id": active_hosts}
    host_query = ESConn.aggregation_helper(constants.SECRET_SCAN_INDEX, host_filters, aggs, number,
                                           TIME_UNIT_MAPPING.get(time_unit), lucene_query_string, get_only_query=True)
    container_filters = {"node_type": [constants.NODE_TYPE_CONTAINER_IMAGE, constants.NODE_TYPE_CONTAINER], "node_id": active_images}
    container_query = ESConn.aggregation_helper(constants.SECRET_SCAN_INDEX, container_filters, aggs, number,
                                                TIME_UNIT_MAPPING.get(time_unit), lucene_query_string,
                                                get_only_query=True)
    search_queries = [
        {"index": constants.SECRET_SCAN_INDEX}, host_query,
        {"index": constants.SECRET_SCAN_INDEX}, container_query
    ]
    aggs_responses = ESConn.msearch(search_queries).get("responses", [])
    response = {constants.NODE_TYPE_HOST: [], constants.NODE_TYPE_CONTAINER_IMAGE: []}

    if "aggregations" in aggs_responses[0]:
        for host_aggs in aggs_responses[0]["aggregations"]["node_id"]["buckets"]:
            for scan_id_bkt in host_aggs["scan_id"]["buckets"]:
                for severity_bkt in scan_id_bkt["severity"]["buckets"]:
                    host_data = {"node": host_aggs["key"], "type": severity_bkt["key"],
                                 "value": severity_bkt["doc_count"]}
                    response[constants.NODE_TYPE_HOST].append(host_data)

    if "aggregations" in aggs_responses[1]:
        for image_aggs in aggs_responses[1]["aggregations"]["node_id"]["buckets"]:
            for scan_id_bkt in image_aggs["scan_id"]["buckets"]:
                for severity_bkt in scan_id_bkt["severity"]["buckets"]:
                    image_data = {"node": image_aggs["key"], "type": severity_bkt["key"],
                                  "value": severity_bkt["doc_count"]}
                    if scan_id_bkt["node_type"]["buckets"][0]["key"] == constants.NODE_TYPE_CONTAINER:
                        image_data["node"] = scan_id_bkt["container_name"]["buckets"][0]["key"]
                    response[constants.NODE_TYPE_CONTAINER_IMAGE].append(image_data)
    return set_response(data=response)


@secret_api.route("/secret/mask-doc", methods=["POST"])
@jwt_required()
def mask_secret_doc():
    doc_ids_to_be_masked = request.json.get("docs", [])
    if not doc_ids_to_be_masked:
        raise InvalidUsage("Missing docs value")
    docs_to_be_masked = []
    for doc_id in doc_ids_to_be_masked:
        docs_to_be_masked.append({"_id": doc_id, "_index": SECRET_SCAN_INDEX})
    ESConn.bulk_mask_docs(docs_to_be_masked)
    return set_response(status=200)


@secret_api.route("/secret/unmask-doc", methods=["POST"])
@jwt_required()
def unmask_secret_doc():
    doc_ids_to_be_masked = request.json.get("docs", [])
    if not doc_ids_to_be_masked:
        raise InvalidUsage("Missing docs value")
    docs_to_be_masked = []
    for doc_id in doc_ids_to_be_masked:
        docs_to_be_masked.append({"_id": doc_id, "_index": SECRET_SCAN_INDEX})
    ESConn.bulk_unmask_docs(docs_to_be_masked)
    return set_response(status=200)


@secret_api.route("/secret/report", methods=["GET"])
@jwt_required()
def secret_report():
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

    scan_ids = get_latest_secret_scan_id()

    filters = {}
    if request.is_json:
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        filters = request.json.get("filters", {})
    filters["scan_id"] = scan_ids[:ES_MAX_CLAUSE]
    aggs = {
        "severity": {
            "terms": {
                "field": "Severity.level.keyword",
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
                "rule_name": {
                    "terms": {
                        "field": "Rule.name.keyword",
                        "size": ES_TERMS_AGGR_SIZE
                    }
                }
            }
        }
    }
    aggs_response = ESConn.aggregation_helper(
        SECRET_SCAN_INDEX,
        filters,
        aggs,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string
    )

    data = {"name": "Secrets", "children": []}
    inner_children = []
    secrets_by_severity = aggs_response.get("aggregations", {}).get("severity", {}).get('buckets', [])
    for bucket in secrets_by_severity:
        by_severity = {"name": bucket.get('key'), "children": []}
        total_count = 0
        max_count = 0
        buckets_inserted = 0
        for inner_bucket in bucket.get("rule_name", {}).get('buckets', []):
            total_count += inner_bucket.get("doc_count")
            child = {"name": inner_bucket.get("key"), "value": inner_bucket.get("doc_count")}
            by_severity["children"].append(child)
            buckets_inserted += 1
            if buckets_inserted >= 6:
                break
        by_severity["value"] = total_count
        if max_count < total_count:
            max_count = total_count
        if not (max_count > 10 and total_count == 1):
            inner_children.append(by_severity)
    data["children"] = inner_children

    return set_response(data=data)


@secret_api.route("/secret/secret_severity_chart", methods=["GET", "POST"])
@jwt_required()
def secret_severity_chart():
    number = request.args.get("number")
    time_unit = request.args.get("time_unit")
    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)

    if number is None:
        raise InvalidUsage("Number parameter is required.")

    try:
        number = int(number)
    except ValueError:
        raise InvalidUsage("Number should be an integer value.")

    try:
        number = int(number)
    except ValueError:
        raise InvalidUsage("Number should be an integer value.")

    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")

    interval = calculate_interval(number, time_unit)
    if not interval:
        raise InvalidUsage("Unsupported number and time_unit combination")

    filters = {}
    if request.is_json:
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        filters = request.json.get("filters", {})

    params = GroupByParams(constants.SECRET_SCAN_INDEX)
    params.addrelativetimerange(number, time_unit)
    params.addlucenequery(lucene_query_string)
    params.add_agg_field('Severity.level.keyword', 'terms', order={"_count": "desc"})
    params.add_sub_agg_field('Rule.name.keyword', 'terms', order={"_count": "desc"})
    aggs_name = 'by_severity'
    sub_aggs_name = 'by_type'

    for key, value in filters.items():
        params.add_filter('term', "{0}.keyword".format(key), value)

    secret_aggs = ESConn.group_by(params, aggs_name, sub_aggs_name=sub_aggs_name)

    data = {"name": "Secrets", "children": []}
    inner_children = []
    secrets_by_severity = secret_aggs.get(aggs_name, {}).get('buckets', [])
    for bucket in secrets_by_severity:
        by_severity = {"name": bucket.get('key'), "children": []}
        total_count = 0
        for inner_bucket in bucket.get(sub_aggs_name, {}).get('buckets', []):
            total_count += inner_bucket.get("doc_count")
            child = {"name": inner_bucket.get("key"), "value": inner_bucket.get("doc_count")}
            by_severity["children"].append(child)
        by_severity["value"] = total_count
        inner_children.append(by_severity)
    data["children"] = inner_children

    return set_response(data=data)

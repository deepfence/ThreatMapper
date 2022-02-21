from datetime import datetime

from flask import Blueprint, request
from flask_jwt_extended import jwt_required
import urllib.parse

from models.container_image_registry import RegistryCredential
from utils import constants
from utils.response import set_response
from utils.custom_exception import InvalidUsage, InternalError
from utils.resource import filter_node_for_secret_scan
from utils.constants import TIME_UNIT_MAPPING, SECRET_SCAN_INDEX, SECRET_SCAN_LOGS_INDEX, \
    ES_TERMS_AGGR_SIZE
from utils.esconn import ESConn
from resource_models.node import Node
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
        filters = request.json.get("filters", {})
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
        SECRET_SCAN_INDEX,
        filters,
        aggs,
        number,
        TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string
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
    es_source = [
        "@timestamp", "host_name", "type", "node_name",
        "node_type", "status", "scan_id"]
    if not request.is_json:
        raise InvalidUsage("Missing JSON in request")
    req_json = request.json
    action = req_json.get("action", "get")
    filters = req_json.get("filters", {})
    if not filters:
        filters = {"type": SECRET_SCAN_INDEX}
    filters["masked"] = "false"
    if "node_id" in filters:
        scope_ids = []
        for node_id in filters["node_id"]:
            node = Node(node_id)
            scope_ids.append(node.scope_id)
        filters["node_id"] = scope_ids
    if action == "get":
        es_resp = ESConn.search_by_and_clause(
            SECRET_SCAN_INDEX, filters, req_json.get("start_index", 0),
            req_json.get("sort_order", "desc"), size=req_json.get("size", 10), _source=es_source)
        return set_response(data=es_resp["hits"])
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
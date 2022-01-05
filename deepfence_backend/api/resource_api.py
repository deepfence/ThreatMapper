from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.node_tags import NodeTags
from models.scheduler import Scheduler
from models.container_image_registry import RegistryCredential
from models.user import User, Role
from flask import current_app
from utils.response import set_response
from utils.decorators import non_read_only_user, admin_user_only
from utils.custom_exception import InternalError, InvalidUsage, DFError, Forbidden
from utils.helper import websocketio_channel_name_format, get_random_string, mkdir_recursive, rmdir_recursive
import json
from utils import resource
from resource_models.node import Node
from utils import constants
from croniter import croniter
from utils.esconn import ESConn
from utils.constants import ES_TERMS_AGGR_SIZE
import urllib.parse
import requests
from config.redisconfig import redis
import subprocess
import os
from copy import deepcopy
from flask import send_from_directory
import multiprocessing
from utils.node_utils import NodeUtils
import time
import eventlet

resource_api = Blueprint("resource_api", __name__)


@resource_api.route("/node/<path:node_id>/" + constants.NODE_ACTION_ADD_TAGS, methods=["POST"],
                    endpoint="api_v1_5_add_tags")
@jwt_required
@non_read_only_user
def add_tags(node_id):
    """
    Node Control API - Add User Defined Tags
    ---
    tags:
      - Node Control
    security:
      - Bearer: []
    operationId: addUserDefinedTags
    description: Add given tags to this node (Applicable node type - `host`, `container`, `container_image`)
    parameters:
      - in: path
        name: node_id
        description: Node ID (refer enumerate api)
        type: string
      - in: body
        name: Options
        description: Add tags to this node for easy identification
        schema:
          type: object
          properties:
            user_defined_tags:
              type: array
              example: [prod, dev]
              uniqueItems: true
              default: []
              description: Add tags to this node for easy identification
              items:
                type: string
                example: dev
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
    try:
        if not request.is_json:
            raise InvalidUsage("Missing JSON post data in request")
        node = Node.get_node(node_id, request.args.get("scope_id", None), request.args.get("node_type", None))
        if node.type == constants.NODE_TYPE_HOST or node.type == constants.NODE_TYPE_CONTAINER or \
                node.type == constants.NODE_TYPE_CONTAINER_IMAGE:
            post_data = request.json
            if not post_data:
                post_data = {}
            tags = post_data.get('user_defined_tags', [])
            if type(tags) != list:
                raise InvalidUsage("user_defined_tags must be of list type")
            tmp_tags = []
            for tag in tags:
                if tag:
                    tmp_tags.append(tag)
            tags = tmp_tags
            if not tags:
                raise InvalidUsage("user_defined_tags must be of list type")
            set_node_tags_in_db(node, tags, "add_tags")
            return set_response(data=node.set_tags(tags, "add_user_defined_tags"))
        else:
            raise InvalidUsage(
                "Control '{0}' not applicable for node type '{1}'".format(constants.NODE_ACTION_ADD_TAGS, node.type))
    except DFError as err:
        current_app.logger.error("NodeView: action={}; error={}".format(constants.NODE_ACTION_ADD_TAGS, err))
        raise InvalidUsage(err.message)
    except Exception as ex:
        raise InternalError(str(ex))


def set_node_tags_in_db(node, tags, action):
    node_name = ""
    present_tags = []
    node_tag = None
    node_tags_list = []
    image_parent_host_names = []

    if node.type == constants.NODE_TYPE_HOST:
        node_name = node.host_name
        node_tag = NodeTags.query.filter_by(host_name=node.host_name, node_name=node_name,
                                            node_type=node.type).one_or_none()
        if node_tag:
            present_tags = str(node_tag.tags).split(",")
    if node.type == constants.NODE_TYPE_CONTAINER:
        node_name = node.docker_container_id
        node_tag = NodeTags.query.filter_by(host_name=node.host_name, node_name=node_name,
                                            node_type=node.type).one_or_none()
        if node_tag:
            present_tags = str(node_tag.tags).split(",")
    elif node.type == constants.NODE_TYPE_CONTAINER_IMAGE:
        node_name = node.image_name_tag
        for parent in node.node_details_formatted.get("parents", []):
            if parent.get("type", "") == constants.NODE_TYPE_HOST and parent.get("label", ""):
                image_parent_host_names.append(parent["label"])
        node_tags_list = NodeTags.query.filter(NodeTags.host_name.in_(image_parent_host_names),
                                               NodeTags.node_name == node_name, NodeTags.node_type == node.type).all()
        if node_tags_list:
            present_tags = str(node_tags_list[0].tags).split(",")

    if action == "add_tags":
        present_tags.extend(tags)
        present_tags = list(set(present_tags))
    elif action == "delete_tags":
        for tag in tags:
            if tag in present_tags:
                present_tags.remove(tag)

    if present_tags:
        if node.type == constants.NODE_TYPE_HOST or node.type == constants.NODE_TYPE_CONTAINER:
            if not node_tag:
                node_tag = NodeTags(host_name=node.host_name, node_name=node_name, node_type=node.type)
            node_tag.tags = ",".join(present_tags)
            node_tag.save()
        elif node.type == constants.NODE_TYPE_CONTAINER_IMAGE:
            host_node_tag_map = {node_tag.host_name: node_tag for node_tag in node_tags_list}
            for parent_host_name in image_parent_host_names:
                if parent_host_name in host_node_tag_map:
                    node_tag = host_node_tag_map[parent_host_name]
                    node_tag.tags = ",".join(present_tags)
                    node_tag.save()
                else:
                    node_tag = NodeTags(host_name=parent_host_name, node_name=node_name, node_type=node.type)
                    node_tag.tags = ",".join(present_tags)
                    node_tag.save()

    else:
        if node_tag:
            node_tag.delete()
        if node_tags_list:
            for node_tag in node_tags_list:
                node_tag.delete()


@resource_api.route("/node/<path:node_id>/" + constants.NODE_ACTION_DELETE_TAGS, methods=["POST"],
                    endpoint="api_v1_5_delete_tags")
@jwt_required
@non_read_only_user
def delete_tags(node_id):
    """
    Node Control API - Delete User Defined Tags
    ---
    tags:
      - Node Control
    security:
      - Bearer: []
    operationId: deleteUserDefinedTags
    description: Delete given tags from this node (Applicable node type - `host`, `container`, `container_image`)
    parameters:
      - in: path
        name: node_id
        description: Node ID (refer enumerate api)
        type: string
      - in: body
        name: Options
        description: Delete given tags from this node
        schema:
          type: object
          properties:
            user_defined_tags:
              type: array
              example: [prod, dev]
              uniqueItems: true
              default: []
              description: Delete given tags from this node
              items:
                type: string
                example: dev
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
    try:
        if not request.is_json:
            raise InvalidUsage("Missing JSON post data in request")
        node = Node.get_node(node_id, request.args.get("scope_id", None), request.args.get("node_type", None))
        if node.type == constants.NODE_TYPE_HOST or node.type == constants.NODE_TYPE_CONTAINER or \
                node.type == constants.NODE_TYPE_CONTAINER_IMAGE:
            post_data = request.json
            if not post_data:
                post_data = {}
            tags = post_data.get('user_defined_tags', [])
            if type(tags) != list:
                raise InvalidUsage("user_defined_tags must be of list type")
            tmp_tags = []
            for tag in tags:
                if tag:
                    tmp_tags.append(tag)
            tags = tmp_tags
            if not tags:
                raise InvalidUsage("user_defined_tags must be of list type")
            set_node_tags_in_db(node, tags, "delete_tags")
            return set_response(data=node.set_tags(tags, "delete_user_defined_tags"))
        else:
            raise InvalidUsage(
                "Control '{0}' not applicable for node type '{1}'".format(constants.NODE_ACTION_DELETE_TAGS, node.type))
    except DFError as err:
        current_app.logger.error("NodeView: action={}; error={}".format(constants.NODE_ACTION_DELETE_TAGS, err))
        raise InvalidUsage(err.message)
    except Exception as ex:
        raise InternalError(str(ex))


@resource_api.route("/node/<path:node_id>/" + constants.NODE_ACTION_CVE_SCAN_START, methods=["POST"],
                    endpoint="api_v1_5_start_cve")
@jwt_required
@non_read_only_user
def start_cve(node_id):
    """
    Node  Control API - Start CVE
    ---
    tags:
      - Vulnerability Management
    security:
      - Bearer: []
    operationId: startCVE
    description: Start CVE on a node (Applicable node type - `host`, `container`, `container_image`)
    parameters:
      - in: path
        name: node_id
        description: Node ID (refer enumerate api)
        type: string
      - in: body
        name: Options
        description: Options to start cve
        schema:
          type: object
          properties:
            scan_type:
              type: array
              uniqueItems: true
              description: Base and language specific scan types
              example: ["base"]
              items:
                type: string
                enum: [base, java, python, ruby, php, nodejs, js, dotnet]
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
    try:
        post_data = {}
        if request.is_json:
            post_data = request.json
        node = Node.get_node(node_id, request.args.get("scope_id", None), request.args.get("node_type", None))
        if not node:
            raise InvalidUsage("Node not found")
        if node.type == constants.NODE_TYPE_HOST or node.type == constants.NODE_TYPE_CONTAINER or node.type == constants.NODE_TYPE_CONTAINER_IMAGE:
            scan_types = post_data.get("scan_type", None)
            if not scan_types or type(scan_types) != list:
                scan_types = constants.CVE_SCAN_TYPES
            else:
                scan_types = list(set(scan_types + ["base"]) & set(constants.CVE_SCAN_TYPES))

            scan_this_cluster = bool(post_data.get("scan_this_cluster", False))
            scan_this_namespace = bool(post_data.get("scan_this_namespace", False))
            mask_cve_ids = post_data.get("mask_cve_ids", [])

            if scan_this_cluster:
                if node.type not in [constants.NODE_TYPE_HOST, constants.NODE_TYPE_CONTAINER]:
                    raise InvalidUsage("scan_this_cluster option available for images")
                if not node.kubernetes_cluster_id:
                    raise InvalidUsage("scan_this_cluster option available only in kubernetes nodes")
            if scan_this_namespace:
                if node.type != constants.NODE_TYPE_CONTAINER:
                    raise InvalidUsage("scan_this_namespace option available for for containers only")
                if not node.kubernetes_cluster_id:
                    raise InvalidUsage("scan_this_cluster option available only in kubernetes nodes")
            # action/event/resources/success
            node_json = node.pretty_print()
            resources = [{
                "scan_types": scan_types,
                node_json["node_type"]: node_json,
            }]
            from tasks.user_activity import create_user_activity
            jwt_identity = get_jwt_identity()
            create_user_activity.delay(jwt_identity["id"], constants.ACTION_START, constants.EVENT_VULNERABILITY_SCAN,
                                       resources=resources, success=True)

            df_id_to_scope_id_map = {}
            topology_hosts_data = {}
            topology_containers_data = {}
            from config.redisconfig import redis

            if scan_this_cluster or scan_this_namespace:
                redis_pipe = redis.pipeline()
                redis_pipe.hgetall(constants.DF_ID_TO_SCOPE_ID_REDIS_KEY_PREFIX + node.type.upper())
                redis_pipe.get(websocketio_channel_name_format(constants.NODE_TYPE_HOST + "?format=deepfence")[1])
                redis_pipe.get(websocketio_channel_name_format(constants.NODE_TYPE_CONTAINER + "?format=deepfence")[1])
                redis_resp = redis_pipe.execute()
                df_id_to_scope_id_map = redis_resp[0]
                if redis_resp[1]:
                    topology_hosts_data = json.loads(redis_resp[1])
                if redis_resp[2]:
                    topology_containers_data = json.loads(redis_resp[2])

            if scan_this_cluster:
                node_list = []
                redis_lock_keys = []
                redis_pipe = redis.pipeline()
                # Scan all hosts in the cluster
                for host_node_id, host_details in topology_hosts_data.items():
                    if host_details.get("kubernetes_cluster_id") == node.kubernetes_cluster_id:
                        try:
                            host_node = Node(host_node_id, df_id_to_scope_id_map=df_id_to_scope_id_map,
                                             topology_data_df_format=topology_hosts_data)
                            lock_key = "{0}:{1}".format(constants.NODE_ACTION_CVE_SCAN_START, host_node.host_name)
                            redis_pipe.incr(lock_key)
                            node_list.append(host_node)
                            redis_lock_keys.append(lock_key)
                        except:
                            pass
                # Scan all container images in the cluster
                image_scan_started = []
                for container_node_id, container_details in topology_containers_data.items():
                    if container_details.get("kubernetes_cluster_id") == node.kubernetes_cluster_id \
                            and container_details.get("image_name_with_tag"):
                        if container_details["image_name_with_tag"] in image_scan_started:
                            continue
                        try:
                            container_node = Node(container_node_id, df_id_to_scope_id_map=df_id_to_scope_id_map,
                                                  topology_data_df_format=topology_containers_data)
                            lock_key = "{0}:{1}".format(constants.NODE_ACTION_CVE_SCAN_START,
                                                        container_node.image_name_tag)
                            redis_pipe.incr(lock_key)
                            node_list.append(container_node)
                            redis_lock_keys.append(lock_key)
                            image_scan_started.append(container_details["image_name_with_tag"])
                        except:
                            pass
                redis_resp = redis_pipe.execute()
                for i, tmp_node in enumerate(node_list):
                    if redis_resp[i] != 1:
                        continue
                    try:
                        tmp_node.cve_scan_start(scan_types)
                    except:
                        continue
                time.sleep(1)
                redis_pipe = redis.pipeline()
                for lock_key in redis_lock_keys:
                    redis.delete(lock_key)
                redis_pipe.execute()
                return set_response(data=True)
            elif scan_this_namespace:
                node_list = []
                redis_lock_keys = []
                redis_pipe = redis.pipeline()
                image_scan_started = []
                current_namespace = node.container_name.split("/")[0]
                for container_node_id, container_details in topology_containers_data.items():
                    if container_details.get("kubernetes_cluster_id") == node.kubernetes_cluster_id \
                            and container_details.get("image_name_with_tag") \
                            and container_details.get("container_name"):
                        if container_details["image_name_with_tag"] in image_scan_started:
                            continue
                        k8s_namespace = container_details["container_name"].split("/")[0]
                        if k8s_namespace != current_namespace:
                            continue
                        try:
                            container_node = Node(container_node_id, df_id_to_scope_id_map=df_id_to_scope_id_map,
                                                  topology_data_df_format=topology_containers_data)
                            lock_key = "{0}:{1}".format(constants.NODE_ACTION_CVE_SCAN_START,
                                                        container_node.image_name_tag)
                            redis_pipe.incr(lock_key)
                            node_list.append(container_node)
                            redis_lock_keys.append(lock_key)
                            image_scan_started.append(container_details["image_name_with_tag"])
                        except:
                            pass
                redis_resp = redis_pipe.execute()
                for i, tmp_node in enumerate(node_list):
                    if redis_resp[i] != 1:
                        continue
                    try:
                        tmp_node.cve_scan_start(scan_types)
                    except:
                        continue
                time.sleep(1)
                redis_pipe = redis.pipeline()
                for lock_key in redis_lock_keys:
                    redis.delete(lock_key)
                redis_pipe.execute()
                return set_response(data=True)
            else:
                lock_key = ""
                if node.type == constants.NODE_TYPE_HOST:
                    lock_key = "{0}:{1}".format(constants.NODE_ACTION_CVE_SCAN_START, node.host_name)
                else:
                    lock_key = "{0}:{1}".format(constants.NODE_ACTION_CVE_SCAN_START, node.image_name_tag)
                redis_resp = redis.incr(lock_key)
                if redis_resp != 1:
                    raise DFError("CVE scan on this node is already in progress")
                resp = False
                try:
                    resp = node.cve_scan_start(scan_types, ",".join(mask_cve_ids))
                except Exception as ex:
                    redis.delete(lock_key)
                    raise ex
                time.sleep(1)
                redis.delete(lock_key)
                return set_response(data=resp)
        else:
            raise InvalidUsage(
                "Control '{0}' not applicable for node type '{1}'".format(constants.NODE_ACTION_CVE_SCAN_START,
                                                                          node.type))
    except DFError as err:
        current_app.logger.error("NodeView: action={}; error={}".format(constants.NODE_ACTION_CVE_SCAN_START, err))
        raise InvalidUsage(err.message)
    except Exception as ex:
        # import traceback
        # track = traceback.format_exc()
        # print(track)
        raise InternalError(str(ex))


@resource_api.route("/get_logs", methods=["POST"], endpoint="api_v1_5_get_logs_from_agents")
@jwt_required
@admin_user_only
def get_logs_from_agents():
    """
    API to get the agent logs
    """
    payloads = request.json
    node_id_list = payloads.get('node_id_list', None)
    if not node_id_list:
        raise InvalidUsage("node_id_list must not be empty")
    if type(node_id_list) != list:
        raise InvalidUsage("node_id_list must be list of node ids")
    node_type = payloads.get('node_type', None)
    if node_type != "host":
        raise InvalidUsage("node_type must be host")

    topology_data_df_format = {}
    try:
        redis_pipe = redis.pipeline()
        redis_pipe.hgetall(constants.DF_ID_TO_SCOPE_ID_REDIS_KEY_PREFIX + node_type.upper())
        redis_pipe.get(websocketio_channel_name_format(node_type + "?format=deepfence")[1])
        redis_resp = redis_pipe.execute()
        df_id_to_scope_id_map = redis_resp[0]
        if redis_resp[1]:
            topology_data_df_format = json.loads(redis_resp[1])
        if not topology_data_df_format:
            raise DFError("No agents data available")
    except Exception as e:
        raise InvalidUsage(e)

    random_string = get_random_string(10)
    download_path = os.path.join("/tmp/deepfence-logs-download", random_string)
    mkdir_recursive(download_path)
    zip_path = os.path.join("/tmp/deepfence-logs", random_string)
    mkdir_recursive(zip_path)

    def get_logs_from_agents_task(node_id):
        try:
            eventlet.monkey_patch()
            node = Node(node_id, df_id_to_scope_id_map=df_id_to_scope_id_map,
                        topology_data_df_format=topology_data_df_format)
            applicable_scans_api_url = constants.SCOPE_HOST_API_CONTROL_URL.format(
                probe_id=node.probe_id, host_name=node.host_name, action="get_logs_from_agent")
            with eventlet.Timeout(10):
                resp = requests.post(applicable_scans_api_url, data='{}', verify=False)
            response_data = resp.json()
            if resp.status_code != 200:
                raise InvalidUsage("Error: could not get logs from agent")
            for single_file_info in response_data["agent_logs"]:
                host_download_path = os.path.join(download_path, node.host_name)
                mkdir_recursive(host_download_path)
                f = open(os.path.join(host_download_path, single_file_info["file_name"]), "w+")
                f.write(single_file_info["data"])
                f.close()
        except:
            pass

    processes = []
    num_of_thread = 20

    def chunks(l, n):
        for i in range(0, len(l), n):
            yield l[i:i + n]

    for node_id in node_id_list:
        p = multiprocessing.Process(target=get_logs_from_agents_task, args=(node_id,))
        processes.append(p)

    try:
        for i in chunks(processes, num_of_thread):
            for j in i:
                j.start()
            for j in i:
                j.join()
    except Exception as e:
        raise InvalidUsage(e)

    if not os.listdir(download_path):
        raise InvalidUsage("logs has not been generated")
    subprocess.run("tar -C {0} -zcvf {1}/deepfence-agent-logs.tar.gz .".format(download_path, zip_path), shell=True)
    rmdir_recursive(download_path)
    # from tasks.reaper_tasks import delete_old_agent_logs
    # delete_old_agent_logs.delay(zip_path)
    return send_from_directory(zip_path, filename="deepfence-agent-logs.tar.gz", as_attachment=True), 200


@resource_api.route("/node/<path:node_id>/" + constants.NODE_ACTION_CVE_SCAN_STOP, methods=["POST"],
                    endpoint="api_v1_5_stop_cve")
@jwt_required
@non_read_only_user
def stop_cve(node_id):
    """
    Node Control API - Stop CVE
    ---
    tags:
      - Vulnerability Management
    security:
      - Bearer: []
    operationId: stopCVE
    description: Stop CVE on a node (Applicable node type - `host`, `container`, `container_image`)
    parameters:
      - in: path
        name: node_id
        description: Node ID (refer enumerate api)
        type: string
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
    try:
        node = Node.get_node(node_id, request.args.get("scope_id", None), request.args.get("node_type", None))
        if not node:
            raise InvalidUsage("Node not found")
        if node.type == constants.NODE_TYPE_HOST or node.type == constants.NODE_TYPE_CONTAINER or node.type == constants.NODE_TYPE_CONTAINER_IMAGE:
            # action/event/resources/success
            node_json = node.pretty_print()
            resources = [{
                node_json["node_type"]: node_json,
            }]
            from tasks.user_activity import create_user_activity
            jwt_identity = get_jwt_identity()
            create_user_activity.delay(jwt_identity["id"], constants.ACTION_STOP, constants.EVENT_VULNERABILITY_SCAN,
                                       resources=resources, success=True)
            return set_response(data=node.cve_scan_stop())
        else:
            raise InvalidUsage(
                "Control '{0}' not applicable for node type '{1}'".format(constants.NODE_ACTION_CVE_SCAN_STOP,
                                                                          node.type))
    except DFError as err:
        current_app.logger.error("NodeView: action={}; error={}".format(constants.NODE_ACTION_CVE_SCAN_STOP, err))
        raise InvalidUsage(err.message)
    except Exception as ex:
        raise InternalError(str(ex))


@resource_api.route("/node/<path:node_id>/" + constants.NODE_ACTION_CVE_SCAN_STATUS, methods=["GET"],
                    endpoint="api_v1_5_cve_status")
@jwt_required
def cve_status(node_id):
    """
    Node Control API - CVE Status
    ---
    tags:
      - Vulnerability Management
    security:
      - Bearer: []
    operationId: cveStatus
    description: CVE Status for a node (Applicable node type - `host`, `container`, `container_image`)
    parameters:
    - in: path
      name: node_id
      description: Node ID (refer enumerate api)
      type: string
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
    try:
        node = Node.get_node(node_id, request.args.get("scope_id", None), request.args.get("node_type", None))
        if not node:
            raise InvalidUsage("Node not found")
        if node.type == constants.NODE_TYPE_HOST or node.type == constants.NODE_TYPE_CONTAINER or node.type == constants.NODE_TYPE_CONTAINER_IMAGE:
            return set_response(data=node.get_cve_status())
        else:
            raise InvalidUsage(
                "Control '{0}' not applicable for node type '{1}'".format(constants.NODE_ACTION_CVE_SCAN_STATUS,
                                                                          node.type))
    except DFError as err:
        current_app.logger.error("NodeView: action={}; error={}".format(constants.NODE_ACTION_CVE_SCAN_STATUS, err))
        raise InvalidUsage(err.message)
    except Exception as ex:
        raise InternalError(str(ex))


@resource_api.route("/node/<path:node_id>/" + constants.NODE_ATTACK_PATH, methods=["GET"],
                    endpoint="api_v1_5_attack_path")
@jwt_required
def get_attack_path(node_id):
    try:
        node = Node.get_node(node_id, request.args.get("scope_id", None), request.args.get("node_type", None))
        if not node:
            raise InvalidUsage("Node not found")
        if node.type == constants.NODE_TYPE_HOST or node.type == constants.NODE_TYPE_CONTAINER or \
                node.type == constants.NODE_TYPE_CONTAINER_IMAGE:
            return set_response(data=node.get_attack_path())
        else:
            raise InvalidUsage(
                "Control '{0}' not applicable for node type '{1}'".format(constants.NODE_ATTACK_PATH, node.type))
    except DFError as err:
        current_app.logger.error("NodeView: action={}; error={}".format(constants.NODE_ATTACK_PATH, err))
        raise InvalidUsage(err.message)
    except Exception as ex:
        raise InternalError(str(ex))


@resource_api.route("/node/<node_id>", methods=["GET"], endpoint="api_v1_5_node_details")
@jwt_required
def get_node_detail(node_id):
    """
    Node Details API
    ---
    tags:
      - Node Control
    security:
      - Bearer: []
    operationId: nodeDetails
    description: Get full details of a node (hosts, containers, images, processes) by node_id
    parameters:
    - in: path
      name: node_id
      description: Node ID (refer enumerate api)
      type: string
    responses:
      200:
        description: Request success
        properties:
          data:
            type: object
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
    try:
        node = Node(node_id)
        return set_response(node.node_details_formatted)
    except Exception as ex:
        raise InternalError(str(ex))


@resource_api.route("/enumerate_filters", methods=["GET"], endpoint="api_v1_5_enumerate_filters")
@jwt_required
def enumerate_node_filters():
    """
    Enumerate Filters API
    ---
    tags:
      - Enumerate
    security:
      - Bearer: []
    operationId: enumerateFilters
    description: Get filter options for enumerate nodes api
    parameters:
      - name: node_type
        in: query
        type: string
        required: true
        description: Node type
        enum: [host, container, container_image, container_by_name, process, process_by_name, pod, kube_controller, kube_service, swarm_service]
      - name: resource_type
        in: query
        type: string
        required: true
        description: Resource type
        enum: [cve]
    responses:
      200:
        description: Request success
        properties:
          data:
            type: object
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
    # number, time_unit, lucene_query_string => used in vulnerability filters, not topology
    number = request.args.get("number")
    time_unit = request.args.get("time_unit")
    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")
    if number:
        try:
            number = int(number)
        except ValueError:
            raise InvalidUsage("Number should be an integer value.")
    if time_unit and time_unit not in constants.TIME_UNIT_MAPPING.keys():
        raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")
    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)
    node_types_str = str(request.args.get("node_type", ''))
    node_types = []
    if node_types_str:
        node_types = node_types_str.split(",")
    filters_needed = request.args.get("filters", None)
    resource_types_str = str(request.args.get('resource_type', ''))
    resource_types = []
    if resource_types_str:
        resource_types = resource_types_str.split(",")
    resource_filters = []
    for resource_type in resource_types:
        if resource_type not in [constants.CVE_INDEX]:
            print('Invalid resource_type {}. Skipping'.format(resource_type))
            continue
        if resource_type == constants.CVE_INDEX:
            # Get `container` info from `cve` and `host` / `container_image` data from `cve-scan`
            cve_aggs = {"cve_container_name": {
                "terms": {"field": "cve_container_name.keyword", "size": constants.ES_TERMS_AGGR_SIZE}}}
            cve_filters = {"type": constants.CVE_INDEX}
            cve_aggs_query = ESConn.aggregation_helper(
                constants.CVE_INDEX, cve_filters, cve_aggs, number,
                constants.TIME_UNIT_MAPPING.get(time_unit), lucene_query_string, get_only_query=True)
            cve_scan_aggs = {
                "node_type": {
                    "terms": {"field": "node_type.keyword", "size": 10},
                    "aggs": {"node_id": {"terms": {"field": "node_id.keyword", "size": ES_TERMS_AGGR_SIZE}},
                             "node_status": {"terms": {"field": "action.keyword", "size": ES_TERMS_AGGR_SIZE}}}
                }
            }
            cve_scan_aggs_query = ESConn.aggregation_helper(
                constants.CVE_SCAN_LOGS_INDEX, {"action": ["COMPLETED", "ERROR"]}, cve_scan_aggs, number,
                constants.TIME_UNIT_MAPPING.get(time_unit), lucene_query_string, add_masked_filter=False,
                get_only_query=True)
            search_queries = [
                {"index": constants.CVE_INDEX}, cve_aggs_query,
                {"index": constants.CVE_SCAN_LOGS_INDEX}, cve_scan_aggs_query
            ]
            aggs_responses = ESConn.msearch(search_queries).get("responses", [])
            filters_actions = []
            filters_host_name = []
            filters_container_name = []
            filters_image_name = []
            for container_bkt in aggs_responses[0].get("aggregations", {}).get(
                    "cve_container_name", {}).get("buckets", []):
                if container_bkt["key"] and container_bkt["key"] not in filters_container_name:
                    filters_container_name.append(container_bkt["key"])
            for node_type_bkt in aggs_responses[1].get("aggregations", {}).get("node_type", {}).get("buckets", []):
                for node_id_bkt in node_type_bkt.get("node_id", {}).get("buckets", []):
                    if node_type_bkt["key"] == constants.NODE_TYPE_HOST:
                        if node_id_bkt["key"] and node_id_bkt["key"] not in filters_host_name:
                            filters_host_name.append(node_id_bkt["key"])
                    elif node_type_bkt["key"] == constants.NODE_TYPE_CONTAINER_IMAGE:
                        if node_id_bkt["key"] and node_id_bkt["key"] not in filters_image_name:
                            filters_image_name.append(node_id_bkt["key"])
                for scan_action_bkt in node_type_bkt.get("node_status", {}).get("buckets", []):
                    if scan_action_bkt["key"] and scan_action_bkt["key"] not in filters_actions:
                        filters_actions.append(scan_action_bkt["key"])
            if filters_host_name:
                details = {"label": "Hostname", "name": "host_name", "options": filters_host_name, "type": "string"}
                if node_types:
                    if constants.NODE_TYPE_HOST in node_types:
                        resource_filters.append(details)
                else:
                    resource_filters.append(details)
            if filters_image_name:
                details = {"label": "Image Name", "name": "image_name_with_tag", "options": filters_image_name,
                           "type": "string"}
                if node_types:
                    if constants.NODE_TYPE_CONTAINER_IMAGE in node_types:
                        resource_filters.append(details)
                else:
                    resource_filters.append(details)
            if filters_container_name:
                details = {"label": "Container Name", "name": "container_name", "options": filters_container_name,
                           "type": "string"}
                if node_types:
                    if constants.NODE_TYPE_CONTAINER in node_types:
                        resource_filters.append(details)
                else:
                    resource_filters.append(details)
            if filters_actions:
                details = {"label": "Status", "name": "action", "options": filters_actions, "type": "string"}
                resource_filters.append(details)
            node_types = [constants.NODE_TYPE_HOST]
            filters_needed = "kubernetes_cluster_name"
    if filters_needed:
        filters_needed = str(filters_needed).split(",")
    if not node_types:
        raise InvalidUsage("node_type is required")
    filter_keys = []
    for node_type in node_types:
        if node_type not in constants.NODE_TYPES_ALL:
            raise InvalidUsage("node_type '{0}' is invalid".format(node_type))
        if node_type == constants.NODE_TYPE_REGISTRY_IMAGE:
            registry_id = request.args.get("registry_id")
            if not registry_id:
                raise InvalidUsage("registry_id is required")
            filter_keys.append("{0}{1}:{2}".format(constants.TOPOLOGY_FILTERS_PREFIX, node_type.upper(), registry_id))
        else:
            filter_keys.append(constants.TOPOLOGY_FILTERS_PREFIX + node_type.upper())
    from config.redisconfig import redis
    topology_filters = redis.mget(filter_keys)
    response = {"filters": []}
    added_filters = {}
    added_count = 0
    for topology_filter in topology_filters:
        if not topology_filter:
            continue
        filter_items = json.loads(topology_filter)
        for item in filter_items:
            to_add = False
            if filters_needed:
                if item["name"] in filters_needed:
                    to_add = True
            else:
                to_add = True
            if to_add:
                if item["name"] in added_filters:
                    found_index = added_filters[item["name"]]
                    tmp_options = list(set(item["options"] + response["filters"][found_index]["options"]))
                    response["filters"][found_index]["options"] = tmp_options
                else:
                    response["filters"].append(item)
                    added_filters[item["name"]] = added_count
                    added_count += 1
    merged_filters = []
    # if node_types are passed remove filters generated by resource_type which are not applicable to node_types
    if resource_filters and response.get('filters'):
        merged_filters = resource_filters + response.get('filters')
        # merged_filters = list(filter(lambda x: x.get('name') in [y.get('name') for y in response.get('filters')],
        #     resource_filters))
    elif node_types and response.get('filters'):
        merged_filters = response.get('filters')
    else:
        merged_filters = resource_filters
    filter_index = {}
    for resource_filter in merged_filters:
        if resource_filter.get('name') in filter_index:
            existing_resource_filter = filter_index[resource_filter.get('name')]
            existing_options = set(existing_resource_filter.get('options'))
            current_options = set(resource_filter.get('options'))
            new_options = current_options - existing_options
            updated_options = existing_resource_filter.get('options') + list(new_options)
            existing_resource_filter['options'] = updated_options
        else:
            filter_index[resource_filter.get('name')] = resource_filter
    all_filters = [value for value in filter_index.values()]
    all_filters.sort(key=lambda x: x.get('name'))
    return set_response(data={'filters': all_filters})


@resource_api.route("/scheduled_tasks", methods=["GET"], endpoint="api_v1_5_scheduled_tasks_list")
@jwt_required
def list_scheduled_tasks():
    """
    Scheduled Tasks API
    ---
    tags:
      - Scheduled Tasks
    security:
      - Bearer: []
    operationId: getScheduledTasks
    description: Get list of all scheduled tasks
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
    scheduled_tasks = Scheduler.query.order_by(Scheduler.created_at.asc()).all()
    if not scheduled_tasks:
        scheduled_tasks = []
    response = {"scheduled_tasks": [{
        "id": task.id, "created_at": str(task.created_at), "action": task.action, "description": task.description,
        "cron": task.cron_expr, "status": task.status, "last_ran_at": str(task.last_ran_at),
        "node_names": task.node_names, "is_enabled": task.is_enabled, "node_type": task.nodes.get("node_type", "")
    } for task in scheduled_tasks]}
    return set_response(data=response)


@resource_api.route("/scheduled_tasks/update", methods=["POST"], endpoint="api_v1_5_scheduled_tasks_update")
@jwt_required
@non_read_only_user
def update_scheduled_tasks():
    """
    Scheduled Tasks API
    ---
    tags:
      - Scheduled Tasks
    security:
      - Bearer: []
    operationId: updateScheduledTasks
    description: Enable, disable or delete scheduled tasks
    parameters:
    - in: body
      name: Options
      description: Options to enable, disable or delete scheduled tasks
      schema:
        type: object
        properties:
          action:
            type: string
            enum: [enable, disable, delete]
            description: Action to perform - `enable`, `disable` or `delete`
          scheduled_task_id_list:
            type: array
            uniqueItems: true
            required: true
            description: List of scheduled task ids
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
    if action not in ["enable", "disable", "delete"]:
        raise InvalidUsage("action must be enable, disable or delete")
    scheduled_task_id_list = request.json.get("scheduled_task_id_list")
    if not scheduled_task_id_list:
        raise InvalidUsage("scheduled_task_id_list is required")
    if type(scheduled_task_id_list) != list:
        raise InvalidUsage("scheduled_task_id_list must be list")
    if action == "delete":
        Scheduler.bulk_delete_schedules(Scheduler.query.filter(Scheduler.id.in_(scheduled_task_id_list)))
    else:
        is_enabled = True
        if action == "disable":
            is_enabled = False
        Scheduler.bulk_update_schedules(Scheduler.query.filter(Scheduler.id.in_(scheduled_task_id_list)), is_enabled)
    return set_response(status=201)


@resource_api.route("/node_action", methods=["POST"], endpoint="api_v1_5_node_action")
@jwt_required
def node_action():
    """
    Node Action API
    ---
    tags:
      - Node Action
    security:
      - Bearer: []
    operationId: nodeAction
    description: Start or schedule scan, get reports, etc for a set of nodes
    parameters:
    - in: body
      name: Options
      description: Options to enumerate nodes
      schema:
        type: object
        properties:
          node_type:
            type: string
            required: true
            description: Node type
            enum: [host, container, container_image, registry_image, container_by_name, process, process_by_name, pod, kube_controller, kube_service, swarm_service]
          action:
            type: string
            required: true
            description: Node type
            enum: [cve_scan_start, cve_scan_status, schedule_vulnerability_scan, download_report, send_report]
    responses:
      200:
        description: Request success
        properties:
          data:
            type: object
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
    if not request.is_json:
        raise InvalidUsage("Missing JSON post data in request")
    post_data = request.json
    if not post_data:
        raise InvalidUsage("Missing JSON post data in request")
    node_type = post_data.get("node_type", None)
    if node_type not in constants.NODE_BULK_ACTIONS:
        raise InvalidUsage("node_type {0} not supported".format(node_type))
    action = post_data.get("action", None)
    if action not in constants.NODE_BULK_ACTIONS[node_type]:
        raise InvalidUsage("action {0} not supported for node_type {1}".format(action, node_type))

    current_user = get_jwt_identity()
    user = User.query.filter_by(id=current_user["id"]).one_or_none()
    if action != constants.NODE_ACTION_DOWNLOAD_REPORT:
        if user.role.name not in [constants.USER_ROLES.ADMIN_USER, constants.USER_ROLES.NORMAL_USER]:
            raise Forbidden("User not permitted to perform this action")

    node_ids = post_data.get("node_id_list", [])
    if type(node_ids) != list:
        node_ids = []
    registry_images = post_data.get("registry_images", {})
    if type(registry_images) != dict:
        registry_images = {}
    from config.redisconfig import redis

    df_id_to_scope_id_map = {}
    topology_data_df_format = {}
    include_dead_nodes = bool(post_data.get("include_dead_nodes", False))
    node_action_details = {"node_type": node_type, "include_dead_nodes": include_dead_nodes,
                           "file_type": post_data.get("file_type", "xlsx")}

    action_args = post_data.get("action_args", {})
    if action_args and type(action_args) != dict:
        raise InvalidUsage("action_args should be in json format")
    if not action_args:
        action_args = {}
    accepted_action_args = ["cron", "description", "scan_type", "filters", "resources",
                            "report_email", "duration", "registry_credentials", "delete_resources"]
    action_args = {k: v for k, v in action_args.items() if k in accepted_action_args}
    filters = action_args.get("filters", {})
    if type(filters) != dict:
        raise InvalidUsage("action_args.filters must be a json")
    if filters:
        node_action_details["filters"] = filters
    # "filters", "resources", "report_email" - for download report / send report
    # resources - [{"type":"cve","filter":{"cve_severity":["critical"]}}]
    report_resources = action_args.get("resources", [])
    if type(report_resources) != list:
        raise InvalidUsage("action_args.resources must be list")
    if report_resources:
        node_action_details["resources"] = report_resources
    report_email = action_args.get("report_email", "")
    if report_email:
        node_action_details["report_email"] = str(report_email)
    report_duration = action_args.get('duration', {})
    if report_duration and type(report_duration) != dict:
        raise InvalidUsage("action_args.duration must be json")
    if report_duration:
        duration_number = report_duration.get('number')
        duration_time_unit = report_duration.get('time_unit')
        if duration_number:
            try:
                duration_number = int(duration_number)
            except ValueError:
                raise InvalidUsage("Number should be an integer value.")
        if duration_time_unit and duration_time_unit not in constants.TIME_UNIT_MAPPING.keys():
            raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")
        node_action_details["duration"] = {"number": duration_number,
                                           "time_unit": constants.TIME_UNIT_MAPPING.get(duration_time_unit)}

    if node_type == constants.NODE_TYPE_REGISTRY_IMAGE:
        if not registry_images:
            raise InvalidUsage("registry_images is required for node_type registry_image")
        if not registry_images.get("registry_id") or type(registry_images["registry_id"]) != int:
            raise InvalidUsage("registry_id is required in registry_images key")
        if not filters and not registry_images.get("image_name_with_tag_list"):
            raise InvalidUsage("image_name_with_tag_list is required in registry_images key")
        if registry_images.get("image_name_with_tag_list") and type(
                registry_images["image_name_with_tag_list"]) != list:
            raise InvalidUsage("image_name_with_tag_list must be a list")
        for img in registry_images["image_name_with_tag_list"]:
            if not img:
                raise InvalidUsage("image_name_with_tag_list must not have empty values")
        try:
            RegistryCredential.query.get(registry_images["registry_id"])
        except:
            raise InternalError("Failed to get registry credential {}".format(registry_images["registry_id"]))
        node_action_details["registry_images"] = registry_images
    else:
        if not filters and not node_ids:
            raise InvalidUsage("node_id_list is required for node_type {0}".format(node_type))
        redis_pipe = redis.pipeline()
        redis_pipe.hgetall(constants.DF_ID_TO_SCOPE_ID_REDIS_KEY_PREFIX + node_type.upper())
        redis_pipe.get(websocketio_channel_name_format(node_type + "?format=deepfence")[1])
        redis_resp = redis_pipe.execute()
        df_id_to_scope_id_map = redis_resp[0]
        if redis_resp[1]:
            topology_data_df_format = json.loads(redis_resp[1])

        # Temporarily accept scope_id
        node_utils = NodeUtils()
        node_ids = [node_utils.get_df_id_from_scope_id(scope_id, node_type) for scope_id in node_ids]
        node_action_details["node_id_list"] = node_ids

    if action in [constants.NODE_ACTION_CVE_SCAN_START, constants.NODE_ACTION_SCHEDULE_CVE_SCAN]:
        if node_type not in [constants.NODE_TYPE_HOST, constants.NODE_TYPE_CONTAINER,
                             constants.NODE_TYPE_CONTAINER_IMAGE, constants.NODE_TYPE_REGISTRY_IMAGE]:
            raise InvalidUsage("action {0} not applicable for node_type {1}".format(action, node_type))
        scan_types = action_args.get("scan_type", None)
        if not scan_types or type(scan_types) != list:
            raise InvalidUsage("scan_type is required and it should be list")
        if "base" not in scan_types:
            scan_types.append("base")
        invalid_scan_types = set(scan_types) - set(constants.CVE_SCAN_TYPES)
        if invalid_scan_types:
            raise InvalidUsage("scan_type has invalid values: {0}".format(", ".join(invalid_scan_types)))
        node_action_details["scan_type"] = scan_types
    elif action == constants.NODE_ACTION_CVE_SCAN_STOP:
        if node_type not in [constants.NODE_TYPE_HOST, constants.NODE_TYPE_CONTAINER,
                             constants.NODE_TYPE_CONTAINER_IMAGE, constants.NODE_TYPE_REGISTRY_IMAGE]:
            raise InvalidUsage("action {0} not applicable for node_type {1}".format(action, node_type))
    elif action in [constants.NODE_ACTION_DOWNLOAD_REPORT, constants.NODE_ACTION_SCHEDULE_SEND_REPORT]:
        if not filters:
            raise InvalidUsage("filters is required for this action")
        if not report_resources:
            raise InvalidUsage("resources is required for this action")
        if action == constants.NODE_ACTION_SCHEDULE_SEND_REPORT and not report_email:
            raise InvalidUsage("report_email is required for schedule_send_report action")

    node_action_details_user_activity = deepcopy(node_action_details)
    if node_type == constants.NODE_TYPE_REGISTRY_IMAGE:
        # TODO: get the image names
        pass
    else:
        node_names = []
        for node_id in node_ids:
            try:
                node = Node(node_id, df_id_to_scope_id_map=df_id_to_scope_id_map,
                            topology_data_df_format=topology_data_df_format)
                if node.name:
                    node_names.append(node.name)
            except:
                pass
        node_action_details_user_activity["node_id_list"] = node_names

    from tasks.user_activity import create_user_activity
    create_user_activity.delay(current_user["id"], constants.ACTION_BULK, action,
                               resources=[node_action_details_user_activity], success=True)
    if action in [constants.NODE_ACTION_CVE_SCAN_START]:
        from config.app import celery_app
        celery_app.send_task(
            'tasks.common_worker.common_worker', args=(), queue=constants.CELERY_NODE_ACTION_QUEUE,
            kwargs={"action": action, "node_action_details": node_action_details, "task_type": "node_task"})
    elif action in [constants.NODE_ACTION_DOWNLOAD_REPORT]:
        from tasks.task_scheduler import run_node_task
        return run_node_task(action, node_action_details)
    elif action in [constants.NODE_ACTION_SCHEDULE_CVE_SCAN, constants.NODE_ACTION_SCHEDULE_SEND_REPORT]:
        if not action_args.get("cron"):
            raise InvalidUsage("cron is required in action_args key")
        if not croniter.is_valid(action_args["cron"]):
            raise InvalidUsage("cron is invalid")
        node_names = ""
        if node_type == constants.NODE_TYPE_REGISTRY_IMAGE:
            node_names = ", ".join(registry_images["image_name_with_tag_list"][:3])
            if len(registry_images["image_name_with_tag_list"]) > 3:
                node_names += " and more"
        else:
            tmp_node_names = []
            for node_id in node_ids[:3]:
                try:
                    node = Node(node_id, df_id_to_scope_id_map=df_id_to_scope_id_map,
                                topology_data_df_format=topology_data_df_format)
                    tmp_node_names.append(node.name)
                except:
                    pass
            node_names = ", ".join(tmp_node_names)
            if len(node_ids) > 3:
                node_names += " and more"
        try:
            check_existing = Scheduler.query.filter_by(action=action, nodes=node_action_details).all()
            if check_existing:
                raise InvalidUsage("A similar schedule already exists")
            scheduled_action = Scheduler(
                action=action, description=str(action_args.get("description", "")), cron_expr=action_args["cron"],
                nodes=node_action_details, is_enabled=True, node_names=node_names, status="")
            scheduled_action.save()
        except Exception as exc:
            return set_response(error="Could not save scheduled task: {}".format(exc), status=400)
        return set_response("Ok")
    return set_response("Ok")


@resource_api.route("/enumerate", methods=["POST"], endpoint="api_v1_5_enumerate")
@jwt_required
def enumerate_node():
    """
    Enumerate API
    ---
    tags:
      - Enumerate
    security:
      - Bearer: []
    operationId: enumerateNodes
    description: Enumerate nodes (hosts, containers, images, processes) with optional filters
    parameters:
    - in: body
      name: Options
      description: Options to enumerate nodes
      schema:
        type: object
        properties:
          size:
            type: integer
            default: 10
            minimum: 1
            maximum: 100000
            example: 10
            description: The numbers of vulnerabilities to return
          sort_by:
            type: string
            example: name
            description: Field to sort by
          sort_order:
            type: string
            example: asc
            enum: [asc, desc]
            description: Sort order
          fields:
            type: array
            example: ["name"]
            description: Respond only selected fields
          start_index:
            type: integer
            minimum: 0
            maximum: 99999
            example: 0
            default: 0
            description: The number of items to skip before starting to collect the result set
          filters:
            description: Filter vulnerabilities by various fields (key value pairs)
            type: object
            properties:
              type:
                type: array
                uniqueItems: true
                description: Types of node
                example: ["host"]
                items:
                  type: string
                  enum: [host, container, container_image, container_by_name, process, process_by_name, pod, kube_controller, kube_service, swarm_service]
              pseudo:
                type: array
                uniqueItems: true
                description: Pseudo node or not
                example: [false]
                items:
                  type: boolean
                  enum: [true, false]
              kernel_version:
                type: array
                uniqueItems: true
                description: Kernel version (for type `host`)
                example: ["4.13.0-1019-gcp #23-Ubuntu SMP Thu May 31 16:13:34 UTC 2018"]
                items:
                  type: string
              host_name:
                type: array
                uniqueItems: true
                description: Host names
                example: ["dev-1", "dev-2"]
                items:
                  type: string
              os:
                type: array
                uniqueItems: true
                description: Operating system (for type `host`)
                example: ["linux"]
                items:
                  type: string
              local_networks:
                type: array
                uniqueItems: true
                description: Local networks in CIDR format (for type `host`)
                example: ["127.0.0.1/8", "172.17.0.1/16"]
                items:
                  type: string
              interfaceNames:
                type: array
                uniqueItems: true
                description: Interface names (for type `host`)
                example: ["lo", "docker0", "eth0"]
                items:
                  type: string
              publicIpAddress:
                type: array
                uniqueItems: true
                description: Public IP of host (for type `host`)
                example: ["1.2.3.4"]
                items:
                  type: string
              kubernetes_node_type:
                type: array
                uniqueItems: true
                description: kubernetes node type (for type `kube_controller`)
                example: ["running"]
                items:
                  type: string
                  enum: [Deployment, DaemonSet, ReplicaSet, CronJob, StatefulSet]
              kubernetes_namespace:
                type: array
                uniqueItems: true
                description: kubernetes namespace (for type `pod`, `kube_controller`, `kube_service`). Empty means all.
                example: ["default"]
                items:
                  type: string
                  enum: [default, "", kube-public, kube-system]
              tags:
                type: array
                uniqueItems: true
                description: User defined tags
                example: ["prod"]
                items:
                  type: string
              container_name:
                type: array
                uniqueItems: true
                description: Container name (for type `container`, `container_image`)
                example: ["redis", "mysql"]
                items:
                  type: string
              image_name:
                type: array
                uniqueItems: true
                description: Container image names (for type `container`, `container_image`)
                example: ["redis:latest", "mysql:latest"]
                items:
                  type: string
              pid:
                type: integer
                minimum: 1
                description: Process ID (for type `process`)
                example: 1225
              ppid:
                type: integer
                minimum: 1
                description: Parent process ID (for type `process`)
                example: 1225
    responses:
      200:
        description: Request success
        properties:
          data:
            type: object
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
    try:
        if not request.is_json:
            raise InvalidUsage("Missing JSON post data in request")
        post_data = request.json
        if not post_data:
            post_data = {}
        return set_response(data=resource.get_enumerate_node_data(post_data))
    except Exception as ex:
        raise InternalError(str(ex))


@resource_api.route("/status", methods=["POST"], endpoint="api_v1_5_status_api")
@jwt_required
def status_api():
    """
    Status API
    ---
    tags:
      - Enumerate
    security:
      - Bearer: []
    operationId: statusApi
    description: Get status of a previous request by status_id
    parameters:
    - in: body
      name: Options
      description: Options
      schema:
        type: object
        properties:
          id:
            type: string
            description: Status ID which was sent in previous request. If a particular request takes longer, api call will reply a status id. This id should be used to query the status of that particular request. It status is success, it will respond data url where data will be available.
            required: true
            example: "qwkfjwqfkwqkf"
    responses:
      200:
        description: Request success
        properties:
          data:
            type: object
            description: Response message
            properties:
              data_url:
                type: string
                description: Data API url path
              id:
                type: string
                description: id to use when calling data api
              status:
                type: string
                description: If status is `success`, then data is available
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
    try:
        if not request.is_json:
            raise InvalidUsage("Missing JSON in request")
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        status_id_encoded = request.json.get("id", None)
        if not status_id_encoded:
            raise InvalidUsage("id is required.")
        status_id = json.loads(resource.decrypt(status_id_encoded))
        status = getattr(resource, status_id["type"] + "_status")(status_id["params"], status_id["post_data"])
        response = {
            "id": status_id_encoded,
            "status": status
        }
        if status == "success":
            response["data_url"] = "{0}/data".format(constants.API_URL_PREFIX)
        return set_response(data=response)
    except Exception as ex:
        raise InternalError(str(ex))


@resource_api.route("/data", methods=["POST"], endpoint="api_v1_5_data_api")
@jwt_required
def data_api():
    """
    Data API
    ---
    tags:
      - Enumerate
    security:
      - Bearer: []
    operationId: dataApi
    description: Get data of a previous request by status_id
    parameters:
    - in: body
      name: Options
      description: Options
      schema:
        type: object
        properties:
          id:
            type: string
            description: Status ID which was sent in previous status api. If a particular request takes longer, api call will reply a status id. This id should be used to query the status of that particular request. It status is success, it will respond data url where data will be available.
            required: true
            example: "qwkfjwqfkwqkf"
    responses:
      200:
        description: Request success
        properties:
          data:
            type: object
            description: Response data
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
    try:
        if not request.is_json:
            raise InvalidUsage("Missing JSON in request")
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        data_id_encoded = request.json.get("id", None)
        if not data_id_encoded:
            raise InvalidUsage("id is required.")
        status_id = json.loads(resource.decrypt(data_id_encoded))
        data = getattr(resource, status_id["type"] + "_data")(status_id["params"], status_id["post_data"])
        response = {
            "id": data_id_encoded,
            "data": data,
        }
        return set_response(data=response)
    except Exception as ex:
        raise InternalError(str(ex))

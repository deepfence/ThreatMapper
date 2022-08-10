from utils.node_utils import NodeUtils
from utils import resource as resource_util
from utils import constants
from utils.helper import websocketio_channel_name_format, call_scope_control_api, async_http_post, \
    get_host_name_probe_id_map, get_node_details_for_scope_id, is_network_attack_vector, get_topology_network_graph
from utils.esconn import ESConn
from utils.custom_exception import DFError, InternalError, InvalidUsage
import json
from utils.scope import fetch_topology_data
import urllib
from config.config import celery_app
from config.redisconfig import redis
from datetime import datetime, timedelta
import time
import networkx as nx
import urllib.parse


class Node(object):
    """
    The Node resource type
    """

    @classmethod
    def get_node(cls, node_id, scope_id, node_type):
        node = None
        if node_id and node_id != "0":
            for i in range(3):
                try:
                    node = Node(node_id)
                    break
                except Exception as ex:
                    print(ex)
                    time.sleep(5)
        if not node and (scope_id and node_type):
            node_utils = NodeUtils()
            node_id = node_utils.get_df_id_from_scope_id(scope_id, node_type)
            for i in range(3):
                try:
                    node = Node(node_id)
                    break
                except Exception as ex:
                    print(ex)
                    time.sleep(5)
        return node

    def __init__(self, node_id, node_type=None, df_id_to_scope_id_map=None, topology_data_df_format=None):
        if not node_id:
            raise InvalidUsage('node_id cannot be empty')
        self.node_id = node_id
        if node_type and df_id_to_scope_id_map:
            self.type = node_type
            self.scope_id = df_id_to_scope_id_map.get(node_id, "")
        else:
            node_utils = NodeUtils()
            self.scope_id, self.type = node_utils.get_scope_id_from_df_id(self.node_id, redis=redis)
        if not self.scope_id:
            raise InvalidUsage('node_id not found')
        if topology_data_df_format:
            self.node_details_formatted = topology_data_df_format.get(self.node_id, {})
        else:
            topology_data_formatted = redis.get(websocketio_channel_name_format(self.type + "?format=deepfence")[1])
            if not topology_data_formatted:
                raise InternalError("Please try later")
            self.node_details_formatted = json.loads(topology_data_formatted).get(self.node_id, {})
        if not self.node_details_formatted:
            raise InvalidUsage("node not found")
        self.host_name = self.node_details_formatted.get("host_name", "")
        self.is_ui_vm = self.node_details_formatted.get("is_ui_vm", False)
        self.pseudo = self.node_details_formatted.get("pseudo", False)
        self.name = self.node_details_formatted.get("name", self.host_name)
        self.image_name = self.node_details_formatted.get("image_name", "")
        self.image_tag = self.node_details_formatted.get("image_tag", "")
        self.image_name_tag = self.node_details_formatted.get("image_name_with_tag", "")
        self.image_id = self.node_details_formatted.get("docker_image_id", "")
        self.container_name = self.node_details_formatted.get("container_name", "")
        self.docker_container_id = self.node_details_formatted.get("docker_container_id", "")
        self.kubernetes_cluster_id = self.node_details_formatted.get("kubernetes_cluster_id", "")
        self.kubernetes_cluster_name = self.node_details_formatted.get("kubernetes_cluster_name", "")
        self.cluster_agent_probe_id = self.node_details_formatted.get("cluster_agent_probe_id", "")
        if self.type == constants.NODE_TYPE_POD:
            self.pod_name = self.node_details_formatted.get("name", "")
        else:
            self.pod_name = ""
        if self.type == constants.NODE_TYPE_KUBE_SERVICE:
            self.kube_service_name = self.node_details_formatted.get("name", "")
        else:
            self.kube_service_name = ""
        self.probe_id = resource_util.get_probe_id_for_host(self.host_name)

    def get_detailed_info(self):
        return get_node_details_for_scope_id(
            [(constants.TOPOLOGY_ID_NODE_TYPE_MAP_REVERSE.get(self.type), urllib.parse.quote_plus(self.scope_id))])

    def get_live_open_ports(self):
        node_details = self.get_detailed_info()
        ports = []
        if node_details and node_details[0]:
            try:
                for conn_info in node_details[0]["node"].get("connections", []):
                    if conn_info["id"] == "incoming-connections":
                        for conn in conn_info.get("connections", []):
                            for conn_metadata in conn["metadata"]:
                                if conn_metadata["id"] == "port":
                                    if conn_metadata["value"] not in ports:
                                        ports.append(conn_metadata["value"])
                                    break
            except:
                pass
        return ports

    def cve_scan_start(self, scan_types, priority=False, mask_cve_ids=""):
        if self.is_ui_vm or self.pseudo:
            return False
        if self.type not in [constants.NODE_TYPE_HOST, constants.NODE_TYPE_CONTAINER,
                             constants.NODE_TYPE_CONTAINER_IMAGE]:
            raise DFError('action not supported for this node type')
        if self.type in [constants.NODE_TYPE_CONTAINER, constants.NODE_TYPE_CONTAINER_IMAGE]:
            if not self.image_name_tag:
                return False
        cve_scan_doc = self.get_latest_cve_scan_doc()
        if cve_scan_doc:
            status = cve_scan_doc.get('action')
            if status == constants.CVE_SCAN_STATUS_QUEUED or status in constants.CVE_SCAN_RUNNING_STATUS:
                raise DFError("CVE scan on this node is already in progress")
        node_type = constants.NODE_TYPE_HOST
        if self.type == constants.NODE_TYPE_HOST:
            cve_node_id = self.host_name
        else:
            node_type = constants.NODE_TYPE_CONTAINER_IMAGE
            cve_node_id = self.image_name_tag
        # Add 'QUEUED' doc
        datetime_now = datetime.now()
        scan_id = cve_node_id + "_" + datetime_now.strftime("%Y-%m-%dT%H:%M:%S") + ".000"
        body = {
            "masked": "false",
            "type": constants.CVE_SCAN_LOGS_ES_TYPE,
            "scan_id": scan_id,
            "cve_scan_message": "",
            "time_stamp": int(time.time() * 1000.0),
            "@timestamp": datetime_now.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "host": self.host_name,
            "action": constants.CVE_SCAN_STATUS_QUEUED,
            "host_name": self.host_name,
            "node_id": cve_node_id,
            "node_type": node_type,
        }
        ESConn.create_doc(constants.CVE_SCAN_LOGS_INDEX, body)
        scan_details = {"cve_node_id": cve_node_id, "scan_types": scan_types, "node_id": self.node_id,
                        "scan_id": scan_id, "mask_cve_ids": mask_cve_ids}
        celery_task_id = "cve_scan:" + scan_id
        if priority:
            celery_app.send_task('tasks.vulnerability_scan_worker.vulnerability_scan', args=(),task_id=celery_task_id, kwargs={"scan_details": scan_details},
                                             queue=constants.VULNERABILITY_SCAN_PRIORITY_QUEUE)
        else:
            celery_app.send_task('tasks.vulnerability_scan_worker.vulnerability_scan', args=(), task_id=celery_task_id,
                             kwargs={"scan_details": scan_details}, queue=constants.VULNERABILITY_SCAN_QUEUE)
        return True

    def cve_scan_stop(self):
        if self.is_ui_vm or self.pseudo:
            return False
        if self.type not in [constants.NODE_TYPE_HOST, constants.NODE_TYPE_CONTAINER,
                             constants.NODE_TYPE_CONTAINER_IMAGE]:
            raise DFError('action not supported for this node type')
        cve_scan_doc = self.get_latest_cve_scan_doc()
        if cve_scan_doc:
            status = cve_scan_doc.get("action", "")
            scan_id = cve_scan_doc.get("scan_id", "")
            if (status in constants.CVE_SCAN_NOT_RUNNING_STATUS) or (not scan_id):
                raise DFError("CVE scan currently not running on this node")
            elif status != constants.CVE_SCAN_STATUS_QUEUED:
                raise DFError("CVE scan can be stopped only when it's in queued state")
            celery_task_id = "cve_scan:" + scan_id
            celery_app.control.revoke(celery_task_id, terminate=False)
            node_type = constants.NODE_TYPE_HOST
            if self.type != constants.NODE_TYPE_HOST:
                node_type = constants.NODE_TYPE_CONTAINER_IMAGE
            body = {
                "masked": "false",
                "type": constants.CVE_SCAN_LOGS_ES_TYPE,
                "scan_id": scan_id,
                "cve_scan_message": "Scan stopped by user",
                "time_stamp": int(time.time() * 1000.0),
                "@timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                "host": self.host_name,
                "action": constants.CVE_SCAN_STATUS_STOPPED,
                "host_name": self.host_name,
                "node_id": cve_scan_doc.get("node_id", ""),
                "node_type": node_type
            }
            ESConn.create_doc(constants.CVE_SCAN_LOGS_INDEX, body)
        return True

    def __compliance_helper(self, url, payload):
        try:
            status, resp, status_code = call_scope_control_api(url, data=json.dumps(payload))
        except Exception as e:
            raise DFError("failed to connect to agent", error=e)
        if status_code != 200:
            if 400 <= status_code < 500:
                raise DFError(resp.strip('"'))
            else:
                raise InternalError("non-200 response from {}; response code: {}; response: {}".format(
                    url, status_code, resp))
        try:
            response = json.loads(resp)
        except:
            response = resp
        return response

    def compliance_start_scan(self, compliance_check_type, ignore_test_numbers, scan_id=None):
        if self.is_ui_vm or self.pseudo:
            return {'complianceCheck': 'Compliance check cannot be started on management console'}
        if self.type != constants.NODE_TYPE_HOST and self.type != constants.NODE_TYPE_CONTAINER and self.type != constants.NODE_TYPE_CONTAINER_IMAGE:
            raise DFError('action not supported for this node type')
        # Add 'QUEUED' doc
        time_time = time.time()
        if scan_id is None:
            scan_id = self.scope_id + "_" + compliance_check_type + "_" + datetime.now().strftime(
                "%Y-%m-%dT%H:%M:%S") + ".000"
        es_doc = {
            "total_checks": 0,
            "result": {},
            "node_id": self.scope_id,
            "node_type": self.type,
            "compliance_check_type": compliance_check_type,
            "masked": "false",
            "node_name": "",
            "host_name": self.host_name,
            "scan_status": "QUEUED",
            "scan_message": "",
            "scan_id": scan_id,
            "time_stamp": int(time_time * 1000.0),
            "kubernetes_cluster_id": self.kubernetes_cluster_id,
            "kubernetes_cluster_name": self.kubernetes_cluster_name,
            "@timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.") + repr(time_time).split('.')[1][:3] + "Z"
        }
        post_data = {"check_type": compliance_check_type, "node_type": self.type}
        if self.type == constants.NODE_TYPE_CONTAINER:
            post_data["container_id"] = self.docker_container_id
        elif self.type == constants.NODE_TYPE_CONTAINER_IMAGE:
            post_data["image_id"] = self.image_id
            post_data["image_name"] = self.image_name_tag
        if not ignore_test_numbers:
            ignore_test_numbers = []
        post_data["ignore_test_number_list"] = json.dumps(ignore_test_numbers)
        post_data["kubernetes_cluster_name"] = self.kubernetes_cluster_name
        post_data["kubernetes_cluster_id"] = self.kubernetes_cluster_id
        post_data["scan_id"] = scan_id
        start_scan_api_url = constants.SCOPE_HOST_API_CONTROL_URL.format(
            probe_id=self.probe_id, host_name=self.host_name, action=constants.NODE_ACTION_COMPLIANCE_START_SCAN)
        return self.__compliance_helper(start_scan_api_url, post_data)

    def secret_start_scan(self):
        if self.is_ui_vm or self.pseudo:
            return {'secretScan': 'Secret scan cannot be started on management console'}
        if self.type != constants.NODE_TYPE_HOST and self.type != constants.NODE_TYPE_CONTAINER and \
                self.type != constants.NODE_TYPE_CONTAINER_IMAGE:
            raise DFError('action not supported for this node type')
        # Add 'QUEUED' doc
        time_time = time.time()
        scan_id = self.scope_id + "_" + datetime.now().strftime(
                "%Y-%m-%dT%H:%M:%S") + ".000"
        es_doc = {
            "masked": "false",
            "node_id": self.scope_id,
            "node_type": self.type,
            "node_name": self.host_name,
            "host_name": self.host_name,
            "scan_status": "QUEUED",
            "scan_message": "",
            "scan_id": scan_id,
            "time_stamp": int(time_time * 1000.0),
            "container_name": "" if self.type != constants.NODE_TYPE_CONTAINER else
            self.host_name + "/" + self.container_name,
            "kubernetes_cluster_name": self.kubernetes_cluster_name,
            "@timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.") + repr(time_time).split('.')[1][:3] + "Z"
        }
        ESConn.create_doc(constants.SECRET_SCAN_LOGS_INDEX, es_doc)
        post_data = {"node_type": self.type, "scan_id": scan_id, "node_id": self.scope_id,
                     "kubernetes_cluster_name": self.kubernetes_cluster_name, "container_name": ""}
        if self.type == constants.NODE_TYPE_CONTAINER:
            post_data["container_id"] = self.docker_container_id
            post_data["container_name"] = self.host_name + "/" + self.container_name
        elif self.type == constants.NODE_TYPE_CONTAINER_IMAGE:
            post_data["image_id"] = self.image_id
            post_data["image_name"] = self.image_name_tag
        start_scan_api_url = constants.SCOPE_HOST_API_CONTROL_URL.format(
            probe_id=self.probe_id, host_name=self.host_name, action=constants.NODE_ACTION_SECRET_SCAN_START)
        return self.__secret_helper(start_scan_api_url, post_data)

    def __secret_helper(self, url, payload):
        try:
            status, resp, status_code = call_scope_control_api(url, data=json.dumps(payload))
        except Exception as e:
            raise DFError("failed to connect to agent", error=e)
        if status_code != 200:
            if 400 <= status_code < 500:
                raise DFError(resp.strip('"'))
            else:
                raise InternalError("non-200 response from {}; response code: {}; response: {}".format(
                    url, status_code, resp))
        try:
            response = json.loads(resp)
        except:
            response = resp
        return response

    def get_latest_cve_scan_doc(self):
        if self.is_ui_vm or self.pseudo:
            return {}
        if self.type not in [constants.NODE_TYPE_HOST, constants.NODE_TYPE_CONTAINER,
                             constants.NODE_TYPE_CONTAINER_IMAGE, constants.NODE_TYPE_POD]:
            raise DFError('action not supported for this node type')
        if self.type == constants.NODE_TYPE_POD:
            image_name_tag = ""
            topology_containers_data = redis.get(
                websocketio_channel_name_format(constants.NODE_TYPE_CONTAINER + "?format=deepfence")[1])
            if not topology_containers_data:
                topology_containers_data = "{}"
            topology_containers_data = json.loads(topology_containers_data)
            for container_node_id, container_details in topology_containers_data.items():
                if container_details.get("pseudo", False):
                    continue
                if not container_details.get("kubernetes_cluster_id"):
                    continue
                container_found = False
                for parent in container_details.get("parents", []):
                    if parent["type"] == constants.NODE_TYPE_POD and parent["id"] == self.node_id:
                        image_name_tag = container_details.get("image_name_with_tag", "")
                        container_found = True
                        break
                if container_found:
                    break
            if not image_name_tag:
                raise DFError('no container found in the pod')
            node_id = image_name_tag
        elif self.type == constants.NODE_TYPE_HOST:
            node_id = self.host_name
        else:
            node_id = self.image_name_tag
        es_response = ESConn.search_by_and_clause(constants.CVE_SCAN_LOGS_INDEX, {"node_id": node_id}, 0, size=1)
        latest_cve_scan_doc = {}
        cve_scan_list = es_response.get("hits", [])
        if cve_scan_list:
            cve_scan_doc = cve_scan_list[0]
            latest_cve_scan_doc = cve_scan_doc.get('_source', {})
            latest_cve_scan_doc.update({'_id': cve_scan_doc.get('_id', "")})
        return latest_cve_scan_doc

    def get_cve_status(self):
        if self.is_ui_vm or self.pseudo:
            return {}
        if self.type not in [constants.NODE_TYPE_HOST, constants.NODE_TYPE_CONTAINER,
                             constants.NODE_TYPE_CONTAINER_IMAGE, constants.NODE_TYPE_POD]:
            raise DFError('action not supported for this node type')
        cve_scan_doc = self.get_latest_cve_scan_doc()
        filter_keys = ["scan_type", "cve_scan_message", "node_type", "@timestamp", "action", "scan_id", "host_name",
                       "node_id"]
        if cve_scan_doc:
            stripped_doc = {k: v for k, v in cve_scan_doc.items() if k in filter_keys}
        else:
            stripped_doc = {k: "NOT_SCANNED" if k == "action" else "" for k in filter_keys}
        return stripped_doc

    def get_attack_path(self, top_n=5):
        if self.is_ui_vm or self.pseudo:
            return {}
        if self.type not in [constants.NODE_TYPE_HOST, constants.NODE_TYPE_CONTAINER,
                             constants.NODE_TYPE_CONTAINER_IMAGE, constants.NODE_TYPE_POD]:
            raise DFError('action not supported for this node type')
        cve_scan_doc = self.get_latest_cve_scan_doc()
        if not cve_scan_doc:
            return {}
        vulnerabilities = ESConn.search_by_and_clause(
            constants.CVE_INDEX, {'scan_id': cve_scan_doc["scan_id"], 'masked': 'false'}, 0, "desc",
            size=constants.ES_TERMS_AGGR_SIZE)
        if not vulnerabilities.get("hits", []):
            return {}
        top_cve_ids = []
        for vulnerability in vulnerabilities.get("hits", []):
            if not is_network_attack_vector(vulnerability.get("_source", {}).get("cve_attack_vector", "")):
                continue
            cve_details = {
                "cve_id": vulnerability.get("_source", {}).get("cve_id"),
                "cve_cvss_score": vulnerability.get("_source", {}).get("cve_cvss_score", 0)
            }
            top_cve_ids.append(cve_details)
        top_cve_ids = list(set(
            [i["cve_id"] for i in sorted(top_cve_ids, key=lambda k: k['cve_cvss_score'], reverse=True)]))[:3]
        response = {
            "cve_attack_vector": "network",
            "attack_path": self.get_attack_path_for_node(top_n=top_n),
            "ports": self.get_live_open_ports(),
            "cve_id": top_cve_ids
        }
        return response

    def get_attack_path_for_node(self, top_n=5):
        topology_nodes = fetch_topology_data(self.type, format="scope")
        graph = get_topology_network_graph(topology_nodes)
        shortest_paths_generator_in = nx.shortest_simple_paths(graph, "in-theinternet", self.scope_id)
        shortest_paths = []
        counter = 0
        try:
            for _, path in enumerate(shortest_paths_generator_in):
                shortest_paths.append([topology_nodes[i]["label"] for i in path])
                counter += 1
                if counter == top_n:
                    break
        except:
            pass
        if len(shortest_paths) >= top_n:
            return shortest_paths
        shortest_paths_generator_out = nx.shortest_simple_paths(graph, self.scope_id, "out-theinternet")
        try:
            for _, path in enumerate(shortest_paths_generator_out):
                tmp_path = []
                for i in path:
                    tmp_path.insert(0, topology_nodes[i]["label"])
                shortest_paths.append(tmp_path)
                counter += 1
                if counter == top_n:
                    break
        except:
            pass
        return shortest_paths

    def set_tags(self, tags, action):
        if self.is_ui_vm or self.pseudo:
            return {}
        if not tags:
            return {}
        url_data_list = []
        json_data = json.dumps({"user_defined_tags": ",".join(tags)})
        if self.type == constants.NODE_TYPE_HOST:
            add_tags_url = constants.SCOPE_HOST_API_CONTROL_URL.format(
                probe_id=self.probe_id, host_name=self.host_name, action="host_" + action)
            url_data_list.append((add_tags_url, json_data))
        elif self.type == constants.NODE_TYPE_CONTAINER:
            add_tags_url = constants.SCOPE_CONTAINER_API_CONTROL_URL.format(
                probe_id=self.probe_id, container_id=self.docker_container_id, action="container_" + action)
            url_data_list.append((add_tags_url, json_data))
        elif self.type == constants.NODE_TYPE_CONTAINER_IMAGE:
            host_name_probe_id_map = get_host_name_probe_id_map()
            for parent in self.node_details_formatted.get("parents", []):
                if parent.get("type", "") == constants.NODE_TYPE_HOST and \
                        parent.get("label", "") in host_name_probe_id_map:
                    add_tags_url = constants.SCOPE_IMAGE_API_CONTROL_URL.format(
                        probe_id=host_name_probe_id_map[parent["label"]],
                        image_full_name=urllib.parse.quote(self.image_name_tag, safe=''), action="image_" + action)
                    url_data_list.append((add_tags_url, json_data))
        else:
            raise DFError('action not supported for this node type')
        if url_data_list:
            response = async_http_post(url_data_list)
            for url, resp in response.items():
                return resp  # First resp is enough
        return {}

    def __call_scope_control_api(self, url, data=None):
        try:
            status, resp, status_code = call_scope_control_api(url, data=data)
        except Exception as e:
            raise DFError("failed to connect agent", error=e)
        if status_code != 200:
            if 400 <= status_code < 500:
                raise DFError(resp.strip('"'))
            else:
                raise InternalError("non-200 response from {}; response code: {}; response: {}".format(
                    url, status_code, resp))
        return status, resp, status_code

    def scale_up(self):
        if self.type != constants.NODE_TYPE_KUBE_CONTROLLER:
            raise DFError('action not supported for this node type')
        kubernetes_node_type = self.node_details_formatted.get("kubernetes_node_type", "")
        if kubernetes_node_type not in ["Deployment", "ReplicaSet"]:
            raise DFError('action not supported for kubernetes_node_type {0}'.format(kubernetes_node_type))
        url = constants.SCOPE_KUBE_CONTROLLER_API_CONTROL_URL.format(
            probe_id=self.probe_id, kube_controller_id=self.scope_id, action=constants.NODE_ACTION_SCALE_UP)
        status, resp, status_code = self.__call_scope_control_api(url)
        return status_code

    def scale_down(self):
        if self.type != constants.NODE_TYPE_KUBE_CONTROLLER:
            raise DFError('action not supported for this node type')
        kubernetes_node_type = self.node_details_formatted.get("kubernetes_node_type", "")
        if kubernetes_node_type not in ["Deployment", "ReplicaSet"]:
            raise DFError('action not supported for kubernetes_node_type {0}'.format(kubernetes_node_type))
        url = constants.SCOPE_KUBE_CONTROLLER_API_CONTROL_URL.format(
            probe_id=self.probe_id, kube_controller_id=self.scope_id, action=constants.NODE_ACTION_SCALE_DOWN)
        status, resp, status_code = self.__call_scope_control_api(url)
        return status_code

    def pretty_print(self):
        node_type = constants.NODE_TYPE_HOST
        if self.type == constants.NODE_TYPE_HOST:
            cve_node_id = self.host_name
        else:
            node_type = constants.NODE_TYPE_CONTAINER_IMAGE
            cve_node_id = self.image_name_tag
        return {
            "host": self.host_name,
            "host_name": self.host_name,
            "node_id": cve_node_id,
            "node_type": node_type,
        }

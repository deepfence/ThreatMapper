import json
from config.redisconfig import redis
from Crypto.Cipher import AES
import codecs
from utils.constants import NODE_TYPE_HOST, TOPOLOGY_HOSTS_PROBE_MAP_REDIS_KEY, NODE_TYPE_CONTAINER, \
    NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_POD, NODE_TYPE_REGISTRY_IMAGE, \
    REGISTRY_IMAGES_CACHE_KEY_PREFIX, CVE_SCAN_RUNNING_STATUS, CVE_SCAN_STATUS_COMPLETED, AES_SETTING_KEY, \
    CLOUD_CREDENTIAL_AES_SETTING_KEY
from utils.helper import websocketio_channel_name_format, get_image_cve_status
from utils.custom_exception import InvalidUsage
from operator import itemgetter
from datetime import datetime, timedelta
from models.setting import Setting


def get_aes_credentials(setting_key):
    aes_setting = Setting.query.filter_by(key=setting_key).one_or_none()
    if not aes_setting:
        return "", ""
    aes_key = str.encode(aes_setting.value["value"]["aes_key"], 'utf-8')
    aes_iv = str.encode(aes_setting.value["value"]["aes_iv"], 'utf-8')
    return aes_key, aes_iv


def encrypt(message):
    aes_key, aes_iv = get_aes_credentials(AES_SETTING_KEY)
    if not aes_key or not aes_iv:
        return ""
    aes_obj = AES.new(aes_key, AES.MODE_CFB, iv=aes_iv)
    cipher_text = aes_obj.encrypt(message.encode("utf-8"))
    return cipher_text.hex()


def decrypt(cipher_text):
    aes_key, aes_iv = get_aes_credentials(AES_SETTING_KEY)
    if not aes_key or not aes_iv:
        return ""
    aes_obj = AES.new(aes_key, AES.MODE_CFB, iv=aes_iv)
    return aes_obj.decrypt(codecs.decode(cipher_text, "hex")).decode("utf-8")


def get_scan_status_for_registry_images(registry_image_list, image_cve_status=None):
    total_scanned = 0
    scan_in_progress = 0
    if not registry_image_list:
        return [], 0, 0, 0
    cve_status_map = {
        "QUEUED": "queued", "STARTED": "in_progress", "SCAN_IN_PROGRESS": "in_progress", "WARN": "in_progress",
        "COMPLETED": "complete", "ERROR": "error", "STOPPED": "error", "UPLOADING_IMAGE": "in_progress",
        "UPLOAD_COMPLETE": "in_progress"}
    cve_never_scanned = "never_scanned"
    if not image_cve_status:
        image_cve_status = get_image_cve_status()
    # merge registry_image_list and image index
    registry_image_list_with_status = []
    unique_images = set()
    for reg_image in registry_image_list:
        unique_images.add(reg_image["image_name"])
        cve_status = image_cve_status.get(reg_image["image_name_with_tag"], {})
        if cve_status:
            reg_image["vulnerability_scan_status"] = cve_status_map.get(
                cve_status["action"], cve_never_scanned)
            reg_image["vulnerability_scan_status_time"] = cve_status["@timestamp"]
            reg_image["vulnerability_scan_status_msg"] = cve_status["cve_scan_message"]
            if cve_status["action"] == CVE_SCAN_STATUS_COMPLETED:
                total_scanned += 1
            elif cve_status["action"] in CVE_SCAN_RUNNING_STATUS:
                scan_in_progress += 1
        else:
            reg_image["vulnerability_scan_status"] = cve_never_scanned
            reg_image["vulnerability_scan_status_time"] = ""
            reg_image["vulnerability_scan_status_msg"] = ""
        registry_image_list_with_status.append(reg_image)
    return registry_image_list_with_status, total_scanned, scan_in_progress, len(unique_images)


def get_nodes_list(params):
    node_list = []
    additional_resp = {}
    node_types = params["filters"]["type"]
    for node_type in node_types:
        if node_type == NODE_TYPE_REGISTRY_IMAGE:
            for registry_id in params.get("registry_id"):
                image_list_details_str = redis.get("{0}:{1}".format(REGISTRY_IMAGES_CACHE_KEY_PREFIX, registry_id))
                if image_list_details_str:
                    image_list_details = json.loads(image_list_details_str)
                    additional_resp["last_updated"] = image_list_details["last_updated"]
                    additional_resp["registry_update_in_progress"] = False
                    unique_images = {img["image_name"]
                                     for img in image_list_details["image_list"]}
                    additional_resp["unique_images"] = len(unique_images)
                    images_list, additional_resp["total_scanned"], additional_resp["scan_in_progress"], _ = \
                        get_scan_status_for_registry_images(image_list_details["image_list"])
                    node_list += images_list
                else:
                    additional_resp = {
                        "last_updated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                        "unique_images": 0, "total_scanned": 0, "scan_in_progress": 0,
                        "registry_update_in_progress": True
                    }
        else:
            formatted_data = redis.get(websocketio_channel_name_format(
                node_type + "?format=deepfence")[1])
            if formatted_data:
                node_list += list(json.loads(formatted_data).values())

    filtered_node_list = []
    for node in node_list:
        all_filters_matched = True
        for filter_key, filter_val in params["filters"].items():
            if not filter_val:
                continue
            # {"cloud_metadata.location": ["eastus"]}
            if "." in filter_key:
                tmp_key = filter_key.split(".")
                tmp_val = node.get(tmp_key[0], {})
                if type(tmp_val) != dict:
                    all_filters_matched = False
                    break
                node_val = tmp_val.get(tmp_key[1], None)
            else:
                node_val = node.get(filter_key, None)
            if type(filter_val[0]) is bool:
                if not node_val:
                    node_val = False
            if node_val is not None:
                if filter_key == "pushed_at":
                    value = {"Past 1 day": 1, "Past 7 days": 7, "Past 1 month": 30, "Past 3 months": 90,
                             "Past 6 months": 180, "Show all": 0}.get(filter_val[0], 0)
                    if value != 0:
                        dt = (datetime.now() - timedelta(days=value)
                              ).strftime("%Y-%m-%dT%H:%M:%S")
                        # y-m-d can be compared as a string
                        if str(node_val) < dt:
                            all_filters_matched = False
                            break
                    continue
                if type(node_val) is list:
                    if not any(val in filter_val for val in node_val):
                        all_filters_matched = False
                        break
                elif type(node_val) is dict:
                    if not any(val in filter_val for val in node_val.values()):
                        all_filters_matched = False
                        break
                else:
                    if not node_val in filter_val:
                        all_filters_matched = False
                        break
            else:
                all_filters_matched = False
                break
        if all_filters_matched:
            if params["fields"]:
                filtered_node_list.append(
                    {k: v for k, v in node.items() if k in params["fields"] or k == "id"})
            else:
                filtered_node_list.append(node)
    # sort
    if params["sort_by"]:
        reverse_sort = False if params.get("sort_order") == "asc" else True
        sort_by = params.get("sort_by")
        # add missing keys with empty value
        filtered_node_list_all_keys = frozenset().union(*filtered_node_list)
        for i in filtered_node_list:
            for j in filtered_node_list_all_keys:
                if j not in i:
                    i[j] = ""
        try:
            filtered_node_list = sorted(
                filtered_node_list, key=itemgetter(sort_by), reverse=reverse_sort)

        except:
            pass
    result_nodes = []
    registry_images = {}
    counter = 0
    for node in filtered_node_list:
        if node.get("type") == NODE_TYPE_REGISTRY_IMAGE:
            image_index = registry_images.get(node.get("image_name"), None)
            if image_index is None:
                result_nodes.append({
                    "image_name": node["image_name"],
                    "type": NODE_TYPE_REGISTRY_IMAGE,
                    "tags": [node],
                    "total_tags": 1
                })
                registry_images[node["image_name"]] = counter
                counter += 1
            else:
                result_nodes[image_index]["tags"].append(node)
                result_nodes[image_index]["total_tags"] += 1
        else:
            result_nodes.append(node)
            counter += 1
    resp = {
        "data": result_nodes[params["start_index"]:params["start_index"] + params["size"]],
        "total": len(filtered_node_list),
        **additional_resp
    }
    return resp


def get_default_params(params):
    if not params:
        params = {}
    filters = {}
    if not params.get("sort_by"):
        params["sort_by"] = ""
    if params.get("sort_order") not in ["asc", "desc"]:
        params["sort_order"] = "asc"
    if "filters" not in params:
        params["filters"] = {}
    if "fields" not in params:
        params["fields"] = []  # columns
    if type(params["fields"]) != list:
        params["fields"] = []
    # By default give hosts
    if "type" not in params["filters"]:
        params["filters"]["type"] = [NODE_TYPE_HOST]
    if "pseudo" not in params["filters"]:
        params["filters"]["pseudo"] = [True, False]
    # Make all values as lists, even if str/int given
    for k, v in params["filters"].items():
        if not k:
            continue
        if v == "" or v is None:
            continue
        if type(v) is list:
            filters[k] = v
        else:
            filters[k] = [v]
    params["filters"] = filters
    if "start_index" not in params:
        params["start_index"] = 0
    if "registry_id" in params:
        if type(params["registry_id"]) != list:
            params["registry_id"] = [params["registry_id"]]
    params["start_index"] = int(params["start_index"])
    if params["start_index"] < 0:
        raise InvalidUsage("start_index should not be less than 0")
    if "size" not in params:
        params["size"] = 50
    params["size"] = int(params["size"])
    if params["size"] < 1:
        raise InvalidUsage("size should not be less than 1")
    return params


def get_enumerate_node_data(post_data=None):
    """
    Get data
    :return: actual_data: str | list | dict
    """
    return get_nodes_list(get_default_params(post_data))


def get_probe_id_for_host(host_name):
    host_name_probe_map_str = redis.get(TOPOLOGY_HOSTS_PROBE_MAP_REDIS_KEY)
    if host_name_probe_map_str:
        host_name_probe_map = json.loads(host_name_probe_map_str)
        return host_name_probe_map.get(host_name, "")
    return ""


def encrypt_cloud_credential(message):
    cloud_credential_key, cloud_credential_iv = get_aes_credentials(CLOUD_CREDENTIAL_AES_SETTING_KEY)
    if not cloud_credential_key or not cloud_credential_iv:
        return ""
    cloud_credential_obj = AES.new(
        cloud_credential_key, AES.MODE_CFB, iv=cloud_credential_iv)
    cipher_text = cloud_credential_obj.encrypt(message.encode("utf-8"))
    return cipher_text.hex()


def decrypt_cloud_credential(cypher_text):
    cloud_credential_key, cloud_credential_iv = get_aes_credentials(CLOUD_CREDENTIAL_AES_SETTING_KEY)
    if not cloud_credential_key or not cloud_credential_iv:
        return ""
    cloud_credential_obj = AES.new(
        cloud_credential_key, AES.MODE_CFB, iv=cloud_credential_iv)
    return cloud_credential_obj.decrypt(codecs.decode(cypher_text, "hex")).decode("utf-8")


def filter_node_for_vulnerabilities(node_filters):
    node_filters_for_cve_index = {}
    node_filters_for_cve_scan_index = {}
    cve_scan_container_name = []
    cve_scan_image_name = []
    cve_scan_k8_name = []
    cve_scan_host_name = []
    k8s_namespaces = node_filters.get("kubernetes_namespace", [])
    if k8s_namespaces and type(k8s_namespaces) != list:
        k8s_namespaces = [k8s_namespaces]
    if node_filters.get("host_name"):
        node_filters_for_cve_index["host_name"] = node_filters["host_name"]
        cve_scan_host_name = node_filters["host_name"]
    if node_filters.get("kubernetes_cluster_name"):
        node_filters_for_cve_index["kubernetes_cluster_name"] = node_filters["kubernetes_cluster_name"]
        cve_scan_k8_name = node_filters["kubernetes_cluster_name"]
    # host_filters = {k: v for k, v in node_filters.items() if k in ["kubernetes_cluster_name", "user_defined_tags"]}
    # if host_filters:
    #     hosts = get_nodes_list(get_default_params({"filters": {
    #         "type": NODE_TYPE_HOST, **node_filters}, "size": 50000})).get("data", [])
    #     if hosts:
    #         if not node_filters_for_cve_index.get("host_name"):
    #             node_filters_for_cve_index["host_name"] = []
    #         for host in hosts:
    #             if host.get("host_name") and host["host_name"] not in node_filters_for_cve_index["host_name"]:
    #                 node_filters_for_cve_index["host_name"].append(host["host_name"])
    #                 cve_scan_host_name.append(host["host_name"])
    if node_filters.get("container_name"):
        node_filters_for_cve_index["cve_container_name"] = node_filters["container_name"]
        cve_scan_container_name = node_filters["container_name"]
    container_filters = {k: v for k, v in node_filters.items() if k in [
        "user_defined_tags"]}
    if container_filters:
        containers = get_nodes_list(get_default_params({"filters": {
            "type": NODE_TYPE_CONTAINER, **node_filters}, "size": 50000})).get("data", [])
        if containers:
            if not node_filters_for_cve_index.get("cve_container_name"):
                node_filters_for_cve_index["cve_container_name"] = []
            for container in containers:
                if container.get("container_name") and container["container_name"] not in \
                        node_filters_for_cve_index["cve_container_name"]:
                    if k8s_namespaces:
                        for table in container.get("tables", []):
                            if table.get("id") == "docker_label_":
                                for row in table.get("rows", []):
                                    if row.get("id") == "label_io.kubernetes.pod.namespace":
                                        if row.get("entries", {}).get("value", "") in k8s_namespaces:
                                            node_filters_for_cve_index["cve_container_name"].append(
                                                container["container_name"])
                                            cve_scan_container_name.append(
                                                container.get("container_name"))
                    else:
                        node_filters_for_cve_index["cve_container_name"].append(
                            container["container_name"])
                        cve_scan_container_name.append(
                            container.get("container_name"))
    if node_filters.get("image_name_with_tag"):
        node_filters_for_cve_index["cve_container_image"] = node_filters["image_name_with_tag"]
        cve_scan_image_name = node_filters["image_name_with_tag"]
    image_filters = {k: v for k, v in node_filters.items() if k in [
        "user_defined_tags"]}
    if image_filters:
        images = get_nodes_list(get_default_params({"filters": {
            "type": NODE_TYPE_CONTAINER_IMAGE, **node_filters}, "size": 50000})).get("data", [])
        if images:
            if not node_filters_for_cve_index.get("cve_container_image"):
                node_filters_for_cve_index["cve_container_image"] = []
            for image in images:
                if image.get("image_name_with_tag") and image["image_name_with_tag"] not in \
                        node_filters_for_cve_index["cve_container_image"]:
                    node_filters_for_cve_index["cve_container_image"].append(
                        image["image_name_with_tag"])
                    cve_scan_image_name.append(image["image_name_with_tag"])
    if cve_scan_container_name:
        # a fix to avoid irrelevant results
        node_filters_for_cve_scan_index["cve_container_name"] = list(
            set(cve_scan_container_name))
    if cve_scan_image_name:
        node_filters_for_cve_scan_index["node_id"] = list(
            set(cve_scan_image_name))
    if cve_scan_host_name:
        node_filters_for_cve_scan_index["host_name"] = cve_scan_host_name
    if cve_scan_k8_name:
        node_filters_for_cve_scan_index["kubernetes_cluster_name"] = cve_scan_k8_name
    if node_filters.get("action"):
        node_filters_for_cve_scan_index["action"] = node_filters["action"]
    return node_filters_for_cve_index, node_filters_for_cve_scan_index


def get_active_node_images_count(node_filters):
    active_hosts = []
    active_images = []
    active_cluster = {}
    nodes_data = redis.get(websocketio_channel_name_format(
        NODE_TYPE_CONTAINER + "?format=deepfence")[1])

    for node_details in get_nodes_list(get_default_params({"filters": node_filters, "size": 500000})).get('data', []):
        if node_details.get("host_name") and not node_details.get("is_ui_vm", False) and not node_details.get(
                "pseudo", False):
            active_hosts.append(node_details["host_name"])
        if node_details.get('kubernetes_cluster_id') and node_details.get("host_name"):
            cluster = node_details.get('kubernetes_cluster_id')
            if cluster in active_cluster:
                active_cluster[cluster]['count'] += 1
                active_cluster[cluster]['hosts'].append(
                    node_details.get("host_name"))
            else:
                active_cluster[cluster] = {}
                active_cluster[cluster]['count'] = 1
                active_cluster[cluster]['hosts'] = [
                    node_details.get("host_name")]
    if nodes_data:
        containers_topology_data = json.loads(nodes_data)
        for node_id, node_details in containers_topology_data.items():
            if node_details.get("image_name_with_tag") and not node_details.get("is_ui_vm", False) and \
                    not node_details.get("pseudo", False):
                if node_details["image_name_with_tag"] not in active_images:
                    active_images.append(node_details["image_name_with_tag"])
    return {"hosts": len(active_hosts), "host_names": active_hosts, "images": len(active_images),
            "image_names": active_images, "clusters": active_cluster}

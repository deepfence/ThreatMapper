import json
from utils.constants import TOPOLOGY_ID_NODE_TYPE_MAP, NODE_TYPE_CONTAINER, NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_HOST, \
    NODE_TYPE_PROCESS, NODE_TYPE_PROCESS_BY_NAME, DF_ID_TO_SCOPE_ID_REDIS_KEY_PREFIX, NODE_TYPE_CONTAINER_BY_NAME, \
    NODE_TYPES, NODE_TYPE_POD, NODE_TYPE_KUBE_CONTROLLER, NODE_TYPE_KUBE_SERVICE, NODE_TYPE_SWARM_SERVICE
from utils.helper import md5_hash


class NodeUtils(object):
    """
    Format scope node details (metadata, children, etc) before sending out to api
    """

    def __init__(self):
        pass

    def get_df_id_from_scope_id(self, scope_id, node_type):
        """
        Generate Df node id from scope id
        node_type is used to differentiate same id in types
        """
        return md5_hash(scope_id + node_type)

    @classmethod
    def get_scope_id_from_df_id(cls, df_id, redis=None):
        if not redis:
            from config.redisconfig import redis
        redis_pipe = redis.pipeline()
        for node_type in NODE_TYPES:
            redis_pipe.hget(DF_ID_TO_SCOPE_ID_REDIS_KEY_PREFIX + node_type.upper(), df_id)
        df_id_to_scope_id_redis_val = redis_pipe.execute()
        for idx in range(len(df_id_to_scope_id_redis_val)):
            if df_id_to_scope_id_redis_val[idx]:
                return df_id_to_scope_id_redis_val[idx], NODE_TYPES[idx]
        return "", ""

    def format_node_detail(self, node_type, node_details, detailed=False):
        return getattr(self, "format_{0}_node_detail".format(node_type))(node_details, detailed)

    def get_scope_metadata_value(self, metadata):
        if metadata.get("dataType", "") == "number":
            return int(metadata["value"])
        return metadata["value"]

    def format_parent_or_children_nodes(self, node_children):
        """
        Get formatted data for children / parents
        """
        children_details = []
        for children_type in node_children:
            node_type = TOPOLOGY_ID_NODE_TYPE_MAP.get(children_type["topologyId"])
            formatted_children_type = {"type": node_type, "nodes": []}
            if "nodes" in children_type:
                """
                {
                  "children": [
                    {
                      "id": "",
                      "label": "Processes",
                      "nodes": [
                        {
                          "id": "ramanan-kub-master-df;7011",
                          "label": "/pause",
                          "labelMinor": "ramanan-kub-master-df (7011)",
                          "metadata": [],
                          "parents": [
                            {
                              "id": "f474f235ae5bea43c0d1af38e9c9ceebe668345e71a4642dbbba2296900cb6a4;<container>",
                              "label": "POD",
                              "topologyId": "containers"
                            }
                          ],
                          "metrics": []
                        }
                      ],
                      "topologyId": "processes",
                      "columns": []
                    }
                  ]
                }
                """
                for node in children_type.get("nodes", []):
                    response = getattr(self, "format_{0}_node_detail".format(node_type))(node, False)
                    if type(response) is tuple:
                        response = response[0]
                    formatted_children_type["nodes"].append(response)
            else:
                """
                {
                  "parents": [
                    {
                      "id": "k8s.gcr.io/pause;<container_image>",
                      "label": "k8s.gcr.io/pause",
                      "topologyId": "containers-by-image"
                    }
                  ]
                }
                """
                formatted_children_type["nodes"].append(
                    {"id": self.get_df_id_from_scope_id(children_type.get("id", ""), node_type),
                     "label": children_type.get("label", "")})
            if formatted_children_type["nodes"]:
                children_details.append(formatted_children_type)
        return children_details

    def format_adjacency(self, adjacency, node_type):
        return [self.get_df_id_from_scope_id(scope_id, node_type) for scope_id in adjacency]

    def format_connections(self, node_connections):
        """
        Get incoming & outgoing connections
        """
        connections = {"outgoing-connections": [], "incoming-connections": []}
        for connection_type in node_connections:
            node_type = TOPOLOGY_ID_NODE_TYPE_MAP.get(connection_type["topologyId"])
            for node in connection_type.get("connections", []):
                response = getattr(self, "format_{0}_node_detail".format(node_type))(node, False)
                if type(response) is tuple:
                    response = response[0]
                connections[connection_type["id"]].append(response)
        if not connections["outgoing-connections"]:
            del connections["outgoing-connections"]
        if not connections["incoming-connections"]:
            del connections["incoming-connections"]
        return connections

    def format_host_node_detail(self, host_details, detailed=False):
        node_probe_id = ""
        node_public_ip = ""
        node_local_networks = []

        formatted_metadata = {}
        host_name = host_details.get("label", "")
        for metadata in host_details.get("metadata", []):
            if metadata["id"] == "publicIpAddress":
                node_public_ip = metadata["value"]
            elif metadata["id"] == "local_networks":
                for nw in metadata["value"].split(','):
                    node_local_networks.append(nw.strip())
                metadata["value"] = list(node_local_networks)
            elif metadata["id"] == "probeId":
                node_probe_id = metadata["value"]
            elif metadata["id"] == "interfaceNames":
                metadata["value"] = metadata["value"].split(";")
            formatted_metadata[metadata["id"]] = self.get_scope_metadata_value(metadata)
        if "probeId" in formatted_metadata:
            del formatted_metadata["probeId"]
        if "openPorts" in formatted_metadata:
            formatted_metadata["openPorts"] = json.loads(formatted_metadata["openPorts"])
        formatted_host_details = formatted_metadata
        formatted_host_details.update({
            "id": self.get_df_id_from_scope_id(host_details["id"], NODE_TYPE_HOST), "host_name": host_name,
            "type": NODE_TYPE_HOST, "pseudo": host_details.get("pseudo", False),
            "meta": host_details.get("labelMinor", "")
        })
        # Following will be in node_details api
        if detailed:
            children = self.format_parent_or_children_nodes(host_details.get("children", []))
            if children:
                formatted_host_details["children"] = children
            parents = self.format_parent_or_children_nodes(host_details.get("parents", []))
            if parents:
                formatted_host_details["parents"] = parents
            connections = self.format_connections(host_details.get("connections", []))
            if connections:
                formatted_host_details["connections"] = connections
            adjacency = self.format_adjacency(host_details.get("adjacency", []), NODE_TYPE_HOST)
            if adjacency:
                formatted_host_details["adjacency"] = adjacency

        return formatted_host_details, node_public_ip, node_local_networks, node_probe_id

    def format_container_node_detail(self, container_details, detailed=False):
        formatted_metadata = {}
        for metadata in container_details.get("metadata", []):
            if metadata["id"] == "docker_container_ips":
                docker_container_ips = set()
                for ip in metadata["value"].split(','):
                    docker_container_ips.add(ip.strip())
                metadata["value"] = list(docker_container_ips)
            formatted_metadata[metadata["id"]] = self.get_scope_metadata_value(metadata)
        image_name = formatted_metadata.get("docker_image_name", "")
        image_name_split = image_name.rsplit(":", 1)
        if "docker_image_name" in formatted_metadata:
            del formatted_metadata["docker_image_name"]
        formatted_container_details = formatted_metadata
        formatted_container_details.update({
            "id": self.get_df_id_from_scope_id(container_details["id"], NODE_TYPE_CONTAINER),
            "container_name": container_details.get("label", ""), "type": NODE_TYPE_CONTAINER,
            "host_name": container_details.get("labelMinor", ""), "image_name": image_name_split[0],
            "pseudo": container_details.get("pseudo", False)
        })
        status_stopped = ["exited", "restarting", "dead", "removing", "created"]
        status_paused = ["paused"]
        status_running = ["up", "running"]
        container_state = ""
        if "docker_container_state_human" in formatted_metadata:
            if any(i in formatted_metadata["docker_container_state_human"].lower() for i in status_stopped):
                container_state = "stopped"
            elif any(i in formatted_metadata["docker_container_state_human"].lower() for i in status_paused):
                container_state = "paused"
            elif any(i in formatted_metadata["docker_container_state_human"].lower() for i in status_running):
                container_state = "running"
        formatted_container_details["docker_container_state"] = container_state
        formatted_container_details["meta"] = formatted_container_details["host_name"]
        image_tag = "latest"
        if len(image_name_split) > 1:
            image_tag = image_name_split[1]
        formatted_container_details["image_tag"] = image_tag
        # Following will be in node_details api
        if detailed:
            children = self.format_parent_or_children_nodes(container_details.get("children", []))
            if children:
                formatted_container_details["children"] = children
            parents = self.format_parent_or_children_nodes(container_details.get("parents", []))
            if parents:
                formatted_container_details["parents"] = parents
            connections = self.format_connections(container_details.get("connections", []))
            if connections:
                formatted_container_details["connections"] = connections
            adjacency = self.format_adjacency(container_details.get("adjacency", []), NODE_TYPE_CONTAINER)
            if adjacency:
                formatted_container_details["adjacency"] = adjacency
        return formatted_container_details

    def format_container_by_name_node_detail(self, image_details, detailed=False):
        formatted_container_by_name_details = {
            "id": self.get_df_id_from_scope_id(image_details["id"], NODE_TYPE_CONTAINER_BY_NAME),
            "type": NODE_TYPE_CONTAINER_BY_NAME, "meta": image_details.get("labelMinor", ""),
            "pseudo": image_details.get("pseudo", False), "name": image_details["id"]
        }
        # Following will be in node_details api
        if detailed:
            children = self.format_parent_or_children_nodes(image_details.get("children", []))
            if children:
                formatted_container_by_name_details["children"] = children
            parents = self.format_parent_or_children_nodes(image_details.get("parents", []))
            if parents:
                formatted_container_by_name_details["parents"] = parents
            connections = self.format_connections(image_details.get("connections", []))
            if connections:
                formatted_container_by_name_details["connections"] = connections
            adjacency = self.format_adjacency(image_details.get("adjacency", []), NODE_TYPE_CONTAINER_BY_NAME)
            if adjacency:
                formatted_container_by_name_details["adjacency"] = adjacency
        return formatted_container_by_name_details

    def format_container_image_node_detail(self, image_details, detailed=False):
        formatted_metadata = {metadata["id"]: self.get_scope_metadata_value(metadata) for metadata in
                              image_details.get("metadata", [])}
        host_name = ""
        for parent in image_details.get("parents", []):
            if parent["topologyId"] == "hosts":
                host_name = parent["label"]
                break
        formatted_container_image_details = formatted_metadata
        formatted_container_image_details.update({
            "id": self.get_df_id_from_scope_id(image_details["id"], NODE_TYPE_CONTAINER_IMAGE),
            "image_name": image_details.get("label", ""), "type": NODE_TYPE_CONTAINER_IMAGE, "host_name": host_name,
            "pseudo": image_details.get("pseudo", False), "meta": image_details.get("labelMinor", "")
        })
        # Following will be in node_details api
        if detailed:
            children = self.format_parent_or_children_nodes(image_details.get("children", []))
            if children:
                formatted_container_image_details["children"] = children
            parents = self.format_parent_or_children_nodes(image_details.get("parents", []))
            if parents:
                formatted_container_image_details["parents"] = children
            connections = self.format_connections(image_details.get("connections", []))
            if connections:
                formatted_container_image_details["connections"] = connections
            adjacency = self.format_adjacency(image_details.get("adjacency", []), NODE_TYPE_CONTAINER_IMAGE)
            if adjacency:
                formatted_container_image_details["adjacency"] = adjacency
        return formatted_container_image_details

    def format_process_node_detail(self, process_details, detailed=False):
        formatted_metadata = {metadata["id"]: self.get_scope_metadata_value(metadata) for metadata in
                              process_details.get("metadata", [])}
        host_name = ""
        for parent in process_details.get("parents", []):
            if parent["topologyId"] == "hosts":
                host_name = parent["label"]
                break
        formatted_process_details = formatted_metadata
        formatted_process_details.update({
            "id": self.get_df_id_from_scope_id(process_details["id"], NODE_TYPE_PROCESS),
            "process": process_details.get("label", ""), "meta": process_details.get("labelMinor", ""),
            "type": NODE_TYPE_PROCESS, "host_name": host_name, "pseudo": process_details.get("pseudo", False)
        })
        # Following will be in node_details api
        if detailed:
            children = self.format_parent_or_children_nodes(process_details.get("children", []))
            if children:
                formatted_process_details["children"] = children
            parents = self.format_parent_or_children_nodes(process_details.get("parents", []))
            if parents:
                formatted_process_details["parents"] = parents
            connections = self.format_connections(process_details.get("connections", []))
            if connections:
                formatted_process_details["connections"] = connections
            adjacency = self.format_adjacency(process_details.get("adjacency", []), NODE_TYPE_PROCESS)
            if adjacency:
                formatted_process_details["adjacency"] = adjacency
        return formatted_process_details

    def format_process_by_name_node_detail(self, process_details, detailed=False):
        formatted_process_name_details = {
            "id": self.get_df_id_from_scope_id(process_details["id"], NODE_TYPE_PROCESS_BY_NAME),
            "type": NODE_TYPE_PROCESS_BY_NAME, "meta": process_details.get("labelMinor", ""),
            "pseudo": process_details.get("pseudo", False), "process": process_details["id"]
        }
        # Following will be in node_details api
        if detailed:
            children = self.format_parent_or_children_nodes(process_details.get("children", []))
            if children:
                formatted_process_name_details["children"] = children
            parents = self.format_parent_or_children_nodes(process_details.get("parents", []))
            if parents:
                formatted_process_name_details["parents"] = parents
            connections = self.format_connections(process_details.get("connections", []))
            if connections:
                formatted_process_name_details["connections"] = connections
            adjacency = self.format_adjacency(process_details.get("adjacency", []), NODE_TYPE_PROCESS_BY_NAME)
            if adjacency:
                formatted_process_name_details["adjacency"] = adjacency
        return formatted_process_name_details

    def format_pods_node_detail(self, pod_details, detailed=False):
        formatted_metadata = {}
        for metadata in pod_details.get("metadata", []):
            formatted_metadata[metadata["id"]] = self.get_scope_metadata_value(metadata)
        formatted_pod_details = formatted_metadata
        formatted_pod_details.update({
            "id": self.get_df_id_from_scope_id(pod_details["id"], NODE_TYPE_POD), "type": NODE_TYPE_POD,
            "name": pod_details.get("label", ""), "pseudo": pod_details.get("pseudo", False),
            "meta": pod_details.get("labelMinor", "")
        })
        host_name = ""
        parent_nodes = self.format_parent_or_children_nodes(pod_details.get("parents", []))
        for parent_node in parent_nodes:
            if parent_node["type"] == NODE_TYPE_HOST and parent_node["nodes"]:
                host_name = parent_node["nodes"][0]["label"]
                break
        formatted_pod_details["host_name"] = host_name
        # Following will be in node_details api
        if detailed:
            children_nodes = self.format_parent_or_children_nodes(pod_details.get("children", []))
            if children_nodes:
                formatted_pod_details["children"] = children_nodes
            if parent_nodes:
                formatted_pod_details["parents"] = parent_nodes
            connections = self.format_connections(pod_details.get("connections", []))
            if connections:
                formatted_pod_details["connections"] = connections
            adjacency = self.format_adjacency(pod_details.get("adjacency", []), NODE_TYPE_POD)
            if adjacency:
                formatted_pod_details["adjacency"] = adjacency
        return formatted_pod_details

    def format_kube_controller_node_detail(self, kube_ctrl_details, detailed=False):
        formatted_metadata = {}
        for metadata in kube_ctrl_details.get("metadata", []):
            formatted_metadata[metadata["id"]] = self.get_scope_metadata_value(metadata)
        formatted_kube_ctrl_details = formatted_metadata
        formatted_kube_ctrl_details.update({
            "id": self.get_df_id_from_scope_id(kube_ctrl_details["id"], NODE_TYPE_KUBE_CONTROLLER),
            "type": NODE_TYPE_KUBE_CONTROLLER, "meta": kube_ctrl_details.get("labelMinor", ""),
            "name": kube_ctrl_details.get("label", ""), "pseudo": kube_ctrl_details.get("pseudo", False)
        })
        # Following will be in node_details api
        if detailed:
            children_nodes = self.format_parent_or_children_nodes(kube_ctrl_details.get("children", []))
            if children_nodes:
                formatted_kube_ctrl_details["children"] = children_nodes
            parent_nodes = self.format_parent_or_children_nodes(kube_ctrl_details.get("parents", []))
            if parent_nodes:
                formatted_kube_ctrl_details["parents"] = parent_nodes
            connections = self.format_connections(kube_ctrl_details.get("connections", []))
            if connections:
                formatted_kube_ctrl_details["connections"] = connections
            adjacency = self.format_adjacency(kube_ctrl_details.get("adjacency", []), NODE_TYPE_KUBE_CONTROLLER)
            if adjacency:
                formatted_kube_ctrl_details["adjacency"] = adjacency
        return formatted_kube_ctrl_details

    def format_kube_service_node_detail(self, kube_serv_details, detailed=False):
        formatted_metadata = {}
        for metadata in kube_serv_details.get("metadata", []):
            formatted_metadata[metadata["id"]] = self.get_scope_metadata_value(metadata)
        formatted_kube_serv_details = formatted_metadata
        formatted_kube_serv_details.update({
            "id": self.get_df_id_from_scope_id(kube_serv_details["id"], NODE_TYPE_KUBE_SERVICE),
            "type": NODE_TYPE_KUBE_SERVICE, "meta": kube_serv_details.get("labelMinor", ""),
            "name": kube_serv_details.get("label", ""), "pseudo": kube_serv_details.get("pseudo", False)
        })
        # Following will be in node_details api
        if detailed:
            children_nodes = self.format_parent_or_children_nodes(kube_serv_details.get("children", []))
            if children_nodes:
                formatted_kube_serv_details["children"] = children_nodes
            parent_nodes = self.format_parent_or_children_nodes(kube_serv_details.get("parents", []))
            if parent_nodes:
                formatted_kube_serv_details["parents"] = parent_nodes
            connections = self.format_connections(kube_serv_details.get("connections", []))
            if connections:
                formatted_kube_serv_details["connections"] = connections
            adjacency = self.format_adjacency(kube_serv_details.get("adjacency", []), NODE_TYPE_KUBE_SERVICE)
            if adjacency:
                formatted_kube_serv_details["adjacency"] = adjacency
        return formatted_kube_serv_details

    def format_swarm_service_node_detail(self, swarm_service_details, detailed=False):
        formatted_metadata = {}
        for metadata in swarm_service_details.get("metadata", []):
            formatted_metadata[metadata["id"]] = self.get_scope_metadata_value(metadata)
        formatted_swarm_serv_details = formatted_metadata
        formatted_swarm_serv_details.update({
            "id": self.get_df_id_from_scope_id(swarm_service_details["id"], NODE_TYPE_SWARM_SERVICE),
            "type": NODE_TYPE_SWARM_SERVICE, "meta": swarm_service_details.get("labelMinor", ""),
            "name": swarm_service_details.get("label", ""), "pseudo": swarm_service_details.get("pseudo", False)
        })
        # Following will be in node_details api
        if detailed:
            children_nodes = self.format_parent_or_children_nodes(swarm_service_details.get("children", []))
            if children_nodes:
                formatted_swarm_serv_details["children"] = children_nodes
            parent_nodes = self.format_parent_or_children_nodes(swarm_service_details.get("parents", []))
            if parent_nodes:
                formatted_swarm_serv_details["parents"] = parent_nodes
            connections = self.format_connections(swarm_service_details.get("connections", []))
            if connections:
                formatted_swarm_serv_details["connections"] = connections
            adjacency = self.format_adjacency(swarm_service_details.get("adjacency", []), NODE_TYPE_SWARM_SERVICE)
            if adjacency:
                formatted_swarm_serv_details["adjacency"] = adjacency
        return formatted_swarm_serv_details

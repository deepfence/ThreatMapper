import re
import json
from utils.constants import NODE_TYPE_CONTAINER, NODE_TYPE_HOST, NODE_TYPE_CONTAINER_BY_NAME, \
    TOPOLOGY_ID_PROCESS_BY_NAME, NODE_TYPE_CONTAINER_IMAGE, TOPOLOGY_ID_POD, NODE_TYPE_POD, SCOPE_BASE_URL, \
    TOPOLOGY_ID_PROCESS, TOPOLOGY_ID_HOST, NODE_TYPE_KUBE_SERVICE
from utils.helper import websocketio_channel_name_format
from netaddr import IPNetwork, IPAddress
from utils.helper import call_scope_get_api


def get_hosts_from_k8s_cluster_id(kube_cluster_id, topology_data_hosts):
    cluster_hosts = []
    if kube_cluster_id:
        from resource_models.node import Node
        for node_id, node in topology_data_hosts.items():
            if node.get("kubernetes_cluster_id", "") == kube_cluster_id:
                try:
                    cluster_hosts.append(Node(node["id"], topology_data_df_format=topology_data_hosts))
                except:
                    pass
    return cluster_hosts


def fetch_topology_data(node_type, format="scope"):
    from config.redisconfig import redis
    topology_data = redis.get(websocketio_channel_name_format(node_type + "?format=" + format)[1])
    # "&stopped=running&pseudo=hide")[1])
    if topology_data:
        return json.loads(topology_data)
    return {}


def fetch_topology_hosts():
    return fetch_topology_data(NODE_TYPE_HOST)


def fetch_topology_container_images():
    return fetch_topology_data(NODE_TYPE_CONTAINER_IMAGE)


def fetch_topology_processes():
    process_url = "{0}/topology-api/topology/{1}".format(SCOPE_BASE_URL, TOPOLOGY_ID_PROCESS)
    try:
        status, resp, status_code = call_scope_get_api(process_url)
        resp = json.loads(resp)
        if not resp:
            resp = {}
        return resp.get("nodes", {})
    except:
        return {}


def fetch_topology_process_name():
    process_url = "{0}/topology-api/topology/{1}".format(SCOPE_BASE_URL, TOPOLOGY_ID_PROCESS_BY_NAME)
    try:
        status, resp, status_code = call_scope_get_api(process_url)
        resp = json.loads(resp)
        if not resp:
            resp = {}
        return resp.get("nodes", {})
    except:
        return {}


def fetch_topology_containers():
    return fetch_topology_data(NODE_TYPE_CONTAINER)


def fetch_topology_container_by_name():
    return fetch_topology_data(NODE_TYPE_CONTAINER_BY_NAME)


def get_topology_ip_addresses():
    from config.redisconfig import redis

    public_ips = redis.get('TOPOLOGY_PUBLIC_IP_ADDR')
    local_networks = redis.get('TOPOLOGY_LOCAL_NETWORKS')
    local_networks_k8s = redis.get('TOPOLOGY_LOCAL_NETWORKS_K8S')
    local_services_k8s = redis.get('TOPOLOGY_LOCAL_SERVICES_K8S')
    if public_ips:
        public_ips = json.loads(public_ips)
    if not public_ips:
        public_ips = []
    if local_networks:
        local_networks = json.loads(local_networks)
    if not local_networks:
        local_networks = []
    if local_networks_k8s:
        local_networks_k8s = json.loads(local_networks_k8s)
    if not local_networks_k8s:
        local_networks_k8s = []
    if local_services_k8s:
        local_services_k8s = json.loads(local_services_k8s)
    if not local_services_k8s:
        local_services_k8s = []
    return public_ips, local_networks, local_networks_k8s, local_services_k8s


def check_if_ip_addr_is_internal(ip_addr, public_ips, local_networks, local_networks_k8s, local_services_k8s):
    # Check if given ip address is internal to customer
    if public_ips and ip_addr in public_ips:
        return True
    if local_networks_k8s and ip_addr in local_networks_k8s:
        return True
    if local_services_k8s and ip_addr in local_services_k8s:
        return True
    if ip_addr == "localhost":
        return True
    for local_network in local_networks:
        try:
            network = IPNetwork(local_network)
            address = IPAddress(ip_addr)
            if address in network:
                return True
        except:
            continue
    return False


def _parse_host(id):
    """
    This helper function parses the host from `id` in scope nodes.

    Returns the host name if it is a host, else return None.
    """
    host_name = None
    r = re.match(r"^(.*);<host>$", id)

    if r:
        host_name = r.group(1)

    return host_name


def _parse_local_networks(local_networks):
    parsed_local_networks = []

    for local_network in local_networks:
        parsed_local_network = local_network.split("/")[0]
        parsed_local_network = parsed_local_network.strip()
        parsed_local_networks.append(parsed_local_network)
    return parsed_local_networks


def get_hosts_info():
    """
    This function fetches topology hosts and parses them to the required format.

    ```
    {
        "hosts": [
            {
                "host": "ip-172-31-54-203",
                "os": "windows",
                "public_ip_address": "54.89.23.249",
                "local_networks": ["172.19.0.1", "172.31.51.22"],
                "interface_ips": {"172.19.0.1":"255.255.255.0", "172.31.51.22":"255.255.255.0"},
                "cloud_metadata": {}
            }
        ]
    }
    ```
    """
    response = {
        "hosts": []
    }

    scope_hosts_response = fetch_topology_hosts()
    for node_id, node in scope_hosts_response.items():
        if not node.get("id"):
            continue
        host = _parse_host(node["id"])
        public_ip_address = ""
        local_networks = []
        interface_ips = {}  # list of all interface ips, along with subnet masks
        probe_id = ""
        cloud_metadata = {}
        os_type = ""
        kubernetes_cluster_name = ""

        for meta in node.get("metadata", []):
            if not meta.get("value"):
                continue
            if meta.get("id") == "local_networks":
                local_networks = meta.get("value").split(",")
            elif meta.get("id") == 'kubernetes_cluster_name':
                kubernetes_cluster_name = meta.get("value", "")
            elif meta.get("id") == "probeId":
                probe_id = meta.get("value")
            elif meta.get("id") == "interface_ips":
                try:
                    interface_ips = json.loads(meta.get("value"))
                except:
                    pass
            elif meta.get("id") == "cloud_metadata":
                try:
                    cloud_metadata = json.loads(meta.get("value"))
                except:
                    pass
            elif meta.get("id") == "os":
                os_type = meta.get("value")

        if not host:
            """
            This mostly happens when the node is either in-theinternet or out-theinternet.
            """
            continue
        if cloud_metadata:
            public_ip_address = cloud_metadata.get("public_ip", None)

        response["hosts"].append({
            "hostname": host,
            "public_ip_address": public_ip_address,
            "local_networks": _parse_local_networks(local_networks),
            "probe_id": probe_id,
            "interface_ips": interface_ips,
            "cloud_metadata": cloud_metadata,
            "os": os_type,
            "kubernetes_cluster_name": kubernetes_cluster_name
        })

    return response


def _parse_inbound_ports(ports):
    """
    For ports, only inbound are taken since `destination_port` in elasticsearch doc is always inbound.
    """
    parsed_ports = []

    for port in ports:
        # 172.18.0.1:9200->9200/tcp
        #             ^
        #            port
        m1 = re.match(r"^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}:([0-9]+)->(.*)\/tcp$", port)

        # 9200/tcp
        m2 = re.match(r"^([0-9]*)\/tcp$", port)

        parsed_port = None
        if m1:
            parsed_port = m1.group(1)
        elif m2:
            parsed_port = m2.group(1)

        # If we are unable to parse, we ignore it to be on the safer side.
        if parsed_port:
            try:
                # Convert port string to integer.
                parsed_port = int(parsed_port)
            except ValueError:
                pass
            parsed_ports.append(parsed_port)

    return parsed_ports


def _parse_container_id(container_id):
    """
    Helper function to parse container_id from scope response.
    """
    parsed_container_id = None
    r = re.match(r"^(.*);<container>$", container_id)

    if r:
        parsed_container_id = r.group(1)

    return parsed_container_id


def _parse_pod_id(pod_id):
    """
    Helper function to parse pod_id from scope responses.
    """
    parsed_pod_id = None
    r = re.match(r"^(.*);<pod>$", pod_id)
    if r:
        parsed_pod_id = r.group(1)
    return parsed_pod_id


def get_pods_info():
    """
    {
        "dev-1": {
            "pods": [
                {
                    "host": "ip-172-31-54-203",
                    "pod_name": "df-pod",
                    "ips": [],
                    "pod_id": ""
                }
            ]
        }
    }
    """
    response = {}
    pods_topology = fetch_topology_data(NODE_TYPE_POD)
    for pod_id, pod_detail in pods_topology.items():
        if pod_detail.get("pseudo", False):
            continue
        pod_name = pod_detail.get("label", "")
        if not pod_name:
            continue
        host = ""
        pod_ip = ""
        kubernetes_cluster_name = ""
        for parent in pod_detail.get("parents", []):
            if parent["topologyId"] == TOPOLOGY_ID_HOST:
                host = parent["label"]
                break
        if not host:
            continue
        host_network = False
        for metadata in pod_detail.get("metadata", []):
            if not metadata.get("value"):
                continue
            if metadata.get("id", "") == "kubernetes_ip":
                pod_ip = metadata.get("value", "")
            elif metadata.get("id", "") == "kubernetes_cluster_name":
                kubernetes_cluster_name = metadata.get("value", "")
            elif metadata.get("id", "") == "kubernetes_is_in_host_network":
                if metadata.get("value") == "true":
                    host_network = True
        if host_network:
            pod_ip = ""
        pod_info = {
            "host": host,
            "pod_name": pod_name,
            "pod_id": pod_id,
            "pod_ip": pod_ip,
            "kubernetes_cluster_name": kubernetes_cluster_name
        }
        if host in response:
            response[host]["pods"].append(pod_info)
        else:
            response[host] = {"pods": [pod_info]}
    return response


def get_containers_info():
    """
    This function fetches topology containers and parses them to the required format.

    ```
    {
        "dev-1": {
            "containers": [
                {
                    "container_name": "container1",
                    "host": "ip-172-31-54-203",
                    "ips": ["54.89.23.249"],
                    "ports": ["9200", "9300"],
                    "pod_name": "df-pod"
                    "pod_id":
                }
            ]
        }
    }
    ```
    """
    response = {}
    pods_topology = fetch_topology_data(NODE_TYPE_POD)
    scope_containers_response = fetch_topology_data(NODE_TYPE_CONTAINER)
    for node_id, node in scope_containers_response.items():
        if node.get("pseudo", False):
            continue
        if node.get("docker_container_state") != "running":
            continue
        node_metadata = node.get("metadata", [])
        container_name = node.get("label")
        container_id = _parse_container_id(node.get("id"))
        host = node.get("labelMinor")
        kubernetes_cluster_name = ""
        ips = []
        ports = []
        for meta in node_metadata:
            if meta.get("id") == "docker_container_ips" and meta.get("value"):
                ips = meta.get("value").split(",")
                ips = [ip.strip() for ip in ips]
            if meta.get("id") == "docker_container_ports" and meta.get("value"):
                ports = meta.get("value").split(",")
            if meta.get("id") == "kubernetes_cluster_name":
                kubernetes_cluster_name = meta.get("value", "")
        pod_name = ""
        pod_id = ""
        
        for parent in node.get("parents", []):
            if parent["topologyId"] == TOPOLOGY_ID_POD:
                pod_id = parent["id"]
                break
        if pod_id and pod_id in pods_topology:
            pod_name = pods_topology[pod_id].get("label", "")
        if container_id and container_name:
            container_info = {
                "container_id": container_id,
                "container_name": container_name,
                "host": host,
                "pod_name": pod_name,
                "pod_id": pod_id,
                "ips": list(filter(lambda ip: ip != "127.0.0.1", ips)),
                "ports": _parse_inbound_ports(ports),
                "kubernetes_cluster_name": kubernetes_cluster_name
            }
            if host in response:
                response[host]["containers"].append(container_info)
            else:
                response[host] = {"containers": [container_info]}

    return response


def get_kub_services_info():
    """
    This function fetches topology kube services and parses them to the required format.
    Probe ids refer to the probe ids corresponding to the nodes where all other pods of
    the service are running.
    ```
    {
      "kube_services": [
        {
          "service": "deepfence_echo_server",
          "internal_ip": "10.64.0.228",
          "type": "ClusterIP",
          "ports": "8080/TCP",
          "probe_ids": ["abcd","efgh","ijkl"]    #tbainv2
        }
      ]
    }
    ```
    """
    response = {
        "kube_services": []
    }
    kube_services_topology = fetch_topology_data(NODE_TYPE_KUBE_SERVICE)
    for kube_service_id, kube_service_detail in kube_services_topology.items():
        if kube_service_detail.get("pseudo", False):
            continue
        kube_service_name = kube_service_detail.get("label", "")
        if not kube_service_name:
            continue
        internal_ip = ""
        service_type = ""
        ports = ""
        for metadata in kube_service_detail.get("metadata", []):
            if not metadata.get("value"):
                continue
            if metadata.get("id", "") == "kubernetes_ip":
                internal_ip = metadata.get("value", "")
            elif metadata.get("id", "") == "kubernetes_type":
                service_type = metadata.get("value", "")
            elif metadata.get("id", "") == "kubernetes_ports":
                ports = metadata.get("value", "")
        kube_service_info = {
            "service": kube_service_name,
            "internal_ip": internal_ip,
            "type": service_type,
            "ports": ports,
        }
        response["kube_services"].append(kube_service_info)
    return response


def topology_meta_filter(topology_data, meta_label, meta_value, comparator=None):
    filtered_topology = {}
    if not topology_data or not meta_value:
        return filtered_topology

    for node_id, node_details in topology_data.items():
        if node_details.get("pseudo", False):
            continue
        metadata = node_details.get("metadata")
        if metadata:
            metadata_index = {meta.get("id"): meta.get("value") for meta in metadata}
            stored_meta_value = metadata_index.get(meta_label)
            compare_result = False
            if comparator:
                compare_result = comparator(meta_value, stored_meta_value)
            else:
                compare_result = (stored_meta_value and stored_meta_value == meta_value)
            if compare_result:
                filtered_topology.update({
                    node_id: node_details
                })

    return filtered_topology


def topology_table_filter(topology_data, table_id, row_id, value, comparator=None):
    filtered_topology = {}
    if not topology_data or not value:
        return filtered_topology

    for node_id, node_details in topology_data.items():
        tables = node_details.get("tables")
        if tables:
            table_index = {table.get("id"): table.get("rows", []) for table in tables}
            rows = table_index.get(table_id, [])
            row_index = {row.get("id"): row.get("entries", {}).get("value") for row in rows}
            stored_value = row_index.get(row_id)
            if comparator:
                compare_result = comparator(value, stored_value)
            else:
                compare_result = (stored_value and stored_value == value)
            if compare_result:
                filtered_topology.update({
                    node_id: node_details
                })

    return filtered_topology

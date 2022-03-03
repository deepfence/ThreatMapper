import json

import requests

from config.redisconfig import redis
from utils.cloud_discovery import CloudDiscovery
from cloud_detect import provider as detect_provider
from utils.constants import CLOUD_AZURE, CLOUD_GCP, CLOUD_AWS, CLOUD_OBJECT_STORAGE, CLOUD_LB, CLOUD_DB, \
    SCOPE_TOPOLOGY_COUNT, CLOUD_SERVERLESS, CLOUD_USER
import arrow
import threading
import select
from datetime import timedelta

cloud_report_key = "cloud_scope_report"


def fetch_vm_resources(cloud_discovery, cloud_provider):
    cloud_data = []
    try:
        cloud_data = cloud_discovery.list_vms()
    except:
        return
    if not cloud_data:
        return
    probe_version = "1.3.0"
    probe_report = {
        "Host": {
            "shape": "circle", "label": "host", "label_plural": "hosts", "nodes": {}, "controls": {},
            "metadata_templates": {
                "version": {"id": "version", "label": "Sensor Version", "priority": 27.0, "from": "latest"},
                "kubernetes_cluster_name": {"id": "kubernetes_cluster_name", "label": "Kubernetes Cluster Name",
                                            "priority": 25.0, "from": "latest"},
                "interfaceNames": {"id": "interfaceNames", "label": "Interface Names", "priority": 15.0,
                                   "from": "latest"},
                "interface_ips": {"id": "interface_ips", "label": "All Interface IP's", "priority": 21.0,
                                  "from": "latest"},
                "os": {"id": "os", "label": "OS", "priority": 12.0, "from": "latest"},
                "local_networks": {"id": "local_networks", "label": "Local Networks", "priority": 13.0, "from": "sets"},
                "uptime": {"id": "uptime", "label": "Uptime", "dataType": "duration", "priority": 2.0,
                           "from": "latest"},
                "cloud_metadata": {"id": "cloud_metadata", "label": "Cloud Metadata", "priority": 23.0,
                                   "from": "latest"},
                "probeId": {"id": "probeId", "label": "Probe ID", "priority": 17.0, "from": "latest"},
                "openPorts": {"id": "openPorts", "label": "Open Ports", "priority": 19.0, "from": "latest"},
                "cloud_provider": {"id": "cloud_provider", "label": "Cloud Provider", "priority": 22.0,
                                   "from": "latest"},
                "is_ui_vm": {"id": "is_ui_vm", "label": "UI vm", "priority": 28.0, "from": "latest"},
                "kubernetes_cluster_id": {"id": "kubernetes_cluster_id", "label": "Kubernetes Cluster Id",
                                          "priority": 24.0, "from": "latest"},
                "kernel_version": {"id": "kernel_version", "label": "Kernel Version", "priority": 1.0,
                                   "from": "latest"},
                "host_name": {"id": "host_name", "label": "Hostname", "priority": 11.0, "from": "latest"},
                "user_defined_tags": {"id": "user_defined_tags", "label": "User Defined Tags", "priority": 26.0,
                                      "from": "latest"},
                "cloud_tags": {"id": "cloud_tags", "label": "Cloud Tags", "priority": 32.0, "from": "latest"},
                "agent_running": {"id": "agent_running", "label": "Sensor", "priority": 33.0, "from": "latest"},
            },
            "metric_templates": {}
        }
    }
    for vm_data in cloud_data:
        time_now = arrow.utcnow()
        timestamp = time_now.strftime("%Y-%m-%dT%H:%M:%S.%f00Z")
        # We will let agent's report metadata take precedence
        old_timestamp = time_now.shift(seconds=-30).strftime("%Y-%m-%dT%H:%M:%S.%f00Z")
        local_networks = []
        scope_id = ""
        host_name = ""
        cloud_tags = []
        cloud_metadata = {}
        if cloud_provider == CLOUD_AWS:
            host_name = vm_data["private_dns_name"].replace(".ec2.internal", "")
            cloud_metadata = {
                "cloud_provider": cloud_provider, "instance_id": vm_data["instance_id"], "public_ip": [],
                "private_ip": [], "instance_type": vm_data["instance_type"], "hostname": host_name,
                "name": vm_data["private_dns_name"], "availability_zone": vm_data["placement_availability_zone"],
                "running_status": vm_data["instance_state"]
            }
            scope_id = host_name + ";\u003chost\u003e"
            if vm_data.get("private_ip_address"):
                local_networks.append(vm_data["private_ip_address"] + "/32")
                cloud_metadata["private_ip"].append(vm_data["private_ip_address"])
            if vm_data.get("public_ip_address"):
                cloud_metadata["public_ip"].append(vm_data["public_ip_address"])
            cloud_tags = [i["Key"] + ":" + i["Value"] for i in vm_data.get("tags_src", [])]
        elif cloud_provider == CLOUD_GCP:
            host_name = vm_data["name"]
            cloud_metadata = {
                "cloud_provider": cloud_provider, "instance_id": str(vm_data["id"]), "public_ip": [], "private_ip": [],
                "machine_type": vm_data["machine_type_name"], "hostname": host_name, "name": host_name,
                "zone": vm_data["zone_name"], "running_status": vm_data["status"]
            }
            scope_id = host_name + ";\u003chost\u003e"
            for nw_interface in vm_data["network_interfaces"]:
                cloud_metadata["private_ip"].append(nw_interface["networkIP"])
                for access_config in nw_interface.get("accessConfigs", []):
                    if "External" in access_config["name"] and "natIP" in access_config:
                        cloud_metadata["public_ip"].append(access_config["natIP"])
            cloud_tags = [i["key"] + ":" + i["value"] for i in vm_data.get("metadata", {}).get("items", [])]
        elif cloud_provider == CLOUD_AZURE:
            host_name = vm_data["name"]
            cloud_metadata = {
                "cloud_provider": cloud_provider, "vm_id": vm_data["vm_id"], "public_ip": vm_data["public_ips"],
                "private_ip": vm_data["private_ips"], "vm_size": vm_data["size"], "name": vm_data["name"],
                "location": vm_data["region"], "sku": vm_data["image_sku"], "os_type": vm_data["os_type"],
                "resource_group_name": vm_data["resource_group"], "running_status": vm_data["power_state"]
            }
            scope_id = host_name + ";\u003chost\u003e"
            if vm_data.get("tags", {}) is not None:
                cloud_tags = [k + ":" + v for k, v in vm_data.get("tags", {}).items()]
        vm_report = {
            "id": scope_id, "topology": "host", "counters": None,
            "sets": {"local_networks": local_networks}, "latestControls": {},
            "latest": {
                "cloud_metadata": {"timestamp": timestamp, "value": json.dumps(cloud_metadata)},
                "cloud_provider": {"timestamp": timestamp, "value": cloud_provider},
                "control_probe_id": {"timestamp": old_timestamp, "value": ""},
                "host_name": {"timestamp": timestamp, "value": host_name},
                "host_node_id": {"timestamp": timestamp, "value": scope_id},
                "interfaceNames": {"timestamp": old_timestamp, "value": ""},
                "interface_ips": {"timestamp": old_timestamp, "value": "{}"},
                "is_ui_vm": {"timestamp": old_timestamp, "value": "false"},
                "kernel_version": {"timestamp": old_timestamp, "value": ""},
                "kubernetes_cluster_id": {"timestamp": old_timestamp, "value": ""},
                "kubernetes_cluster_name": {"timestamp": old_timestamp, "value": ""},
                "openPorts": {"timestamp": old_timestamp, "value": "{\"inbound\":[],\"outbound\":[]}"},
                "os": {"timestamp": old_timestamp, "value": ""},
                "probeId": {"timestamp": old_timestamp, "value": ""},
                "ts": {"timestamp": timestamp, "value": timestamp},
                "uptime": {"timestamp": timestamp, "value": "1620303"},
                "user_defined_tags": {"timestamp": old_timestamp, "value": ""},
                "cloud_tags": {"timestamp": old_timestamp, "value": ",".join(cloud_tags)},
                "version": {"timestamp": old_timestamp, "value": probe_version},
                "agent_running": {"timestamp": old_timestamp, "value": "no"},
            },
            "metrics": {}, "parents": {}, "children": []
        }
        probe_report["Host"]["nodes"][scope_id] = vm_report
    redis.setex(cloud_report_key, timedelta(minutes=35), json.dumps(probe_report))


def send_cloud_report():
    while True:
        _, _, _ = select.select([], [], [], 5)
        cloud_report = redis.get(cloud_report_key)
        if not cloud_report:
            continue
        requests.post("http://deepfence-topology:8004/topology-api/report", data=cloud_report,
                      headers={"Content-type": "application/json"})


def fetch_cloud_resources():
    cloud_provider = detect_provider()
    if not cloud_provider:
        return
    if cloud_provider not in [CLOUD_AWS, CLOUD_AZURE, CLOUD_GCP]:
        return
    try:
        cloud_discovery = CloudDiscovery(cloud_provider=cloud_provider)
    except:
        return
    while True:
        fetch_vm_resources(cloud_discovery, cloud_provider)
        get_non_vm_resource(cloud_discovery, CLOUD_OBJECT_STORAGE)
        get_non_vm_resource(cloud_discovery, CLOUD_LB)
        get_non_vm_resource(cloud_discovery, CLOUD_DB)
        get_non_vm_resource(cloud_discovery, CLOUD_SERVERLESS)
        get_non_vm_resource(cloud_discovery, CLOUD_USER)
        _, _, _ = select.select([], [], [], 1800)


def get_non_vm_resource(cloud_discovery, node_type):
    cloud_data = {}
    try:
        cloud_data = cloud_discovery.list_nodes(node_type=node_type)
    except:
        return
    if not cloud_data:
        return
    topology_count = {}
    for resource_type, resources in cloud_data.items():
        if resources:
            if topology_count.get(node_type, None):
                topology_count[node_type] = topology_count[node_type] + len(resources)
            else:
                topology_count[node_type] = len(resources)
    if topology_count:
        redis.hset(SCOPE_TOPOLOGY_COUNT, mapping=topology_count)


if __name__ == '__main__':
    t1 = threading.Thread(target=fetch_cloud_resources)
    t2 = threading.Thread(target=send_cloud_report)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

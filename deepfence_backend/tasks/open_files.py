from config.app import celery_app, app
from utils.constants import OPEN_FILES_CACHE_KEY, OPEN_FILES_CACHE_EXPIRY_TIME, CVE_INDEX
import json
from utils.scope import fetch_topology_processes
import os
from config.redisconfig import redis
from utils.esconn import ESConn


SEVERITY_RANK = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
    "info": 4,
    "unknown": 5
}


@celery_app.task
def list_all_open_files():
    with app.app_context():
        topology_processes = fetch_topology_processes()
        open_files_list = {}
        for process_id, process_data in topology_processes.items():
            open_files_metadata = next((item for item in process_data.get("metadata", []) if item["id"] == "OpenFiles"),
                                       {})
            pid_metadata = next((item for item in process_data.get("metadata", []) if item["id"] == "pid"), {})
            if open_files_metadata:
                process_container_data = next(
                    (item for item in process_data.get("parents", []) if item["topologyId"] == "containers"), {})
                process_host_data = next(
                    (item for item in process_data.get("parents", []) if item["topologyId"] == "hosts"), {})
                process_file_list = open_files_metadata["value"].split(",")
                for process_open_file in process_file_list:
                    if open_files_list.get(process_open_file, None):
                        process_open_file_details = open_files_list[process_open_file]
                        host_details = next((item for item in process_open_file_details["hosts"] if
                                             item["host_name"] == process_host_data["label"]), [])
                        if host_details:
                            # host_details = process_open_file_details["hosts"][process_host_data["label"]]
                            if process_container_data:
                                host_details["processes"].append({
                                    "process_name": process_data["label"],
                                    "pid": pid_metadata["value"],
                                    "type": "container",
                                    "container_name": process_container_data["label"]
                                })
                            else:
                                host_details["processes"].append({
                                    "process_name": process_data["label"],
                                    "pid": pid_metadata["value"],
                                    "type": "host",
                                    "container_name": ""
                                })
                        else:
                            if process_container_data:
                                process_open_file_details["hosts"].append({
                                    "host_name": process_host_data["label"],
                                    "processes": [{
                                        "process_name": process_data["label"],
                                        "pid": pid_metadata["value"],
                                        "type": "container",
                                        "container_name": process_container_data["label"]
                                    }]
                                })
                            else:
                                process_open_file_details["hosts"].append({
                                    "host_name": process_host_data["label"],
                                    "processes": [{
                                        "process_name": process_data["label"],
                                        "pid": pid_metadata["value"],
                                        "type": "host",
                                        "container_name": ""
                                    }]
                                })
                    else:
                        path, package = os.path.split(process_open_file)
                        if process_open_file == "":
                            continue
                        process_info = {
                            "process_name": process_data["label"],
                            "pid": pid_metadata["value"],
                            "type": "host",
                            "container_name": ""
                        }
                        if process_container_data:
                            process_info["type"] = "container"
                            process_info["container_name"] = process_container_data["label"]
                        file_data = {
                            "package": package,
                            "filepath": process_open_file,
                            "vulnerability_status": "Unknown",
                            "hosts": [{
                                "host_name": process_host_data["label"],
                                "processes": [process_info]
                            }]
                        }
                        open_files_list[process_open_file] = file_data
        set_vulnerability_status_for_packages(open_files_list)
        redis.setex(OPEN_FILES_CACHE_KEY, OPEN_FILES_CACHE_EXPIRY_TIME, json.dumps(open_files_list))


def set_vulnerability_status_for_packages(open_files_list):
    file_severity_map = {}
    package_queries = []
    for open_file_name, open_files in open_files_list.items():
        package_subqueries = [{
            "wildcard": {
                "cve_caused_by_package_path.keyword": "*{}*".format(open_files["package"])
            }
        }]
        container_names = set()
        host_names = []
        for file_host_detail in open_files["hosts"]:
            host_names.append(file_host_detail["host_name"])
            container_names.update({process_detail["container_name"] for process_detail in file_host_detail["processes"]})
        package_subqueries.append({
            "terms": {
                "host_name.keyword": host_names
            }
        })
        package_subqueries.append({
            "terms": {
                "cve_container_name.keyword": list(container_names)
            }
        })
        package_queries.append({
            "bool": {
                "must": package_subqueries,
                "_name": open_file_name
            }
        })

    query = {
        "query": {
            "bool": {
                "should": package_queries
            }
        }
    }
    cve_es_list = ESConn.search(CVE_INDEX, query, 0, 49999)
    cve_hits = []
    if cve_es_list.get('hits', {}).get('total', {}).get('value', 0) != 0:
        cve_hits = cve_es_list['hits']['hits']
    for cve_hit in cve_hits:
        new_severity = cve_hit["_source"]["cve_severity"]
        for open_file_name in cve_hit["matched_queries"]:
            if file_severity_map.get(open_file_name, None):
                existing_severity = file_severity_map[open_file_name]
                if SEVERITY_RANK[existing_severity] > SEVERITY_RANK[new_severity]:
                    file_severity_map[open_file_name] = new_severity
            else:
                file_severity_map[open_file_name] = new_severity
    for open_file_name, open_files in open_files_list.items():
        if file_severity_map.get(open_file_name):
            open_files_list[open_file_name]["vulnerability_status"] = file_severity_map[open_file_name]


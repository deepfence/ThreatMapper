from utils.constants import NODE_TYPE_CONTAINER, NODE_TYPE_PROCESS_BY_NAME, NODE_TYPE_PROCESS, NODE_TYPE_KUBE_SERVICE, \
    NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_CONTAINER_BY_NAME, NODE_TYPE_HOST, NODE_TYPE_POD, NODE_TYPE_KUBE_CONTROLLER, \
    SCOPE_NODE_DETAIL_API_URL, TOPOLOGY_HOSTS_PROBE_MAP_REDIS_KEY, \
    SCOPE_POD_API_CONTROL_URL, SCOPE_BASE_URL, TOPOLOGY_ID_HOST, DEEPFENCE_DIAGNOSIS_LOGS_URL, TOPOLOGY_ID_PROCESS, \
    DEEPFENCE_CONTAINER_STATE_URL, TOPOLOGY_ID_NODE_TYPE_MAP_REVERSE, NODE_TYPE_SWARM_SERVICE, \
    DEEPFENCE_CONSOLE_CPU_MEMORY_STATE_URL, REDIS_KEY_PREFIX_CLUSTER_AGENT_PROBE_ID, EMPTY_POD_SCOPE_ID, \
    ES_TERMS_AGGR_SIZE, SENSITIVE_KEYS, REDACT_STRING, VULNERABILITY_LOG_PATH, TIME_UNIT_MAPPING, CVE_SCAN_LOGS_INDEX, \
    CVE_INDEX, SECRET_SCAN_LOGS_INDEX, MALWARE_SCAN_LOGS_INDEX, CUSTOMER_UNIQUE_ID, COMPLIANCE_INDEX, CLOUD_COMPLIANCE_LOGS_INDEX, \
    COMPLIANCE_LOGS_INDEX, ES_MAX_CLAUSE
import hashlib
import requests
import string
import os
import random
import socket
from subprocess import Popen, PIPE
import json
import re
from pathlib import Path
from functools import reduce
from jira import JIRA, JIRAError
import urllib.parse
from utils.archival_and_compression import extract_archive
from utils.custom_exception import DFError
from datetime import datetime
from urllib.parse import urlparse
from config.redisconfig import redis
import shutil
import networkx as nx
import time
from collections import defaultdict


requests.packages.urllib3.disable_warnings()


def modify_es_index(index: str) -> str:
    if CUSTOMER_UNIQUE_ID:
        return index+f"-{CUSTOMER_UNIQUE_ID}"
    return index


def get_postgres_uri():
    import os
    return 'postgresql://{}:{}@{}:{}/{}'.format(
        os.environ.get("POSTGRES_USER_DB_USER"),
        os.environ.get("POSTGRES_USER_DB_PASSWORD"),
        os.environ.get("POSTGRES_USER_DB_HOST"),
        os.environ.get("POSTGRES_USER_DB_PORT"),
        os.environ.get("POSTGRES_USER_DB_NAME")
    )


def wait_for_postgres_table(table_name):
    from sqlalchemy import inspect, create_engine
    try:
        while True:
            engine = create_engine(get_postgres_uri())
            inspector = inspect(engine)
            if inspector.has_table(table_name=table_name) is True:
                break
            time.sleep(5)
    except:
        pass


def validate_email(email_string: str) -> bool:
    """
    this function will validate the email string
    """
    EMAIL_REGEX = re.compile(
        "^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    if EMAIL_REGEX.match(email_string):
        return True
    else:
        return False


def validate_port(port):
    if not port:
        return False
    regex = "^([1-9]|[1-5]?[0-9]{2,4}|6[1-4][0-9]{3}|65[1-4][0-9]{2}|655[1-2][0-9]|6553[1-5])$"
    if re.search(regex, port):
        return True
    else:
        return False


def validate_domain(domain):
    if not domain:
        return False
    regex = "^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\\.)+[A-Za-z]{2,18}$"
    if ":" in domain:
        domain_split = str(domain).split(":")
        domain = domain_split[0]
        if not validate_port(domain_split[1]):
            return False
    if domain == "localhost":
        return True
    if re.search(regex, domain):
        return True
    else:
        return False


def validate_ip(ip_address):
    if not ip_address:
        return False
    regex = "^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$"
    if ":" in ip_address:
        ip_address_split = str(ip_address).split(":")
        ip_address = ip_address_split[0]
        if not validate_port(ip_address_split[1]):
            return False
    if re.search(regex, ip_address):
        return True
    else:
        return False


def get_recent_scan_ids(index_name, number, time_unit, lucene_query_string, filters=None):
    if not filters:
        if index_name == CVE_SCAN_LOGS_INDEX:
            filters = {"action": "COMPLETED"}
        elif index_name in [COMPLIANCE_LOGS_INDEX, CLOUD_COMPLIANCE_LOGS_INDEX]:
            filters = {"scan_status": "COMPLETED"}
        elif index_name == SECRET_SCAN_LOGS_INDEX:
            filters = {"scan_status": "COMPLETE"}
        elif index_name == MALWARE_SCAN_LOGS_INDEX:
            filters = {"scan_status": "COMPLETE"}
        else:
            filters = {}
    if index_name in [COMPLIANCE_LOGS_INDEX, CLOUD_COMPLIANCE_LOGS_INDEX]:
        aggs = {
            "node_id": {
                "terms": {"field": "node_id.keyword", "size": ES_TERMS_AGGR_SIZE},
                "aggs": {
                    "compliance_check_type": {
                        "terms": {"field": "compliance_check_type.keyword", "size": 15},
                        "aggs": {
                            "docs": {
                                "top_hits": {
                                    "size": 1, "_source": {"includes": ["scan_id"]},
                                    "sort": [{"@timestamp": {"order": "desc"}}, {"scan_id.keyword": {"order": "desc"}}]
                                }}}}}}
        }
    else:
        aggs = {
            "node_id": {
                "terms": {"field": "node_id.keyword", "size": ES_TERMS_AGGR_SIZE},
                "aggs": {"docs": {"top_hits": {"size": 1, "sort": [
                    {"@timestamp": {"order": "desc"}}, {"scan_id.keyword": {"order": "desc"}}]}}}
            }
        }
    from utils.esconn import ESConn
    aggs_response = ESConn.aggregation_helper(
        index_name, filters, aggs, number, TIME_UNIT_MAPPING.get(time_unit),
        lucene_query_string, add_masked_filter=False)
    recent_scan_ids = []
    for node_id_bkt in aggs_response.get("aggregations", {}).get("node_id", {}).get("buckets", []):
        if node_id_bkt.get("compliance_check_type"):
            for check_type_bkt in node_id_bkt.get("compliance_check_type").get("buckets", []):
                if check_type_bkt.get("docs", {}).get("hits", {}).get("hits", []):
                    recent_scan_ids.append(check_type_bkt["docs"]["hits"]["hits"][0]["_source"]["scan_id"])
        else:
            if node_id_bkt.get("docs", {}).get("hits", {}).get("hits", []):
                recent_scan_ids.append(node_id_bkt["docs"]["hits"]["hits"][0]["_source"]["scan_id"])
    return recent_scan_ids


def call_scope_get_api(url):
    status_code = 0
    try:
        response = requests.get(url)
        status_code = response.status_code
    except Exception as exc:
        # print(exc)
        return False, str(exc), status_code
    if status_code != 200:
        # print(response.text)
        return False, response.text, status_code
    return True, response.text, status_code


def split_list_into_chunks(my_list: list, size: int) -> list:
    # Yield successive n-sized chunks from l.
    def divide_chunks(l, n):
        # looping till length l
        for i in range(0, len(l), n):
            yield l[i:i + n]

    return list(divide_chunks(my_list, size))


def get_cve_scan_tmp_folder(host_name, scan_id):
    return "/data/cve-scan-upload/" + host_name + "/" + scan_id.replace("/", "_").replace(":", "_").replace(".", "_")


def rmdir_recursive(path):
    try:
        shutil.rmtree(path, ignore_errors=True)
    except:
        pass


def mkdir_recursive(path):
    os.makedirs(path, exist_ok=True)


def call_scope_control_api(control_url, host="", container_name="", data=None):
    status_code = 0
    try:
        response = requests.post(control_url, data=data)
        status_code = response.status_code
    except Exception as exc:
        # print("Error executing scope control api on [{}/{}]. Exception [{}]".format(
        #     host, container_name, exc))
        return False, str(exc), status_code
    if status_code != 200:
        # print("Error executing scope control api on [{}/{}]. Response [{}]".format(
        #     host, container_name, response.text))
        return False, response.text, status_code
    return True, response.text, status_code


def md5_hash(text):
    return hashlib.md5(str(text).encode()).hexdigest()


def append_to_file(file_path, lines):
    with open(file_path, "a") as myfile:
        for line in lines:
            myfile.write(line)
            myfile.write("\n")


def all_str_append_to_file(file_path, lines):
    with open(file_path, "a") as myfile:
        for line in lines:
            myfile.write(line)


def create_file_if_not_exists(file_path):
    filename = Path(file_path)
    # will create file, if it exists will do nothing
    filename.touch(exist_ok=True)


def get_host_name_probe_id_map():
    host_name_probe_id_map = redis.get(TOPOLOGY_HOSTS_PROBE_MAP_REDIS_KEY)
    if not host_name_probe_id_map:
        host_name_probe_id_map = "{}"
    return json.loads(host_name_probe_id_map)


def get_process_ids_for_pod(pod_scope_id):
    """
    Return an array of PIDs given the scope id of a pod
    """
    process_ids = []
    pod_node_details = get_node_details_for_scope_id(
        [(TOPOLOGY_ID_NODE_TYPE_MAP_REVERSE.get(NODE_TYPE_POD), urllib.parse.quote_plus(pod_scope_id))])
    if not pod_node_details:
        return process_ids
    pod_children_details = pod_node_details[0].get(
        "node", {}).get("children", [])
    for pod_child in pod_children_details:
        if str(pod_child["label"]).lower() == TOPOLOGY_ID_PROCESS:
            for process_details in pod_child.get("nodes", []):
                for metadata in process_details.get("metadata", []):
                    if metadata["id"] == "pid":
                        process_ids.append(metadata["value"])
    return process_ids


def get_node_details_for_scope_id(topology_id_scope_id_tuple):
    # [(topology_id, scope_id), (topology_id, scope_id)]
    node_detail_ips = []
    for topology_id_scope_id in topology_id_scope_id_tuple:
        node_detail_ips.append(
            SCOPE_NODE_DETAIL_API_URL.format(topology_id=topology_id_scope_id[0], scope_id=topology_id_scope_id[1]))
    return async_http_get(node_detail_ips)


def async_http_get(urlList):
    output = []
    urlListLen = len(urlList)
    if urlListLen == 0:
        return output
    pidList = []
    for i in range(0, urlListLen):
        cmdLine = ["/usr/bin/curl", "-L", "-k", "-s", "-S", urlList[i]]
        try:
            pidVal = Popen(cmdLine, stdin=PIPE, stdout=PIPE, shell=False)
            pidList.append(pidVal)
        except:
            pidList.append("")
    for i in range(0, urlListLen):
        pidVal = pidList[i]
        if not pidVal:
            output.insert(i, "")
            continue
        try:
            stdOut, stdErr = pidVal.communicate()
            output.insert(i, json.loads(stdOut.decode()))
        except:
            output.insert(i, "")
    return output


def async_http_post(url_data_list):
    """
    :param url_data_list: [("http://...", "{"a":"b"}"), ()]
    :return:
    """
    output = {}
    if not url_data_list:
        return output
    pid_list = []
    for i in range(0, len(url_data_list)):
        cmd_line = ["/usr/bin/curl", "-L", "-k", "-s", "-S", "-X", "POST",
                    "-d", url_data_list[i][1], url_data_list[i][0]]
        # print(" ".join(cmd_line))
        try:
            pid_val = Popen(cmd_line, stdin=PIPE, stdout=PIPE, shell=False)
            pid_list.append(pid_val)
        except:
            output[url_data_list[i][0]] = ""
            pid_list.append("")
    for i in range(0, len(url_data_list)):
        pid_val = pid_list[i]
        if not pid_val:
            output[url_data_list[i][0]] = ""
            continue
        try:
            std_out, std_err = pid_val.communicate()
            output[url_data_list[i][0]] = json.loads(std_out.decode())
        except:
            output[url_data_list[i][0]] = ""
    return output


def get_hostname():
    return socket.gethostname()


def parse_query_param(param_str):
    return {x[0]: x[1] for x in [x.split("=") for x in param_str.split("&")]}


def get_random_string(length):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))


def is_network_attack_vector(attack_vector):
    attack_vector_lower_case = str(attack_vector).lower()
    if "AV:N" in attack_vector:
        return True
    elif attack_vector_lower_case == "network":
        return True
    elif attack_vector_lower_case == "n":
        return True
    return False


def get_topology_network_graph(topology_nodes, graph=None, node_type=None, include_nodes=None):
    if not include_nodes:
        include_nodes = {}
    if graph is None:
        graph = nx.DiGraph()
    if not topology_nodes:
        return graph
    needed_nodes = {}
    image_names = {}
    for node_id, node_details in topology_nodes.items():
        if "is_ui_vm" in node_details:
            if node_details.get("is_ui_vm") is True:
                continue
        else:
            is_ui_vm = False
            for metadata in node_details.get("metadata", []):
                if metadata["id"] == "is_ui_vm":
                    if metadata["value"] == "true":
                        is_ui_vm = True
                    break
            if is_ui_vm:
                continue
        node_name = node_details.get("name", node_details.get("label"))
        if node_details.get("pseudo", False):
            if node_name == "The Internet":
                needed_nodes[node_id] = node_name
            continue
        image_name = node_details.get("image_name_with_tag", node_details.get("image"))
        if image_name and image_name != ":":
            image_names[node_id] = image_name
        if include_nodes:
            if node_name in include_nodes:
                needed_nodes[node_id] = node_name
                continue
            if image_name and image_name != ":":
                if image_name in include_nodes:
                    needed_nodes[node_id] = node_name
                    continue
        else:
            needed_nodes[node_id] = node_name
    for node_id, node_details in topology_nodes.items():
        if node_id not in needed_nodes:
            continue
        if not graph.has_node(node_id):
            graph.add_node(node_id, name=needed_nodes[node_id], node_type=node_type,
                           image_name=image_names.get(node_id, ""))
        for adj_node_id in node_details.get("adjacency", []):
            if adj_node_id == node_id:
                continue
            if adj_node_id not in needed_nodes:
                continue
            if not graph.has_node(adj_node_id):
                graph.add_node(adj_node_id, name=needed_nodes[adj_node_id], node_type=node_type,
                               image_name=image_names.get(adj_node_id, ""))
            if not graph.has_edge(node_id, adj_node_id):
                graph.add_edge(node_id, adj_node_id)
    return graph


def websocketio_channel_name_format(node_type):
    node_type_split = node_type.split("?")
    node_type = node_type_split[0]
    options = {}
    if len(node_type_split) > 1:
        options = parse_query_param(node_type_split[1])
    """
    format = deepfence | scope
    """
    if "format" in options:
        if options["format"] not in ["deepfence", "scope"]:
            options["format"] = "deepfence"
    else:
        options["format"] = "deepfence"
    """
    pseudo = show | hide
    """
    if "pseudo" in options:
        if options["pseudo"] not in ["show", "hide"]:
            options["pseudo"] = "show"
    else:
        options["pseudo"] = "show"
    """
    stopped = both | running | stopped
    """
    if "stopped" in options:
        if options["stopped"] not in ["both", "stopped", "running"]:
            options["stopped"] = "both"
    else:
        options["stopped"] = "both"
    """
    namespace (kubernetes)
    """
    if "namespace" not in options:
        options["namespace"] = ""
    else:
        options["namespace"] = str(options["namespace"])
    """
    unconnected = show | hide
    """
    if "unconnected" in options:
        if options["unconnected"] not in ["show", "hide"]:
            options["unconnected"] = "show"
    else:
        options["unconnected"] = "show"
    """
    k8s storage = show | hide
    """
    if "storage" in options:
        if options["storage"] not in ["show", "hide"]:
            options["storage"] = "show"
    else:
        options["storage"] = "show"

    if node_type == NODE_TYPE_HOST:
        channel = "{0}?format={1}".format(node_type, options["format"])
    elif node_type == NODE_TYPE_CONTAINER:
        channel = "{0}?stopped={1}&pseudo={2}&format={3}".format(
            node_type, options["stopped"], options["pseudo"], options["format"])
    elif node_type == NODE_TYPE_CONTAINER_BY_NAME:
        channel = "{0}?stopped={1}&pseudo={2}&format={3}".format(
            node_type, options["stopped"], options["pseudo"], options["format"])
    elif node_type == NODE_TYPE_CONTAINER_IMAGE:
        channel = "{0}?stopped={1}&pseudo={2}&format={3}".format(
            node_type, options["stopped"], options["pseudo"], options["format"])
    elif node_type == NODE_TYPE_PROCESS:
        channel = "{0}?unconnected={1}&format={2}".format(
            node_type, options["unconnected"], options["format"])
    elif node_type == NODE_TYPE_PROCESS_BY_NAME:
        channel = "{0}?unconnected={1}&format={2}".format(
            node_type, options["unconnected"], options["format"])
    elif node_type == NODE_TYPE_POD:
        channel = "{0}?namespace={1}&pseudo={2}&format={3}".format(
            node_type, options["namespace"], options["pseudo"], options["format"])
    elif node_type == NODE_TYPE_KUBE_CONTROLLER or node_type == NODE_TYPE_KUBE_SERVICE or node_type == NODE_TYPE_SWARM_SERVICE:
        channel = "{0}?namespace={1}&pseudo={2}&format={3}".format(node_type, options["namespace"], options["pseudo"],
                                                                   options["format"])
    else:
        return "", "", {}, ""
    return node_type, channel, options, md5_hash(channel)


def validateJiraCredentials(siteurl, username, password, api_token, projectkey, issuetype):
    try:
        # validating site url and credentials.
        # Not using jira-python client as it
        # results in 'max recursion depth reached'
        # error for invalid credentials
        # Ticket open as of 2019-03-04: https://github.com/pycontribs/jira/issues/681

        try:
            if not api_token:
                body = {'username': username, 'password': password}
                apiurl = '{0}/rest/auth/1/session'.format(siteurl.strip('/'))
                response = requests.post(apiurl, json=body, verify=False)
            else:
                response = requests.post(siteurl.strip('/'), auth=(username, api_token), verify=False)
        except requests.exceptions.ConnectionError as e:
            raise JIRAError(text='Invalid Site URL')

        if response.status_code == 404:
            raise JIRAError(text="Invalid Site URL")
        if response.status_code == 401:
            raise JIRAError(text='Invalid credentials')
        if response.status_code != 200:
            raise Exception()

        if not api_token:
            data = response.json()
            session = data.get('session')
            if not session:
                raise JIRAError(text="Invalid Credentials")

        if not api_token:
            jclient = JIRA(siteurl, auth=(username, password,), max_retries=0, options={"verify": False})
        else:
            jclient = JIRA(siteurl, basic_auth=(username, api_token), max_retries=0, options={"verify": False})

        # validating project key
        jclient.project(projectkey)

        # validating issuetype
        jclient.search_issues('type={1}'.format(projectkey, issuetype))
    except JIRAError as e:
        raise e
    except Exception as e:
        raise JIRAError(text='There was an error validating credentials')


# helps compare comma separated user defined tags, stored in agent node meta data
def tag_str_comparator(taglist_A_str, taglist_B_str):
    if not taglist_A_str or not taglist_B_str:
        return False  # we do not match even if both taglist is empty

    taglistA = taglist_A_str.split(',')
    taglistB = taglist_B_str.split(',')

    for tagA in taglistA:
        for tagB in taglistB:
            if tagA == tagB:
                return True
    return False


def get_deepfence_logs(params, extract=False):
    url = DEEPFENCE_DIAGNOSIS_LOGS_URL
    status_code = 0
    try:
        response = requests.get(url=url, params=params)
        status_code = response.status_code
        content = response.content
    except Exception as exc:
        return None, False
    if status_code != 200:
        return None, False
    if extract:
        filesobj = extract_archive(content)
        return filesobj, True
    return content, True


def get_deepfence_console_host_stats():
    url = DEEPFENCE_CONSOLE_CPU_MEMORY_STATE_URL
    status_code = 0
    try:
        response = requests.get(url=url)
        status_code = response.status_code
        if status_code != 200:
            return None, False
        content_str = response.content
        content = json.loads(content_str)
        return content, True
    except Exception as exc:
        return None, False


def get_deepfence_container_state():
    url = DEEPFENCE_CONTAINER_STATE_URL
    status_code = 0
    try:
        response = requests.get(url=url)
        status_code = response.status_code
        content_str = response.content
    except Exception as exc:
        return None, False
    if status_code != 200:
        return None, False
    try:
        content = json.loads(content_str)
    except Exception as e:
        return None, False
    return content, True


def printable(input_bytes):
    input_str = input_bytes.decode('utf-8', errors='ignore')
    condition = set(string.printable)
    input_list = list(filter(lambda x: x in condition, input_str))
    output_str = "".join(input_list)
    return output_str


def pretty_date(time=False):
    """
    Get a datetime object or a int() Epoch timestamp and return a
    pretty string like 'an hour ago', 'Yesterday', '3 months ago',
    'just now', etc
    """
    now = datetime.now()
    if type(time) is int:
        diff = now - datetime.fromtimestamp(time)
    elif isinstance(time, datetime):
        diff = now - time
    elif not time:
        diff = now - now
    else:
        return ""
    second_diff = diff.seconds
    day_diff = diff.days

    if day_diff < 0:
        return ''

    if day_diff == 0:
        if second_diff < 10:
            return "just now"
        if second_diff < 60:
            return "{0:.1f} seconds ago".format(second_diff)
        if second_diff < 120:
            return "a minute ago"
        if second_diff < 3600:
            return "{0:.1f} minutes ago".format(second_diff / 60)
        if second_diff < 7200:
            return "an hour ago"
        if second_diff < 86400:
            return "{0:.1f} hours ago".format(second_diff / 3600)
    if day_diff == 1:
        return "Yesterday"
    if day_diff < 7:
        return "{0:.1f} days ago".format(day_diff)
    if day_diff < 31:
        return "{0:.1f} weeks ago".format(day_diff / 7)
    if day_diff < 365:
        return "{0:.1f} years ago".format(day_diff / 30)
    return "{0:.1f} years ago".format(day_diff / 365)


# There is no defnintive way to validate an URL
# "bad://///morebad////" is a valid URL according to RFC
# https://stackoverflow.com/a/827621
# This function tries to check if there is an URL scheme and
# absolute address/domain.
def validate_url(url_string):
    if not url_string:
        raise DFError("URL is empty")

    if type(url_string) != str:
        raise DFError("URL should be of type string")

    urlobject = urlparse(url_string)
    if not urlobject.scheme:
        raise DFError("Invalid URL scheme")
    if not urlobject.netloc:
        raise DFError("Relative URL not allowed")

    return urlobject


def get_image_cve_status(required_fields=None):
    if not required_fields:
        required_fields = ["@timestamp", "action", "cve_scan_message"]
    aggs = {
        "node_id": {
            "terms": {"field": "node_id.keyword", "size": ES_TERMS_AGGR_SIZE},
            "aggs": {"recent_status": {
                "top_hits": {
                    "sort": [{"@timestamp": {"order": "desc"}}, {"scan_id.keyword": {"order": "desc"}}],
                    "_source": {"includes": required_fields}, "size": 1
                }
            }}
        }
    }
    image_index = {}
    from utils.esconn import ESConn
    try:
        aggs_response = ESConn.aggregation_helper(
            CVE_SCAN_LOGS_INDEX, {"node_type": NODE_TYPE_CONTAINER_IMAGE}, aggs, None, None, None,
            add_masked_filter=False)
        node_buckets = aggs_response.get("aggregations", {}).get(
            "node_id", {}).get('buckets', [])

        # create an index for mapping image name and cve status details

        def image_index_handler(acc, node):
            hits = node.get("recent_status", {}).get(
                'hits', {}).get('hits', {})
            if len(hits) > 0:
                acc[node.get('key')] = {k: v for k, v in hits[0].get(
                    "_source", {}).items() if k in required_fields}
            return acc

        image_index = reduce(image_index_handler, node_buckets, {})
    except:
        pass
    return image_index


def get_image_secret_status(required_fields=None):
    if not required_fields:
        required_fields = ["@timestamp", "scan_status"]
    aggs = {
        "node_id": {
            "terms": {"field": "node_id.keyword", "size": ES_TERMS_AGGR_SIZE},
            "aggs": {"recent_status": {
                "top_hits": {
                    "sort": [{"@timestamp": {"order": "desc"}}],
                    "_source": {"includes": required_fields}, "size": 1
                }
            }}
        }
    }
    image_index = {}
    from utils.esconn import ESConn
    try:
        aggs_response = ESConn.aggregation_helper(
            SECRET_SCAN_LOGS_INDEX, {"node_type": NODE_TYPE_CONTAINER_IMAGE}, aggs, None, None, None,
            add_masked_filter=False)
        node_buckets = aggs_response.get("aggregations", {}).get(
            "node_id", {}).get('buckets', [])

        # create an index for mapping image name and cve status details

        def image_index_handler(acc, node):
            hits = node.get("recent_status", {}).get(
                'hits', {}).get('hits', {})
            if len(hits) > 0:
                acc[node.get('key')] = {k: v for k, v in hits[0].get(
                    "_source", {}).items() if k in required_fields}
            return acc

        image_index = reduce(image_index_handler, node_buckets, {})
    except:
        pass
    return image_index

def get_image_malware_status(required_fields=None):
    if not required_fields:
        required_fields = ["@timestamp", "scan_status"]
    aggs = {
        "node_id": {
            "terms": {"field": "node_id.keyword", "size": ES_TERMS_AGGR_SIZE},
            "aggs": {"recent_status": {
                "top_hits": {
                    "sort": [{"@timestamp": {"order": "desc"}}],
                    "_source": {"includes": required_fields}, "size": 1
                }
            }}
        }
    }
    image_index = {}
    from utils.esconn import ESConn
    try:
        aggs_response = ESConn.aggregation_helper(
            MALWARE_SCAN_LOGS_INDEX, {"node_type": NODE_TYPE_CONTAINER_IMAGE}, aggs, None, None, None,
            add_masked_filter=False)
        node_buckets = aggs_response.get("aggregations", {}).get(
            "node_id", {}).get('buckets', [])

        # create an index for mapping image name and cve status details

        def image_index_handler(acc, node):
            hits = node.get("recent_status", {}).get(
                'hits', {}).get('hits', {})
            if len(hits) > 0:
                acc[node.get('key')] = {k: v for k, v in hits[0].get(
                    "_source", {}).items() if k in required_fields}
            return acc

        image_index = reduce(image_index_handler, node_buckets, {})
    except:
        pass
    return image_index

# redact_sensitivie_info removes the SENSITIVE_KEYS and
# replaces it with REDACT_STRING
def redact_sensitive_info(obj=None):
    if obj is None:
        return None
    for key in obj:
        if key in SENSITIVE_KEYS:
            obj[key] = REDACT_STRING * len(obj[key])
    return obj


# creates a directory in celery container
# and pushes the std_out in the files
def store_vulnerability_log(filename, logs):
    log_path = VULNERABILITY_LOG_PATH + \
               datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")

    # create folder if not exists
    mkdir_recursive(log_path)
    filepath = log_path + "/" + remove_special_char_str(filename) + ".log"
    create_file_if_not_exists(filepath)
    all_str_append_to_file(filepath, logs)


# replaces all the special char from a string
# with underscore(_) except underscore
# e.g.:
# f("<Node>;DF_Agent") = _Node__DF_Agent
# f("nginx:latest") = ngnix_latest
def remove_special_char_str(new_str):
    return re.sub(r'[^\w]', '_', new_str)


def get_all_scanned_node() -> list:
    from utils.esconn import ESConn
    query_agg = {
        "aggs": {
            "all_hosts": {
                "terms": {
                    "field": "host_name.keyword",
                    "size": 50000
                }
            }
        }
    }
    scanned_node = ESConn.search([CVE_INDEX], query_agg, 0, 0)

    host_names = []
    for datum in scanned_node['aggregations']['all_hosts']['buckets']:
        if datum.get('key'):
            host_names.append(datum.get('key'))
    return host_names


def get_all_scanned_images(days) -> set:
    from utils.esconn import ESConn
    query_agg = {
        "query": {
            "bool": {
                "must": {
                    "term": {"node_type": NODE_TYPE_CONTAINER_IMAGE},
                    "range": {
                        "@timestamp": {"gte": "now-{0}d/d".format(days)}
                    }
                },
            }
        },
        "aggs": {
            "images": {
                "terms": {
                    "field": "cve_container_image.keyword",
                    "size": ES_TERMS_AGGR_SIZE
                }
            }
        }
    }
    scanned_images = ESConn.search(CVE_INDEX, query_agg, 0, 0)

    image_names = []
    for datum in scanned_images['aggregations']['images']['buckets']:
        if datum.get('key'):
            image_names.append(datum.get('key'))
    return set(image_names)


def get_all_secret_scanned_images(days) -> list:
    from utils.esconn import ESConn
    query_agg = {
        "query": {
            "bool": {
                "must": [{
                    "term": {"node_type": "container_image" }
                },
                    {
                    "range": {
                        "@timestamp": {"gte": "now-{0}d/d".format(days)}
                    }
                }]
            }
        },
        "aggs": {
            "images": {
                "terms": {
                    "field": "node_id.keyword",
                    "size": ES_TERMS_AGGR_SIZE
                }
            }
        }
    }
    scanned_images = ESConn.search(SECRET_SCAN_LOGS_INDEX, query_agg, 0, 0)

    image_names = []
    for datum in scanned_images['aggregations']['images']['buckets']:
        if datum.get('key'):
            image_names.append(datum.get('key').split(";")[0])
    return set(image_names)

def get_all_malware_scanned_images(days) -> list:
    from utils.esconn import ESConn
    query_agg = {
        "query": {
            "bool": {
                "must": [{
                    "term": {"node_type": "container_image" }
                },
                    {
                    "range": {
                        "@timestamp": {"gte": "now-{0}d/d".format(days)}
                    }
                }]
            }
        },
        "aggs": {
            "images": {
                "terms": {
                    "field": "node_id.keyword",
                    "size": ES_TERMS_AGGR_SIZE
                }
            }
        }
    }
    scanned_images = ESConn.search(MALWARE_SCAN_LOGS_INDEX, query_agg, 0, 0)

    image_names = []
    for datum in scanned_images['aggregations']['images']['buckets']:
        if datum.get('key'):
            image_names.append(datum.get('key').split(";")[0])
    return set(image_names)

def set_vulnerability_status_for_packages(open_files_list, number, time_unit, lucene_query_string,open_files_map,open_files_list_final):
    from utils.esconn import ESConn
    cve_aggs = {
        "node_type": {
            "terms": {
                "field": "node_type.keyword",
                "exclude": [""],
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
                "node_name": {
                    "terms": {
                        "field": "cve_container_image.keyword",
                        "exclude": [""],
                        "size": ES_TERMS_AGGR_SIZE
                    },
                    "aggs": {
                        "package_name": {
                            "terms": {
                                "field": "cve_caused_by_package.keyword",
                                "size": ES_TERMS_AGGR_SIZE
                            },
                            "aggs": {
                                "top_cves": {
                                    "top_hits": {
                                        "sort": [
                                            {
                                                "_script": {
                                                    "type": "number",
                                                    "script": {
                                                        "lang": "painless",
                                                        "source": "params.sortOrder.indexOf(doc['cve_severity.keyword'].value)",
                                                        "params": {"sortOrder": ["info", "low", "medium", "high", "critical"]}
                                                    },
                                                    "order": "desc"
                                                }
                                            },
                                            {
                                                "cve_cvss_score": "desc"
                                            },
                                            {
                                                "cve_overall_score": "desc"
                                            }
                                        ],
                                        "_source": {
                                            "includes": ["cve_severity", "cve_id"]
                                        },
                                        "size": 1
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    node_types = {node_info.split(":", 1)[0] for node_info in open_files_map.keys()}
    node_names = {node_info.split(":", 1)[1] for node_info in open_files_map.keys()}
    cve_filters = { "node_type": list(node_types), "cve_container_image": list(node_names) }
    cve_aggs_response = ESConn.aggregation_helper(CVE_INDEX, cve_filters, cve_aggs, number,
                                                   TIME_UNIT_MAPPING.get(time_unit), lucene_query_string)

    top_cve = {}
    if "aggregations" in cve_aggs_response:
        for node_type_aggr in cve_aggs_response["aggregations"]["node_type"]["buckets"]:
            node_type = node_type_aggr["key"]
            for node_name_aggr in node_type_aggr["node_name"]["buckets"]:
                node_name = node_name_aggr["key"]
                for package_name_aggr in node_name_aggr["package_name"]["buckets"]:
                    package_name = package_name_aggr["key"]
                    package_key = "{}:{}:{}".format(node_type, node_name, package_name)
                    top_cve_list = package_name_aggr.get("top_cves", {}).get("hits", {}).get("hits", [])
                    if top_cve_list:
                        top_vuln = top_cve_list[0]
                        cve_id = top_vuln["_source"]["cve_id"]
                        cve_severity = top_vuln["_source"]["cve_severity"]
                        top_cve[package_key] = {"severity": cve_severity, "cve_id": cve_id}

    
    pattern = '^\((.*?):(.*?)\)$'
    

    omitted_list = ['cve_severity']
    seeverity_presence = False

    if lucene_query_string:
        result = re.match(pattern, lucene_query_string)
        if result:
            if result.group(1) in omitted_list:
                seeverity_presence = True

    for node_key, node_packages in open_files_map.items():
        node_type, node_id = node_key.split(":", 1)
        node_info = {
            "node_type": node_type,
            "node_name": node_id,
            **node_packages
        }
        node_name = node_info["node_name"]
        if seeverity_presence:
            node_packages_ = []
            for package_info in node_info["packages"]:
                package_key = "{}:{}:{}".format(node_type, node_name, package_info["package_name"])
                if top_cve.get(package_key, None):
                    package_info["vulnerability_status"] = top_cve[package_key]["severity"]
                    package_info["cve_id"] = top_cve[package_key]["cve_id"]
                    node_packages_.append(package_info)
            node_info["packages"] = node_packages_
            open_files_list_final.append(node_info)
        else:
            for package_info in node_info["packages"]:
                package_key = "{}:{}:{}".format(node_type, node_name, package_info["package_name"])
                if top_cve.get(package_key, None):
                    package_info["vulnerability_status"] = top_cve[package_key]["severity"]
                    package_info["cve_id"] = top_cve[package_key]["cve_id"]
            open_files_list_final.append(node_info)

    return open_files_list_final


def get_top_exploitable_vulnerabilities(number, time_unit, lucene_query_string, size=1000, filter_host_name=None):
    topology_data = redis.mget([
        websocketio_channel_name_format(NODE_TYPE_HOST + "?format=deepfence")[1],
        websocketio_channel_name_format(NODE_TYPE_CONTAINER_IMAGE + "?format=deepfence")[1],
        websocketio_channel_name_format(NODE_TYPE_CONTAINER + "?format=deepfence")[1]
    ])
    topology_data = [
        json.loads(topology_data[0]) if topology_data[0] else {},
        json.loads(topology_data[1]) if topology_data[1] else {},
        json.loads(topology_data[2]) if topology_data[2] else {}
    ]
    active_nodes = {}
    for node_id, host_details in topology_data[0].items():
        if filter_host_name:
            if not host_details.get("host_name") == filter_host_name:
                continue
        if host_details.get("host_name") and not host_details.get("pseudo", False) and \
                not host_details.get("is_ui_vm", False):
            active_nodes[host_details["host_name"]] = host_details.get("uptime", 0)
    if not active_nodes:
        return []
    image_creation_time = {}
    datetime_now = datetime.now()
    datetime_str = datetime_now.strftime("%Y-%m-%dT%H:%M:%SZ")
    for node_id, image_details in topology_data[1].items():
        if not image_details.get("name") or image_details.get("pseudo", False):
            continue
        if filter_host_name:
            image_found_in_host = False
            for parent in image_details.get("parents", []):
                if parent["type"] == NODE_TYPE_HOST and parent["label"] == filter_host_name:
                    image_found_in_host = True
            if not image_found_in_host:
                continue
        datetime_created = datetime.strptime(
            image_details.get("docker_image_created_at", datetime_str), "%Y-%m-%dT%H:%M:%SZ")
        duration = datetime_now - datetime_created
        image_creation_time[image_details["name"]] = int(duration.total_seconds())
    for node_id, container_details in topology_data[2].items():
        if container_details.get("docker_container_state") != "running":
            continue
        if filter_host_name:
            if container_details.get("host_name") != filter_host_name:
                continue
        image_name_with_tag = container_details.get("image_name_with_tag")
        if not image_name_with_tag:
            continue
        # Use image build time for containers if available, otherwise use container uptime
        active_nodes[image_name_with_tag] = image_creation_time.get(
            image_name_with_tag, container_details.get("docker_container_uptime", 0))
    recent_scan_ids = get_recent_scan_ids(CVE_SCAN_LOGS_INDEX, number, time_unit, None,
                                          {"action": "COMPLETED", "node_id": list(active_nodes.keys())})
    if not recent_scan_ids:
        return []
    top_vulnerabilities = []
    recent_scan_id_chunks = split_list_into_chunks(recent_scan_ids, ES_MAX_CLAUSE)
    sort_expression = "cve_overall_score:desc"

    from utils.esconn import ESConn
    # Select top MAX_TOP_EXPLOITABLE_VULNERABILITIES number of vulnerabilities with the highest score
    for scan_id_chunk in recent_scan_id_chunks:
        filters = {"masked": False, "scan_id": scan_id_chunk}
        resp = ESConn.search_by_and_clause(
            CVE_INDEX, filters, 0, number=number, time_unit=TIME_UNIT_MAPPING.get(time_unit),
            lucene_query_string=lucene_query_string, size=ES_TERMS_AGGR_SIZE, custom_sort_expression=sort_expression)
        top_vulnerabilities.extend(resp.get("hits", []))
    host_graph = get_topology_network_graph(topology_data[0])
    image_graph = get_topology_network_graph(topology_data[1])

    from resource_models.node import NodeUtils
    node_utils = NodeUtils()
    incoming_internet_host_id = node_utils.get_df_id_from_scope_id("in-theinternet", NODE_TYPE_HOST)
    outgoing_internet_host_id = node_utils.get_df_id_from_scope_id("out-theinternet", NODE_TYPE_HOST)
    incoming_internet_image_id = node_utils.get_df_id_from_scope_id("in-theinternet", NODE_TYPE_CONTAINER_IMAGE)
    outgoing_internet_image_id = node_utils.get_df_id_from_scope_id("out-theinternet", NODE_TYPE_CONTAINER_IMAGE)
    node_with_incoming_connections = {}
    for vulnerability in top_vulnerabilities:
        cve_doc = vulnerability.get("_source", {})
        node_name = cve_doc.get('cve_container_image', '')
        if node_with_incoming_connections.get(node_name):
            continue
        node_type = cve_doc.get("node_type")
        if node_type == NODE_TYPE_HOST:
            node_graph = host_graph
            scope_id = node_name + ";<" + NODE_TYPE_HOST + ">"
            internet_node_id = [incoming_internet_host_id, outgoing_internet_host_id]
        else:
            node_graph = image_graph
            scope_id = node_name + ";<" + NODE_TYPE_CONTAINER_IMAGE + ">"
            internet_node_id = [incoming_internet_image_id, outgoing_internet_image_id]
        try:
            node_id = node_utils.get_df_id_from_scope_id(scope_id, node_type)
            if nx.has_path(node_graph, internet_node_id[0], node_id):
                node_with_incoming_connections[node_name] = True
            elif nx.has_path(node_graph, node_id, internet_node_id[1]):
                node_with_incoming_connections[node_name] = True
            else:
                node_with_incoming_connections[node_name] = False
        except:
            node_with_incoming_connections[node_name] = False
    # Sort based on the combine score of cve_score and scaled image build time/uptime and send top 10 vulnerabilities
    # Formula = cve_score * (1+weight), Weight = min(imageBuildTime or uptime/year, 1)
    max_uptime = 365 * 24 * 60 * 60
    uniq_map = {}
    # (attack_vector, live_connection)
    attack_vector_map = {
        0: ("local", False), 1: ("network", False), 2: ("network", True)
    }
    for vulnerability in top_vulnerabilities:
        cve_doc = vulnerability.get("_source", {})
        cve_id = cve_doc.get("cve_id")
        is_cve_fixed = 1 if cve_doc.get("cve_fixed_in", "") else 0
        node_name = cve_doc.get('cve_container_image', '')
        network_attack_vector = is_network_attack_vector(cve_doc.get("cve_attack_vector", ""))
        if not network_attack_vector and cve_doc.get('cve_severity') != "critical":
            continue
        exploitability_score = 0
        if network_attack_vector:
            if node_with_incoming_connections.get(node_name):
                exploitability_score = 2
            else:
                exploitability_score = 1
        exploit_poc = vulnerability['_source'].get("exploit_poc", "")
        exploit_present = 1 if exploit_poc else 0
        # append this image if this cve present in more than one images
        # introducing a new field
        if cve_id in uniq_map:
            prev_vulnerability = uniq_map.get(cve_id)
            if prev_vulnerability['_source']['cve_overall_score'] > vulnerability['_source']['cve_overall_score']:
                vulnerability = prev_vulnerability
            vulnerable_images = prev_vulnerability.get('_source', {}).get('vulnerable_images', [])
            if node_name not in vulnerable_images:
                vulnerable_images.append(node_name)
            vulnerability['_source']['vulnerable_images'] = vulnerable_images
            new_exp_score = max(exploitability_score,
                                prev_vulnerability.get('_source', {}).get('exploitability_score', []))
            vulnerability['_source']['exploitability_score'] = new_exp_score
            vulnerability['_source']['attack_vector'] = attack_vector_map[new_exp_score][0]
            vulnerability['_source']['live_connection'] = attack_vector_map[new_exp_score][1]
            prev_exploit_poc = prev_vulnerability['_source'].get("exploit_poc", "")
            vulnerability['_source']['exploit_poc'] = exploit_poc or prev_exploit_poc
            vulnerability['_source']['exploit_present'] = max(
                exploit_present,
                1 if prev_exploit_poc else 0
            )
            prev_cve_fixed_in = prev_vulnerability['_source'].get("cve_fixed_in", "")
            vulnerability['_source']['is_cve_fixed'] = max(
                is_cve_fixed,
                1 if prev_cve_fixed_in else 0
            )
        else:
            vulnerability['_source']['vulnerable_images'] = [node_name]
            vulnerability['_source']['exploitability_score'] = exploitability_score
            vulnerability['_source']['attack_vector'] = attack_vector_map[exploitability_score][0]
            vulnerability['_source']['live_connection'] = attack_vector_map[exploitability_score][1]
            vulnerability['_source']['exploit_present'] = exploit_present
            vulnerability['_source']['is_cve_fixed'] = is_cve_fixed
        vulnerability['_source']['uscore'] = ((1 + (
                min(max_uptime, active_nodes.get(cve_doc.get("cve_container_image"), 0)) /
                (float)(max_uptime))) * cve_doc.get("cve_cvss_score"))
        uniq_map[cve_doc.get("cve_id")] = vulnerability
    cve_severity_map = defaultdict(int)
    cve_severity_map['low'] = 1
    cve_severity_map['medium'] = 2
    cve_severity_map['high'] = 3
    cve_severity_map['critical'] = 4
    # Select top 10 uniq vulnerabilities
    uniq_top_vulnerabilities = list(uniq_map.values())
    uniq_top_vulnerabilities.sort(
        key=lambda x: (
            x.get('_source', {}).get('exploitability_score'),
            cve_severity_map[x.get('_source', {}).get('cve_severity', '')],
            x.get('_source', {}).get('exploit_present'),
            x.get('_source', {}).get('is_cve_fixed'),
            x.get('_source', {}).get('cve_cvss_score', 0),
        ),
        reverse=True
    )
    rank = 0
    current_uscore = None
    for vulnerability in uniq_top_vulnerabilities:
        if current_uscore != vulnerability.get('_source').get('uscore'):
            current_uscore = vulnerability.get('_source').get('uscore')
            vulnerability['_source']['rank'] = rank = rank + 1
        else:
            vulnerability['_source']['rank'] = rank
    return uniq_top_vulnerabilities[:size]



def get_node_names():
    topology_data = redis.mget([
        websocketio_channel_name_format(NODE_TYPE_HOST + "?format=deepfence")[1],
        websocketio_channel_name_format(NODE_TYPE_CONTAINER_IMAGE + "?format=deepfence")[1],
        websocketio_channel_name_format(NODE_TYPE_CONTAINER + "?format=deepfence")[1]
    ])
    topology_data = [
        json.loads(topology_data[0]) if topology_data[0] else {},
        json.loads(topology_data[1]) if topology_data[1] else {},
        json.loads(topology_data[2]) if topology_data[2] else {}
    ]
    
    return topology_data
    
    
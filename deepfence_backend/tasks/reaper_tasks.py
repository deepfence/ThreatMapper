import logging
import os
from sqlite3 import IntegrityError
from config.app import celery_app, app
from models.user import User
from models.integration import Integration
from models.user_activity_log import UserActivityLog
from models.notification import RunningNotification, VulnerabilityNotification, MalwareNotification, SecretNotification
from models.cloud_resource_node import CloudResourceNode
from datetime import datetime, timedelta
from utils.esconn import ESConn
from utils.constants import CVE_SCAN_LOGS_INDEX, NODE_TYPE_HOST, \
    CVE_SCAN_RUNNING_STATUS, CVE_SCAN_STATUS_QUEUED, CVE_SCAN_STATUS_ERROR, DEEPFENCE_KEY, REPORT_INDEX, \
    CVE_INDEX, SECRET_SCAN_STATUS_IN_PROGRESS, SECRET_SCAN_LOGS_INDEX, CVE_SCAN_LOGS_ES_TYPE, \
    COMPLIANCE_LOGS_ES_TYPE, CLOUD_COMPLIANCE_INDEX, CSPM_RESOURCES_INVERTED, COMPLIANCE_LOGS_INDEX, \
    NODE_TYPE_CONTAINER
from utils.scope import fetch_topology_data
import time
import hashlib
from utils.helper import get_cve_scan_tmp_folder, rmdir_recursive, wait_for_postgres_table
import requests


@celery_app.task(bind=True, default_retry_delay=60)
def update_deepfence_key_in_redis(*args):
    wait_for_postgres_table("user")
    with app.app_context():
        users = User.query.all()
        from config.redisconfig import redis

        deepfence_key_map = {}
        for user in users:
            deepfence_key_map[user.api_key] = user.id
        if deepfence_key_map:
            redis.hset(DEEPFENCE_KEY, mapping=deepfence_key_map)


def cve_fix_interrupted_at_start():
    """
    If UI containers are restarted (esp. celery), then all the cve scans gets killed.
    So, on startup, get all running cve scans, mark it interrupted
    """
    cve_in_progress = ESConn.get_node_wise_cve_status()
    for host, host_cves in cve_in_progress.items():
        for cve_node_id, cve_status in host_cves.items():
            datetime_now = datetime.now()
            if cve_status["action"] == CVE_SCAN_STATUS_QUEUED or cve_status["action"] in CVE_SCAN_RUNNING_STATUS:
                insert_cve_error_doc(cve_status, datetime_now, host, cve_node_id,
                                     "Vulnerability scan was interrupted because of management console restart. Please start again.")


def insert_cve_error_doc(cve_status, datetime_now, host_name, cve_node_id, cve_scan_message):
    body = {
        "masked": "false", "type": CVE_SCAN_LOGS_ES_TYPE, "scan_id": cve_status["scan_id"],
        "node_type": cve_status["node_type"],
        "cve_scan_message": cve_scan_message, "@timestamp": datetime_now.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        "time_stamp": int(time.time() * 1000.0), "host": host_name, "action": CVE_SCAN_STATUS_ERROR,
        "host_name": host_name, "node_id": cve_node_id,
    }
    filters = {"scan_id": cve_status["scan_id"], "action": "QUEUED"}
    es_resp = ESConn.search_by_and_clause(CVE_SCAN_LOGS_INDEX, filters, 0, "asc", size=1)
    if len(es_resp.get("hits", [])) > 0:
        source = es_resp.get("hits", [])[0].get("_source", {})
        body["image_name"] = source.get("image_name", "")
        body["container_name"] = source.get("container_name", "")
    ESConn.create_doc(CVE_SCAN_LOGS_INDEX, body)
    image_file_folder = get_cve_scan_tmp_folder(
        host_name, cve_status["scan_id"])
    rmdir_recursive(image_file_folder)


def insert_secret_error_doc(status, datetime_now, host_name, node_id, scan_message):
    body = {
        "masked": "false", "scan_id": status["scan_id"], "node_type": status["node_type"],
        "scan_message": scan_message, "@timestamp": datetime_now.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        "time_stamp": int(time.time() * 1000.0), "host": host_name, "scan_status": CVE_SCAN_STATUS_ERROR,
        "host_name": host_name, "node_id": node_id, "node_name": host_name
    }
    ESConn.create_doc(SECRET_SCAN_LOGS_INDEX, body)


@celery_app.task(bind=True, default_retry_delay=60)
def cve_fix_interrupted(*args):
    """
    CVE scans, if interrupted/killed, there not be any status update in es regarding failure.
    This task will query all cve scan's in progress (from es), update es that cve was interrupted if scan failed.
    """
    hosts = fetch_topology_data(node_type=NODE_TYPE_HOST, format="deepfence")
    windows_hosts = []
    all_host_names = []
    for node_id, node in hosts.items():
        all_host_names.append(node.get("host_name", ""))
        if node.get("os", "") == "windows":
            windows_hosts.append(node.get("host_name", ""))
    cve_in_progress = ESConn.get_node_wise_cve_status()
    for host, host_cves in cve_in_progress.items():
        if host and host not in all_host_names:
            # In case the agent itself is not connected, don't act now, wait till agent reconnects
            continue
        if host in windows_hosts:
            continue
        for cve_node_id, cve_status in host_cves.items():
            last_status_timestamp = datetime.fromtimestamp(cve_status["timestamp"] / 1000)
            datetime_now = datetime.now()
            total_diff_minutes = int(round((datetime_now - last_status_timestamp).total_seconds() / 60))
            if cve_status["action"] == CVE_SCAN_STATUS_QUEUED:
                # If scan is in QUEUED state for 6 hours, then it has failed
                if total_diff_minutes >= 360:
                    insert_cve_error_doc(cve_status, datetime_now, host, cve_node_id,
                                         "Scan was stopped because it was in queued state longer than expected. "
                                         "Please start again.")
                    celery_task_id = "cve_scan:" + cve_status["scan_id"]
                    try:
                        celery_app.control.revoke(celery_task_id, terminate=False)
                    except:
                        pass
            elif cve_status["action"] in CVE_SCAN_RUNNING_STATUS:
                # If scan was started 10 minutes ago, still no updated status found, then it has failed
                if total_diff_minutes >= 10:
                    insert_cve_error_doc(cve_status, datetime_now, host, cve_node_id,
                                         "Scan was interrupted. Please restart.")


@celery_app.task(bind=True, default_retry_delay=60)
def secret_fix_interrupted(*args):
    """
    Secret scans, if interrupted/killed, there not be any status update in es regarding failure.
    This task will query all cve scan's in progress (from es), update es that cve was interrupted if scan failed.
    """
    hosts = fetch_topology_data(node_type=NODE_TYPE_HOST, format="deepfence")
    windows_hosts = []
    all_host_names = []
    for node_id, node in hosts.items():
        all_host_names.append(node.get("host_name", ""))
        if node.get("os", "") == "windows":
            windows_hosts.append(node.get("host_name", ""))
    secret_in_progress = ESConn.get_node_wise_secret_status()
    for host, host_secrets in secret_in_progress.items():
        if host and host not in all_host_names:
            # In case the agent itself is not connected, don't act now, wait till agent reconnects
            continue
        if host in windows_hosts:
            continue
        for node_id, status in host_secrets.items():
            last_status_timestamp = datetime.fromtimestamp(status["timestamp"] / 1000)
            datetime_now = datetime.now()
            total_diff_minutes = int(round((datetime_now - last_status_timestamp).total_seconds() / 60))
            if status["scan_status"] == CVE_SCAN_STATUS_QUEUED:
                # If scan is in QUEUED state for 6 hours, then it has failed
                if total_diff_minutes >= 360:
                    insert_secret_error_doc(status, datetime_now, host, node_id,
                                            "Scan was stopped because it was in queued state longer than expected. "
                                            "Please start again.")
            elif status["scan_status"] == SECRET_SCAN_STATUS_IN_PROGRESS:
                # If scan was started 10 minutes ago, still no updated status found, then it has failed
                if total_diff_minutes >= 10:
                    insert_secret_error_doc(status, datetime_now, host, node_id,
                                            "Scan was interrupted. Please restart.")


@celery_app.task(bind=True, default_retry_delay=60)
def malware_fix_interrupted(*args):
    """
    Malware scans, if interrupted/killed, there not be any status update in es regarding failure.
    This task will query all cve scan's in progress (from es), update es that cve was interrupted if scan failed.
    """
    hosts = fetch_topology_data(node_type=NODE_TYPE_HOST, format="deepfence")
    windows_hosts = []
    all_host_names = []
    for node_id, node in hosts.items():
        all_host_names.append(node.get("host_name", ""))
        if node.get("os", "") == "windows":
            windows_hosts.append(node.get("host_name", ""))
    malware_in_progress = ESConn.get_node_wise_malware_status()
    for host, host_malwares in malware_in_progress.items():
        if host and host not in all_host_names:
            # In case the agent itself is not connected, don't act now, wait till agent reconnects
            continue
        if host in windows_hosts:
            continue
        for node_id, status in host_malwares.items():
            last_status_timestamp = datetime.fromtimestamp(
                status["timestamp"] / 1000)
            datetime_now = datetime.now()
            total_diff_minutes = int(
                round((datetime_now - last_status_timestamp).total_seconds() / 60))
            if status["action"] == CVE_SCAN_STATUS_QUEUED:
                # If scan is in QUEUED state for 7 days, then it has failed
                if total_diff_minutes >= 1440:
                    insert_malware_error_doc(status, datetime_now, host, node_id,
                                            "Scan was stopped because it was in queued state for a week. Please start "
                                            "again.")
            elif status["action"] in MALWARE_SCAN_STATUS_IN_PROGRESS:
                # If scan was started 40 minutes ago, still no updated status found, then it has failed
                if total_diff_minutes >= 10:
                    insert_malware_error_doc(status, datetime_now, host, node_id,
                                            "Scan was interrupted. Please restart.")


def insert_compliance_error_doc(node_id, scan_data, check_type):
    time_time = time.time()
    es_doc = {
        "node_id": node_id,
        "node_type": scan_data["node_type"],
        "compliance_check_type": check_type,
        "total_checks": 0,
        "masked": "false",
        "host_name": scan_data["host_name"],
        "node_name": scan_data["node_name"],
        "type": COMPLIANCE_LOGS_ES_TYPE,
        "result": {},
        "scan_status": "ERROR",
        "scan_message": "Compliance scan was interrupted. Please start again.",
        "time_stamp": int(time_time * 1000.0),
        "@timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.") +
                      repr(time_time).split('.')[1][:3] + "Z"
    }
    es_doc["doc_id"] = hashlib.md5(
        (es_doc["node_id"] + es_doc["node_type"] + es_doc["compliance_check_type"] + es_doc[
            "scan_status"] + str(
            es_doc["time_stamp"])).encode("utf-8")).hexdigest()
    ESConn.overwrite_doc_having_id(COMPLIANCE_LOGS_INDEX, es_doc, es_doc["doc_id"])
    logging.info(
        "Compliance scan was interrupted on host {0}, node_id {1}, check_type {2}. Fixed in es - {3}.".format(
            scan_data["host_name"], node_id, check_type, es_doc["doc_id"]))


@celery_app.task(bind=True, default_retry_delay=60)
def compliance_fix_interrupted(*args):
    """
    Fix interrupted compliance scans
    """
    hosts = fetch_topology_data(node_type=NODE_TYPE_HOST, format="deepfence")
    windows_hosts = []
    windows_containers = []
    all_host_names = []
    for node_id, node in hosts.items():
        all_host_names.append(node.get("host_name", ""))
        if node.get("os", "") == "windows":
            windows_hosts.append(node.get("host_name", "") + ";<host>")
    if windows_hosts:
        containers = fetch_topology_data(
            node_type=NODE_TYPE_CONTAINER, format="deepfence")
        for node_id, node in containers.items():
            if node.get("host_name", "") + ";<host>" in windows_hosts:
                windows_containers.append(
                    node.get("docker_container_id", "") + ";<container>")
    compliance_scans = ESConn.get_node_wise_compliance_status()
    for node_id, check_types in compliance_scans.items():
        for check_type, scan_data in check_types.items():
            if scan_data["host_name"] and scan_data["host_name"] not in all_host_names:
                # In case the agent itself is not connected, don't act now, wait till agent reconnects
                continue
            if scan_data["node_type"] == "host":
                if node_id in windows_hosts:
                    continue
            elif scan_data["node_type"] == "container":
                if node_id in windows_containers:
                    continue
            timestamp = datetime.strptime(
                scan_data["timestamp"], "%Y-%m-%dT%H:%M:%S.%fZ")
            time_now = datetime.now()
            total_minutes = int(
                round((time_now - timestamp).total_seconds() / 60))
            if scan_data["scan_status"] == "QUEUED":
                # If scan was queued 5 minutes ago, still not in progress, then it has failed
                if total_minutes >= 5:
                    insert_compliance_error_doc(node_id, scan_data, check_type)
            elif scan_data["scan_status"] in ["INPROGRESS", "SCAN_IN_PROGRESS"]:
                # If scan was started 5 minutes ago, still no updated status found, then it has failed
                # We send updates every 2 minutes
                if total_minutes >= 5:
                    insert_compliance_error_doc(node_id, scan_data, check_type)


@celery_app.task(bind=True, default_retry_delay=60)
def delete_expired_user_activity_data(*args):
    """
    Keep last 'n' days logs, delete older ones
    """
    with app.app_context():
        # delete_expired takes retention_period as argument, default is 30 days
        UserActivityLog.delete_expired()


@celery_app.task(bind=True)
def delete_old_agent_logs(self, path):
    """
    Deleting zipped agents logs after a minute from the console
    """
    with app.app_context():
        time.sleep(61)
        url = "http://deepfence-api:9997/clean_agent_logs"
        response = requests.post(url, json={'path': path}, verify=False)


@celery_app.task(bind=True, default_retry_delay=1)
def pdf_report_fix(*args):
    es_response = ESConn.search_by_and_clause(
        REPORT_INDEX, {}, 0, size=10000)
    for ele in es_response['hits']:
        doc_id = ele["_id"]
        date = ele["_source"]["@timestamp"]
        date = date.replace("T", " ")
        date = date.replace("Z", "")
        date = datetime.strptime(date, '%Y-%m-%d %H:%M:%S.%f')
        time_elapsed = ((datetime.utcnow() - date).seconds // 60)
        if time_elapsed > 60 and ele["_source"]["status"].lower() == 'completed':
            headers = {'DF_FILE_NAME': ele['_source']['report_path']}
            try:
                res = requests.request(
                    "DEL", "http://deepfence-fetcher:8006/df-api/clear", headers=headers)
            except:
                pass
            ESConn.delete_docs([doc_id], REPORT_INDEX)
        if time_elapsed >= 10 and ele["_source"]["status"].lower() != 'completed':
            ESConn.delete_docs([doc_id], REPORT_INDEX)

@celery_app.task(bind=True, default_retry_delay=1)
def check_integration_failures(*args):
    with app.app_context():
        error = False
        notification_content = "Integrations are okay"
        resource_notifications = [MalwareNotification]
        for resource_notification in resource_notifications:
            integrations = resource_notification.query.all()
            for info in integrations:
                if info.error_msg:
                    error = True
                    notification_content = "Integrations are failing"
                    break
            if error:
                break
        running_notification_id = "integration_if_any_failure_notification"
        r_notification = RunningNotification.query.filter_by(
            source_application_id=running_notification_id).one_or_none()
        if not r_notification:
            r_notification = RunningNotification(source_application_id=running_notification_id)
        r_notification.content = notification_content
        r_notification.updated_at = datetime.now()
        r_notification.save()

@celery_app.task(bind=True, default_retry_delay=1)
def check_integration_failures(*args):
    with app.app_context():
        error = False
        notification_content = "Integrations are okay"
        resource_notifications = [SecretNotification]
        for resource_notification in resource_notifications:
            integrations = resource_notification.query.all()
            for info in integrations:
                if info.error_msg:
                    error = True
                    notification_content = "Integrations are failing"
                    break
            if error:
                break
        running_notification_id = "integration_if_any_failure_notification"
        r_notification = RunningNotification.query.filter_by(
            source_application_id=running_notification_id).one_or_none()
        if not r_notification:
            r_notification = RunningNotification(source_application_id=running_notification_id)
        r_notification.content = notification_content
        r_notification.updated_at = datetime.now()
        r_notification.save()

@celery_app.task(bind=True, default_retry_delay=1)
def check_integration_failures(*args):
    with app.app_context():
        error = False
        notification_content = "Integrations are okay"
        resource_notifications = [VulnerabilityNotification]
        for resource_notification in resource_notifications:
            integrations = resource_notification.query.all()
            for info in integrations:
                if info.error_msg:
                    error = True
                    notification_content = "Integrations are failing"
                    break
            if error:
                break
        running_notification_id = "integration_if_any_failure_notification"
        r_notification = RunningNotification.query.filter_by(
            source_application_id=running_notification_id).one_or_none()
        if not r_notification:
            r_notification = RunningNotification(source_application_id=running_notification_id)
        r_notification.content = notification_content
        r_notification.updated_at = datetime.now()
        r_notification.save()


@celery_app.task(bind=True, default_retry_delay=60)
def vulnerability_container_logs_delete_old(*args):
    rootdir = "/var/log/vulnerability_scan_logs"
    if not os.path.isdir(rootdir):
        return
    retention_period = 7
    for subdir in os.listdir(rootdir):
        try:
            logs_timestamp = datetime.strptime(subdir, "%Y-%m-%d_%H-%M-%S-%f")
            limit_timestamp = datetime.now() - timedelta(days=retention_period)
            if logs_timestamp <= limit_timestamp:
                rmdir_recursive(os.path.join(rootdir, subdir))
        except:
            continue


@celery_app.task(bind=True, default_retry_delay=600)
def tag_k8s_cluster_name_in_docs(*args):
    size = 10000
    start_index = 0
    body = {
        "query": {
            "bool": {
                "must_not": {
                    "exists": {
                        "field": "kubernetes_cluster_name"
                    }
                }
            }
        }
    }
    topology_hosts = fetch_topology_data(NODE_TYPE_HOST, format="deepfence")
    host_name_k8s_map = {v.get("host_name", ""): v.get("kubernetes_cluster_name", "")
                         for _, v in topology_hosts.items() if topology_hosts}

    def map_function(hit):
        _id = hit.get('_id')
        scan_data = hit.get('_source')
        return {**hit,
                **{'_source': {'kubernetes_cluster_name': host_name_k8s_map.get(scan_data.get("host_name", ""), "")}}}

    for total_pages, page_count, page_items, page_data in ESConn.scroll(CVE_INDEX, body, page_size=10):
        hits = page_data.get('hits', {}).get('hits', [])
        docs_for_update = map(map_function, host_name_k8s_map, hits)
        try:
            update_success_count = ESConn.bulk_update_docs_improved(docs_for_update)
        except Exception as e:
            continue
        break
    return


@celery_app.task(bind=True, default_retry_delay=60)
def map_cloud_account_arn_to_table(*args):
    """
    Keep cpu_anomaly_top and memory_anomaly_top docs only for 30 minutes
    """
    with app.app_context():
        query_body = {
            "query": {
                "range": {
                    "@timestamp": {
                        "gte": "now-5m/m",
                        "lte": "now/m"
                    }
                }
            }
        }
        scans_in_last_5_mins = ESConn.search(CLOUD_COMPLIANCE_INDEX, query_body, 0, 10000).get('hits', {}).get("hits",
                                                                                                               [])
        for scan_doc in scans_in_last_5_mins:
            resource = scan_doc.get("_source").get("resource")
            region = scan_doc.get("_source").get("region", "")
            if not region:
                region = "global"
            service_name = scan_doc.get("_source").get("cloud_provider") + "_" + scan_doc.get("_source").get(
                "service").lower()
            cloud_resource_nodes_count = CloudResourceNode.query.filter_by(node_id=resource).all()
            # print("resource={} region={} service_name={} cloud_resource_nodes_count={}".format(resource,region,service_name,len(cloud_resource_nodes_count)))
            # already exists
            if len(cloud_resource_nodes_count) == 1:
                if service_name == cloud_resource_nodes_count[0].service_name:
                    # print("1 already exists same service_name: {} cloud_resource_nodes_count: {}".format(service_name,cloud_resource_nodes_count[0].service_name))
                    continue
                elif not cloud_resource_nodes_count[0].service_name:
                    valid_service_name = False
                    for service, table_names in CSPM_RESOURCES_INVERTED.items():
                        if service_name.lower() == service and \
                                cloud_resource_nodes_count[0].node_type in CSPM_RESOURCES_INVERTED.get(service):
                            valid_service_name = True
                    if not valid_service_name:
                        continue
                    # print("2 already exists same service_name: {} cloud_resource_nodes_count: {}".format(service_name,cloud_resource_nodes_count[0].service_name))
                    cloud_resource_nodes_count[0].service_name = service_name
                    cloud_resource_nodes_count[0].save()
                # else:
                #     create_resource_node_aws(scan_doc, service_name, region)
            # multiple resources with different service names
            elif len(cloud_resource_nodes_count) > 1:
                next_resource = next(
                    (x.service_name for x in cloud_resource_nodes_count if x.service_name == service_name), "")
                if next_resource:
                    # print("1 multiple resources service_name exists: {}".format(next_resource))
                    continue
                else:
                    # print("2 multiple resources update service_name: {}".format(scan_doc))
                    create_resource_node_aws(scan_doc, service_name, region)
            # resource doesn't exists
            else:
                create_resource_node_aws(scan_doc, service_name, region)


def create_resource_node_aws(doc, service_name, region):
    # print("create_resource_node_aws: {}".format(doc))
    cloud_provider = doc.get("_source").get("cloud_provider")
    node_type = cloud_provider
    for service, table_names in CSPM_RESOURCES_INVERTED.items():
        if service_name.lower() == service:
            node_type = table_names[0]
    cloud_resource_node_data = CloudResourceNode(
        node_id=doc.get("_source").get("resource"),
        node_type=node_type,
        node_name=service_name,
        cloud_provider=cloud_provider,
        account_id=doc.get("_source").get("node_id"),
        region=region,
        service_name=service_name,
        is_active=True
    )
    try:
        cloud_resource_node_data.save()
    except IntegrityError:
        pass

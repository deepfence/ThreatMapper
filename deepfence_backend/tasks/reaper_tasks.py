import os
from config.app import celery_app, app
from models.user import User
from models.integration import Integration
from models.user_activity_log import UserActivityLog
from models.notification import RunningNotification, VulnerabilityNotification
from datetime import datetime, timedelta
from utils.esconn import ESConn
from utils.constants import CVE_SCAN_LOGS_INDEX, NODE_TYPE_HOST, \
    CVE_SCAN_RUNNING_STATUS, CVE_SCAN_STATUS_QUEUED, CVE_SCAN_STATUS_ERROR, DEEPFENCE_KEY, REPORT_INDEX, \
    CVE_INDEX
from utils.scope import fetch_topology_data
import time
from utils.helper import get_cve_scan_tmp_folder, rmdir_recursive
import requests


@celery_app.task(bind=True, default_retry_delay=60)
def update_deepfence_key_in_redis(*args):
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
        "masked": "false", "type": "cve-scan", "scan_id": cve_status["scan_id"], "node_type": cve_status["node_type"],
        "cve_scan_message": cve_scan_message, "@timestamp": datetime_now.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        "time_stamp": int(time.time() * 1000.0), "host": host_name, "action": CVE_SCAN_STATUS_ERROR,
        "host_name": host_name, "node_id": cve_node_id,
    }
    ESConn.create_doc(CVE_SCAN_LOGS_INDEX, body)
    image_file_folder = get_cve_scan_tmp_folder(
        host_name, cve_status["scan_id"])
    rmdir_recursive(image_file_folder)


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
            last_status_timestamp = datetime.fromtimestamp(
                cve_status["timestamp"] / 1000)
            datetime_now = datetime.now()
            total_diff_minutes = int(
                round((datetime_now - last_status_timestamp).total_seconds() / 60))
            if cve_status["action"] == CVE_SCAN_STATUS_QUEUED:
                # If scan is in QUEUED state for 7 days, then it has failed
                if total_diff_minutes >= 10080:
                    insert_cve_error_doc(cve_status, datetime_now, host, cve_node_id,
                                         "Scan was stopped because it was in queued state for a week. Please start again.")
                    celery_task_id = "cve_scan:" + cve_status["scan_id"]
                    try:
                        celery_app.control.revoke(
                            celery_task_id, terminate=False)
                    except:
                        pass
            elif cve_status["action"] in CVE_SCAN_RUNNING_STATUS:
                # If scan was started 10 minutes ago, still no updated status found, then it has failed
                if total_diff_minutes >= 10:
                    insert_cve_error_doc(cve_status, datetime_now, host, cve_node_id,
                                         "Scan was interrupted. Please restart.")


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
                    "DEL", "https://deepfence-fetcher:8006/df-api/clear", headers=headers, verify=False)
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

    for total_pages, page_count, page_items, page_data in ESConn.scroll(CVE_INDEX, body,page_size=10):
        hits = page_data.get('hits', {}).get('hits', [])
        docs_for_update = map(map_function, host_name_k8s_map, hits)
        try:
            update_success_count = ESConn.bulk_update_docs_improved(docs_for_update)
        except Exception as e:
            continue
        break
    return

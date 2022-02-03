import arrow
from config.app import celery_app, app
from models.container_image_registry import RegistryCredential
from models.scheduler import Scheduler
from models.setting import Setting
from croniter import croniter
from utils import constants
import time
from datetime import datetime
from utils.helper import websocketio_channel_name_format, get_image_cve_status
from config.redisconfig import redis
from utils.esconn import ESConn
from resource_models.node import Node
from utils.reports import prepare_report_download, prepare_report_email_body
from utils.response import set_response
from flask import make_response
import json
import uuid
from copy import deepcopy
from utils.helper import get_all_scanned_node


@celery_app.task
def task_scheduler():
    with app.app_context():
        curr_time = arrow.now(tz="+00:00").datetime.replace(minute=0, second=0, microsecond=0)
        scheduled_tasks = Scheduler.query.filter_by(is_enabled=True).all()
        if not scheduled_tasks:
            return
        for scheduled_task in scheduled_tasks:
            if croniter.match(scheduled_task.cron_expr, curr_time):
                run_node_task(scheduled_task.action, scheduled_task.nodes, scheduled_task.id)


def run_node_task(action, node_action_details, scheduler_id=None):
    with app.app_context():
        curr_time = arrow.now(tz="+00:00").datetime
        if scheduler_id:
            try:
                scheduled_task = Scheduler.query.get(scheduler_id)
                scheduled_task.last_ran_at = curr_time
                scheduled_task.status = "running"
                scheduled_task.save()
            except Exception as ex:
                app.logger.error(ex)
                return

        def save_scheduled_task_status(status):
            if scheduler_id:
                try:
                    scheduled_task = Scheduler.query.get(scheduler_id)
                    scheduled_task.status = status
                    scheduled_task.save()
                except Exception as ex:
                    app.logger.error(ex)

        save_scheduled_task_status("In Progress")
        node_type = node_action_details["node_type"]
        df_id_to_scope_id_map = {}
        topology_data_df_format = {}
        registry_credential = None
        if node_type == constants.NODE_TYPE_REGISTRY_IMAGE:
            try:
                registry_credential = RegistryCredential.query.get(
                    node_action_details["registry_images"]["registry_id"])
            except Exception as ex:
                save_scheduled_task_status("Error: " + str(ex))
                app.logger.error(ex)
                return
        else:
            if not node_action_details.get("node_id_list"):
                node_action_details["node_id_list"] = []
            for i in range(3):
                try:
                    redis_pipe = redis.pipeline()
                    redis_pipe.hgetall(constants.DF_ID_TO_SCOPE_ID_REDIS_KEY_PREFIX + node_type.upper())
                    redis_pipe.get(websocketio_channel_name_format(node_type + "?format=deepfence")[1])
                    redis_resp = redis_pipe.execute()
                    df_id_to_scope_id_map = redis_resp[0]
                    if redis_resp[1]:
                        topology_data_df_format = json.loads(redis_resp[1])
                    if topology_data_df_format and df_id_to_scope_id_map:
                        break
                    else:
                        app.logger.error("topology data is empty, retrying")
                        time.sleep(10)
                except Exception as ex:
                    app.logger.error(ex)
                    time.sleep(10)
        if action in [constants.NODE_ACTION_CVE_SCAN_START, constants.NODE_ACTION_SCHEDULE_CVE_SCAN]:
            if node_type == constants.NODE_TYPE_REGISTRY_IMAGE:
                from config.app import celery_app
                redis_lock_keys = []
                redis_pipe = redis.pipeline()
                for image_name_with_tag in node_action_details["registry_images"]["image_name_with_tag_list"]:
                    lock_key = "{0}:{1}".format(constants.NODE_ACTION_CVE_SCAN_START, image_name_with_tag)
                    redis_pipe.incr(lock_key)
                    redis_lock_keys.append(lock_key)
                redis_resp = redis_pipe.execute()
                time.sleep(1)
                image_cve_status = get_image_cve_status()
                for i, image_name_with_tag in enumerate(
                        node_action_details["registry_images"]["image_name_with_tag_list"]):
                    try:
                        if redis_resp[i] != 1:
                            continue
                        cve_status = image_cve_status.get(image_name_with_tag, {}).get("action", "")
                        if cve_status:
                            if cve_status == constants.CVE_SCAN_STATUS_QUEUED or cve_status in constants.CVE_SCAN_RUNNING_STATUS:
                                continue
                        datetime_now = datetime.now()
                        scan_id = image_name_with_tag + "_" + datetime_now.strftime("%Y-%m-%dT%H:%M:%S") + ".000"
                        body = {
                            "masked": "false", "type": constants.CVE_SCAN_LOGS_INDEX, "scan_id": scan_id, "host": "",
                            "@timestamp": datetime_now.strftime("%Y-%m-%dT%H:%M:%S.%fZ"), "cve_scan_message": "",
                            "action": constants.CVE_SCAN_STATUS_QUEUED, "host_name": "", "node_id": image_name_with_tag,
                            "time_stamp": int(time.time() * 1000.0), "node_type": constants.NODE_TYPE_CONTAINER_IMAGE
                        }
                        ESConn.create_doc(constants.CVE_SCAN_LOGS_INDEX, body)
                        scan_details = {
                            "cve_node_id": image_name_with_tag, "scan_types": node_action_details["scan_type"],
                            "registry_type": registry_credential.registry_type, "scan_id": scan_id,
                            "credential_id": registry_credential.id}
                        celery_task_id = "cve_scan:" + scan_id
                        celery_app.send_task('tasks.vulnerability_scan_worker.vulnerability_scan', args=(),
                                             task_id=celery_task_id, kwargs={"scan_details": scan_details},
                                             queue=constants.VULNERABILITY_SCAN_QUEUE)
                    except Exception as ex:
                        save_scheduled_task_status("Error: " + str(ex))
                        app.logger.error(ex)
                time.sleep(2)
                redis_pipe = redis.pipeline()
                for lock_key in redis_lock_keys:
                    redis.delete(lock_key)
                redis_pipe.execute()
            else:
                node_list = []
                redis_lock_keys = []
                redis_pipe = redis.pipeline()
                for node_id in node_action_details["node_id_list"]:
                    try:
                        node = Node(node_id, df_id_to_scope_id_map=df_id_to_scope_id_map,
                                    topology_data_df_format=topology_data_df_format)
                        if node.type == constants.NODE_TYPE_HOST:
                            lock_key = "{0}:{1}".format(constants.NODE_ACTION_CVE_SCAN_START, node.host_name)
                        else:
                            if not node.image_name_tag:
                                continue
                            lock_key = "{0}:{1}".format(constants.NODE_ACTION_CVE_SCAN_START, node.image_name_tag)
                        if lock_key in redis_lock_keys:
                            # If same image, different container, already selected, don't scan again
                            continue
                        redis_lock_keys.append(lock_key)
                        redis_pipe.incr(lock_key)
                        node_list.append(node)
                    except Exception as ex:
                        save_scheduled_task_status("Error: " + str(ex))
                        app.logger.error(ex)
                if not node_list:
                    error_message = "No node available for scan"
                    save_scheduled_task_status("Error: " + error_message)
                    app.logger.error(error_message)
                    return
                redis_resp = redis_pipe.execute()
                for i, node in enumerate(node_list):
                    if redis_resp[i] != 1:
                        continue
                    try:
                        node.cve_scan_start(node_action_details["scan_type"])
                    except Exception as ex:
                        save_scheduled_task_status("Error: " + str(ex))
                        app.logger.error(ex)
                time.sleep(1)
                redis_pipe = redis.pipeline()
                for lock_key in redis_lock_keys:
                    redis.delete(lock_key)
                redis_pipe.execute()
        elif action == constants.NODE_ACTION_CVE_SCAN_STOP:
            if node_type == constants.NODE_TYPE_REGISTRY_IMAGE:
                from config.app import celery_app
                for image_name_with_tag in node_action_details["registry_images"]["image_name_with_tag_list"]:
                    try:
                        es_response = ESConn.search_by_and_clause(constants.CVE_SCAN_LOGS_INDEX,
                                                                  {"node_id": image_name_with_tag}, 0, size=1)
                        latest_cve_scan_doc = {}
                        cve_scan_list = es_response.get("hits", [])
                        if cve_scan_list:
                            cve_scan_doc = cve_scan_list[0]
                            latest_cve_scan_doc = cve_scan_doc.get('_source', {})
                            latest_cve_scan_doc.update({'_id': cve_scan_doc.get('_id', "")})
                        if latest_cve_scan_doc:
                            status = latest_cve_scan_doc.get("action", "")
                            scan_id = latest_cve_scan_doc.get("scan_id", "")
                            if (status in constants.CVE_SCAN_NOT_RUNNING_STATUS) or (not scan_id):
                                continue
                            elif status != constants.CVE_SCAN_STATUS_QUEUED:
                                continue
                            celery_task_id = "cve_scan:" + scan_id
                            celery_app.control.revoke(celery_task_id, terminate=False)
                            body = {
                                "masked": "false", "type": constants.CVE_SCAN_LOGS_INDEX, "scan_id": scan_id,
                                "cve_scan_message": "Scan stopped by user", "time_stamp": int(time.time() * 1000.0),
                                "@timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ"), "host": "",
                                "action": constants.CVE_SCAN_STATUS_STOPPED, "host_name": "",
                                "node_id": latest_cve_scan_doc.get("node_id", ""),
                                "node_type": constants.NODE_TYPE_CONTAINER_IMAGE
                            }
                            ESConn.create_doc(constants.CVE_SCAN_LOGS_INDEX, body)
                    except Exception as ex:
                        save_scheduled_task_status("Error: " + str(ex))
                        app.logger.error(ex)
            else:
                for node_id in node_action_details["node_id_list"]:
                    try:
                        node = Node(node_id, df_id_to_scope_id_map=df_id_to_scope_id_map,
                                    topology_data_df_format=topology_data_df_format)
                        node.cve_scan_stop()
                    except Exception as ex:
                        save_scheduled_task_status("Error: " + str(ex))
                        app.logger.error(ex)
        elif action == constants.NODE_ACTION_SCHEDULE_SEND_REPORT:
            domain_name = ""
            console_url_setting = Setting.query.filter_by(key="console_url").one_or_none()
            if console_url_setting and console_url_setting.value:
                domain_name = console_url_setting.value.get("value")
            report_id = uuid.uuid4()
            body = {
                "type": constants.REPORT_INDEX,
                "report_id": report_id,
                "status": "started",
                "masked": "false",
                "@timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
            ESConn.create_doc(constants.REPORT_INDEX, body, refresh="wait_for")
            if node_action_details.get('include_dead_nodes') is True:
                if node_type == 'host':
                    if len(node_action_details['filters'].get('host_name', [])) == 0:
                        node_action_details['filters']['host_name'] = get_all_scanned_node()
            from config.app import celery_app
            celery_app.send_task(
                'tasks.common_worker.generate_report', args=(),
                kwargs={"report_id": report_id, "filters": node_action_details.get("filters", {}),
                        "lucene_query_string": "",
                        "number": node_action_details.get("duration", {}).get("number", 0),
                        "time_unit": node_action_details.get("duration", {}).get("time_unit", "day"),
                        "domain_name": domain_name, "resources": node_action_details.get("resources", {}),
                        "file_type": node_action_details.get("file_type", "xlsx"), "node_type": node_type,
                        "include_dead_nodes": node_action_details.get("include_dead_nodes", False),
                        "report_email": node_action_details["report_email"]})
            return set_response(data="Started")
        elif action == constants.NODE_ACTION_DOWNLOAD_REPORT:
            domain_name = ""
            console_url_setting = Setting.query.filter_by(key="console_url").one_or_none()
            if console_url_setting and console_url_setting.value:
                domain_name = console_url_setting.value.get("value")
            report_id = uuid.uuid4()
            body = {
                "type": constants.REPORT_INDEX,
                "report_id": report_id,
                "status": "started",
                "masked": "false",
                "@timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
            ESConn.create_doc(constants.REPORT_INDEX, body, refresh="wait_for")
            if node_action_details.get('include_dead_nodes') is True:
                if node_type == 'host':
                    if len(node_action_details['filters'].get('host_name', [])) == 0:
                        node_action_details['filters']['host_name'] = get_all_scanned_node()
            from config.app import celery_app
            celery_app.send_task(
                'tasks.common_worker.generate_report', args=(),
                kwargs={"report_id": report_id, "filters": node_action_details.get("filters", {}),
                        "lucene_query_string": "",
                        "number": node_action_details.get("duration", {}).get("number", 0),
                        "time_unit": node_action_details.get("duration", {}).get("time_unit", "day"),
                        "domain_name": domain_name, "resources": node_action_details.get("resources", {}),
                        "file_type": node_action_details.get("file_type", "xlsx"), "node_type": node_type,
                        "include_dead_nodes": node_action_details.get("include_dead_nodes", False),
                        "report_email": ""})
            return set_response(data="Started")
        save_scheduled_task_status("Success")

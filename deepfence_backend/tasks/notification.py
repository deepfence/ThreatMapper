import arrow
import pypd
import requests
import json
import calendar
import time
from jira import JIRA, JIRAError
from config.app import app, celery_app
from models.notification import UserActivityNotification, VulnerabilityNotification, MalwareNotification, SecretNotification, CloudtrailAlertNotification
from models.user_activity_log import UserActivityLog
from models.user import User
from utils.common import get_epochtime
from utils.constants import FILTER_TYPE_IMAGE_NAME_WITH_TAG, CVE_ES_TYPE, USER_DEFINED_TAGS, MALWARE_SCAN_ES_TYPE, SECRET_SCAN_ES_TYPE, \
    NODE_TYPE_POD, FILTER_TYPE_HOST_NAME, FILTER_TYPE_IMAGE_NAME, FILTER_TYPE_KUBE_CLUSTER_NAME, \
    FILTER_TYPE_KUBE_NAMESPACE, FILTER_TYPE_TAGS, NODE_TYPE_HOST, NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_CONTAINER, \
    CLOUDTRAIL_ALERT_ES_TYPE, COMPLIANCE_ES_TYPE, COMPLIANCE_LINUX_HOST, COMPLIANCE_TYPE_ASFF_MAPPING, \
    COMPLIANCE_STATUS_ASFF_MAPPING, FILTER_TYPE_SEVERITY
import datetime
from utils.scope import fetch_topology_data


@celery_app.task
def scheduler(time=None):
    """
    The job of the scheduler is to figure out which notifications to be sent.
    Once the notifications are figured, the process is delegated to digest task. 
    """
    with app.app_context():
        app.logger.info("Sending notification digest")
        if not time:
            time = arrow.now().datetime
        active_user_ids = [user.id for user in User.query.filter_by(isActive=True).all()]

        for notification in UserActivityNotification.query.filter(
                UserActivityNotification.user_id.in_(active_user_ids)).all():
            # if duration_in_mins is -ve, its immediate notification
            if notification.duration_in_mins > 0 and arrow.get(time).minute % notification.duration_in_mins == 0:
                user_activity_digest(time, notification.id)


def is_notification_filters_set(filters):
    if filters and (filters.get(FILTER_TYPE_HOST_NAME, []) or filters.get(FILTER_TYPE_IMAGE_NAME, []) or
                    filters.get(FILTER_TYPE_KUBE_CLUSTER_NAME, []) or filters.get(FILTER_TYPE_KUBE_NAMESPACE, []) or
                    filters.get(FILTER_TYPE_TAGS, []) or filters.get(FILTER_TYPE_SEVERITY, [])):
        return True
    return False


def get_k8s_cluster_name_namespace_for_pods(pod_ids, topology_pods):
    k8s_cluster_names = []
    k8s_namespaces = []
    for node_id, pod_details in topology_pods.items():
        if node_id in pod_ids:
            k8s_cluster_names.append(pod_details["kubernetes_cluster_name"])
            k8s_namespaces.append(pod_details["kubernetes_namespace"])
    return list(set(k8s_cluster_names)), list(set(k8s_namespaces))


def get_k8s_cluster_name_namespace_for_image(image_name, topology_data):
    pod_ids = []
    for node_id, container_details in topology_data[1].items():
        if container_details.get("image_name_with_tag", "") == image_name:
            for parent in container_details.get("parents", []):
                if parent["type"] == NODE_TYPE_POD:
                    pod_ids.append(parent["id"])
    if pod_ids:
        return get_k8s_cluster_name_namespace_for_pods(list(set(pod_ids)), topology_data[3])
    return [], []


def get_k8s_cluster_name_namespace_for_container(container_name, host_name, topology_data):
    pod_ids = []
    for node_id, container_details in topology_data[1].items():
        if container_details.get("name", "") == container_name and container_details.get("host_name", "") == host_name:
            for parent in container_details.get("parents", []):
                if parent["type"] == NODE_TYPE_POD:
                    pod_ids.append(parent["id"])
    if pod_ids:
        return get_k8s_cluster_name_namespace_for_pods(list(set(pod_ids)), topology_data[3])
    return [], []


def filter_vulnerability_notification(filters, cve, topology_data):
    if is_notification_filters_set(filters):
        if filters.get(FILTER_TYPE_HOST_NAME, []):
            if cve["cve_container_image"] == cve["host_name"]:
                if cve["host_name"] in filters[FILTER_TYPE_HOST_NAME]:
                    return True
        if filters.get(FILTER_TYPE_IMAGE_NAME, []):
            if cve["cve_container_image"] != cve["host_name"]:
                if cve["cve_container_image"] in filters[FILTER_TYPE_IMAGE_NAME]:
                    return True
        if filters.get(FILTER_TYPE_IMAGE_NAME_WITH_TAG, []):
            if cve["cve_container_image"] != cve["host_name"]:
                if cve["cve_container_image"] in filters[FILTER_TYPE_IMAGE_NAME_WITH_TAG]:
                    return True
        if filters.get(FILTER_TYPE_SEVERITY, []):
            if cve.get("cve_severity", "") in filters.get(FILTER_TYPE_SEVERITY, []):
                return True
        if filters.get(FILTER_TYPE_KUBE_CLUSTER_NAME, []):
            if cve["cve_container_image"] != cve["host_name"]:
                k8s_cluster_names, k8s_namespaces = get_k8s_cluster_name_namespace_for_image(cve["cve_container_image"],
                                                                                             topology_data)
                if any(item in filters[FILTER_TYPE_KUBE_CLUSTER_NAME] for item in k8s_cluster_names):
                    return True
            else:
                for node_id, pod_details in topology_data[3].items():
                    if cve["host_name"] == pod_details.get("host_name", ""):
                        if pod_details["kubernetes_cluster_name"] in filters[FILTER_TYPE_KUBE_CLUSTER_NAME]:
                            return True
        if filters.get(FILTER_TYPE_KUBE_NAMESPACE, []):
            if cve["cve_container_image"] != cve["host_name"]:
                k8s_cluster_names, k8s_namespaces = get_k8s_cluster_name_namespace_for_image(cve["cve_container_image"],
                                                                                             topology_data)
                if any(item in filters[FILTER_TYPE_KUBE_NAMESPACE] for item in k8s_namespaces):
                    return True
        if filters.get(FILTER_TYPE_TAGS, []):
            if cve["cve_container_image"] == cve["host_name"]:
                for node_id, host_details in topology_data[0].items():
                    if cve["host_name"] == host_details.get("host_name", ""):
                        if any(item in filters[FILTER_TYPE_TAGS] for item in host_details.get(USER_DEFINED_TAGS, [])):
                            return True
            if cve["cve_container_image"] != cve["host_name"]:
                if cve.get("cve_container_name", "") and cve["cve_container_name"] != cve["host_name"]:
                    for node_id, container_details in topology_data[1].items():
                        if cve["cve_container_name"] == container_details.get("name", ""):
                            if any(item in filters[FILTER_TYPE_TAGS] for item in
                                   container_details.get(USER_DEFINED_TAGS, [])):
                                return True
                else:
                    for node_id, image_details in topology_data[2].items():
                        if cve["cve_container_image"] == image_details.get("name", ""):
                            if any(item in filters[FILTER_TYPE_TAGS] for item in
                                   image_details.get(USER_DEFINED_TAGS, [])):
                                return True
        return False
    else:
        return True


def filter_malware_notification(filters, malware, topology_data):
    if is_notification_filters_set(filters):
        if filters.get(FILTER_TYPE_HOST_NAME, []):
            if malware["container_image"] == malware["host_name"]:
                if malware["host_name"] in filters[FILTER_TYPE_HOST_NAME]:
                    return True
        if filters.get(FILTER_TYPE_IMAGE_NAME, []):
            if malware["container_image"] != malware["host_name"]:
                if malware["container_image"] in filters[FILTER_TYPE_IMAGE_NAME]:
                    return True
        if filters.get(FILTER_TYPE_IMAGE_NAME_WITH_TAG, []):
            if malware["container_image"] != malware["host_name"]:
                if malware["container_image"] in filters[FILTER_TYPE_IMAGE_NAME_WITH_TAG]:
                    return True
        if filters.get(FILTER_TYPE_SEVERITY, []):
            if malware.get("FileSeverity", "") in filters.get(FILTER_TYPE_SEVERITY, []):
                return True
        if filters.get(FILTER_TYPE_KUBE_CLUSTER_NAME, []):
            if malware["container_image"] != malware["host_name"]:
                k8s_cluster_names, k8s_namespaces = get_k8s_cluster_name_namespace_for_image(malware["container_image"],
                                                                                             topology_data)
                if any(item in filters[FILTER_TYPE_KUBE_CLUSTER_NAME] for item in k8s_cluster_names):
                    return True
            else:
                for node_id, pod_details in topology_data[3].items():
                    if malware["host_name"] == pod_details.get("host_name", ""):
                        if pod_details["kubernetes_cluster_name"] in filters[FILTER_TYPE_KUBE_CLUSTER_NAME]:
                            return True
        if filters.get(FILTER_TYPE_KUBE_NAMESPACE, []):
            if malware["container_image"] != malware["host_name"]:
                k8s_cluster_names, k8s_namespaces = get_k8s_cluster_name_namespace_for_image(malware["container_image"],
                                                                                             topology_data)
                if any(item in filters[FILTER_TYPE_KUBE_NAMESPACE] for item in k8s_namespaces):
                    return True
        if filters.get(FILTER_TYPE_TAGS, []):
            if malware["container_image"] == malware["host_name"]:
                for node_id, host_details in topology_data[0].items():
                    if malware["host_name"] == host_details.get("host_name", ""):
                        if any(item in filters[FILTER_TYPE_TAGS] for item in host_details.get(USER_DEFINED_TAGS, [])):
                            return True
            if malware["container_image"] != malware["host_name"]:
                if malware.get("container_name", "") and malware["container_name"] != malware["host_name"]:
                    for node_id, container_details in topology_data[1].items():
                        if malware["container_name"] == container_details.get("name", ""):
                            if any(item in filters[FILTER_TYPE_TAGS] for item in
                                   container_details.get(USER_DEFINED_TAGS, [])):
                                return True
                else:
                    for node_id, image_details in topology_data[2].items():
                        if malware["container_image"] == image_details.get("name", ""):
                            if any(item in filters[FILTER_TYPE_TAGS] for item in
                                   image_details.get(USER_DEFINED_TAGS, [])):
                                return True
        return False
    else:
        return True


def filter_secret_notification(filters, secret, topology_data):
    if is_notification_filters_set(filters):
        if filters.get(FILTER_TYPE_HOST_NAME, []):
            if secret["container_image"] == secret["host_name"]:
                if secret["host_name"] in filters[FILTER_TYPE_HOST_NAME]:
                    return True
        if filters.get(FILTER_TYPE_IMAGE_NAME, []):
            if secret["container_image"] != secret["host_name"]:
                if secret["container_image"] in filters[FILTER_TYPE_IMAGE_NAME]:
                    return True
        if filters.get(FILTER_TYPE_IMAGE_NAME_WITH_TAG, []):
            if secret["container_image"] != secret["host_name"]:
                if secret["container_image"] in filters[FILTER_TYPE_IMAGE_NAME_WITH_TAG]:
                    return True
        if filters.get(FILTER_TYPE_SEVERITY, []):
            if secret.get("Severity", {}).get("level", "") in filters.get(FILTER_TYPE_SEVERITY, []):
                return True
        if filters.get(FILTER_TYPE_KUBE_CLUSTER_NAME, []):
            if secret["container_image"] != secret["host_name"]:
                k8s_cluster_names, k8s_namespaces = get_k8s_cluster_name_namespace_for_image(secret["container_image"],
                                                                                             topology_data)
                if any(item in filters[FILTER_TYPE_KUBE_CLUSTER_NAME] for item in k8s_cluster_names):
                    return True
            else:
                for node_id, pod_details in topology_data[3].items():
                    if secret["host_name"] == pod_details.get("host_name", ""):
                        if pod_details["kubernetes_cluster_name"] in filters[FILTER_TYPE_KUBE_CLUSTER_NAME]:
                            return True
        if filters.get(FILTER_TYPE_KUBE_NAMESPACE, []):
            if secret["container_image"] != secret["host_name"]:
                k8s_cluster_names, k8s_namespaces = get_k8s_cluster_name_namespace_for_image(secret["container_image"],
                                                                                             topology_data)
                if any(item in filters[FILTER_TYPE_KUBE_NAMESPACE] for item in k8s_namespaces):
                    return True
        if filters.get(FILTER_TYPE_TAGS, []):
            if secret["container_image"] == secret["host_name"]:
                for node_id, host_details in topology_data[0].items():
                    if secret["host_name"] == host_details.get("host_name", ""):
                        if any(item in filters[FILTER_TYPE_TAGS] for item in host_details.get(USER_DEFINED_TAGS, [])):
                            return True
            if secret["container_image"] != secret["host_name"]:
                if secret.get("container_name", "") and secret["container_name"] != secret["host_name"]:
                    for node_id, container_details in topology_data[1].items():
                        if secret["container_name"] == container_details.get("name", ""):
                            if any(item in filters[FILTER_TYPE_TAGS] for item in
                                   container_details.get(USER_DEFINED_TAGS, [])):
                                return True
                else:
                    for node_id, image_details in topology_data[2].items():
                        if secret["container_image"] == image_details.get("name", ""):
                            if any(item in filters[FILTER_TYPE_TAGS] for item in
                                   image_details.get(USER_DEFINED_TAGS, [])):
                                return True
        return False
    else:
        return True


def filter_compliance_notification(filters, compliance, topology_data):
    if is_notification_filters_set(filters):
        if filters.get(FILTER_TYPE_HOST_NAME, []):
            if compliance["node_type"] == NODE_TYPE_HOST:
                if compliance["node_name"] in filters[FILTER_TYPE_HOST_NAME]:
                    return True
        if filters.get(FILTER_TYPE_IMAGE_NAME_WITH_TAG, []):
            if compliance["node_type"] == NODE_TYPE_CONTAINER_IMAGE:
                if compliance["node_name"] in filters[FILTER_TYPE_IMAGE_NAME_WITH_TAG]:
                    return True
            elif compliance["node_type"] == NODE_TYPE_CONTAINER:
                node_name = compliance["node_name"][compliance["node_name"].find("/") + 1:]
                for node_id, container_details in topology_data[1].items():
                    if node_name == container_details.get("name", ""):
                        if container_details.get("image_name_with_tag", "") in filters[FILTER_TYPE_IMAGE_NAME_WITH_TAG]:
                            return True
        if filters.get(FILTER_TYPE_KUBE_CLUSTER_NAME, []):
            if compliance["node_type"] == NODE_TYPE_HOST:
                for node_id, pod_details in topology_data[3].items():
                    if compliance["node_name"] == pod_details.get("host_name", ""):
                        if pod_details["kubernetes_cluster_name"] in filters[FILTER_TYPE_KUBE_CLUSTER_NAME]:
                            return True
            elif compliance["node_type"] == NODE_TYPE_CONTAINER:
                container_name = compliance["node_name"][compliance["node_name"].find("/") + 1:]
                host_name = compliance["node_name"][:compliance["node_name"].find("/")]
                k8s_cluster_names, k8s_namespaces = \
                    get_k8s_cluster_name_namespace_for_container(container_name, host_name, topology_data)
                if any(item in filters[FILTER_TYPE_KUBE_CLUSTER_NAME] for item in k8s_cluster_names):
                    return True
            elif compliance["node_type"] == NODE_TYPE_CONTAINER_IMAGE:
                k8s_cluster_names, k8s_namespaces = get_k8s_cluster_name_namespace_for_image(compliance["node_name"],
                                                                                             topology_data)
                if any(item in filters[FILTER_TYPE_KUBE_CLUSTER_NAME] for item in k8s_cluster_names):
                    return True
        if filters.get(FILTER_TYPE_KUBE_NAMESPACE, []):
            if compliance["node_type"] == NODE_TYPE_HOST:
                for node_id, pod_details in topology_data[3].items():
                    if compliance["node_name"] == pod_details.get("host_name", ""):
                        if pod_details["kubernetes_namespace"] in filters[FILTER_TYPE_KUBE_NAMESPACE]:
                            return True
            elif compliance["node_type"] == NODE_TYPE_CONTAINER:
                container_name = compliance["node_name"][compliance["node_name"].find("/") + 1:]
                host_name = compliance["node_name"][:compliance["node_name"].find("/")]
                k8s_cluster_names, k8s_namespaces = \
                    get_k8s_cluster_name_namespace_for_container(container_name, host_name, topology_data)
                if any(item in filters[FILTER_TYPE_KUBE_NAMESPACE] for item in k8s_namespaces):
                    return True
            elif compliance["node_type"] == NODE_TYPE_CONTAINER_IMAGE:
                k8s_cluster_names, k8s_namespaces = get_k8s_cluster_name_namespace_for_image(compliance["node_name"],
                                                                                             topology_data)
                if any(item in filters[FILTER_TYPE_KUBE_NAMESPACE] for item in k8s_namespaces):
                    return True
        if filters.get(FILTER_TYPE_TAGS, []):
            if compliance["node_type"] == NODE_TYPE_HOST:
                for node_id, host_details in topology_data[0].items():
                    if compliance["node_name"] == host_details.get("host_name", ""):
                        if any(item in filters[FILTER_TYPE_TAGS] for item in host_details.get(USER_DEFINED_TAGS, [])):
                            return True
            elif compliance["node_type"] == NODE_TYPE_CONTAINER:
                container_name = compliance["node_name"][compliance["node_name"].find("/") + 1:]
                host_name = compliance["node_name"][:compliance["node_name"].find("/")]
                for node_id, container_details in topology_data[1].items():
                    if container_name == container_details.get("name", "") and \
                            host_name == container_details.get("host_name", ""):
                        if any(item in filters[FILTER_TYPE_TAGS] for item in
                               container_details.get(USER_DEFINED_TAGS, [])):
                            return True
            elif compliance["node_type"] == NODE_TYPE_CONTAINER_IMAGE:
                for node_id, image_details in topology_data[2].items():
                    if compliance["node_name"] == image_details.get("name", ""):
                        if any(item in filters[FILTER_TYPE_TAGS] for item in
                               image_details.get(USER_DEFINED_TAGS, [])):
                            return True
        return False
    else:
        return True

def user_activity_digest(time, notification_id):
    """
    Get the digest data from Postgres, based on the datetime and duration of the notification
    and send.

    Notification will not be sent if there are no alerts.
    """
    with app.app_context():
        new_cursor_id = None
        notification = UserActivityNotification.query.get(notification_id)
        if not notification:
            app.logger.debug("No integration found with id [{}]".format(notification_id))
            return
        # get data from postgres
        response = []
        if notification.cursor_id:
            digest_contents = UserActivityLog.query.filter(UserActivityLog.id > notification.cursor_id).order_by(
                UserActivityLog.id.asc()).all()
        else:
            digest_contents = UserActivityLog.query.order_by(UserActivityLog.id.asc()).all()
        for content in digest_contents:
            response.append(content.pretty_print())
            new_cursor_id = content.id
        # Send batches of size 50
        try:
            notification.send(response, notification_id=notification.id)
            if new_cursor_id:
                notification.cursor_id = new_cursor_id
                notification.save()
        except Exception as ex:
            app.logger.error("Error sending notification: {0}".format(ex))


def save_integrations_status(notification_id, resource_type, msg):
    notification_obj = None
    if resource_type == CVE_ES_TYPE:
        notification_obj = VulnerabilityNotification
    if resource_type == MALWARE_SCAN_ES_TYPE:
            notification_obj = MalwareNotification
    if resource_type == SECRET_SCAN_ES_TYPE:
        notification_obj = SecretNotification
    elif resource_type == CLOUDTRAIL_ALERT_ES_TYPE:
        notification_obj = CloudtrailAlertNotification
    else:
        return
    event = notification_obj.query.filter_by(id=notification_id).one_or_none()
    if event:
        event.error_msg = str(msg)
        try:
            event.save()
        except Exception as ex:
            app.logger.error("Error saving system event: {0}".format(ex))


@celery_app.task(bind=True, default_retry_delay=1 * 60)
def send_slack_notification(self, slack_conf, payload, notification_id, resource_type):
    app.logger.info("Sending slack notification")
    with app.app_context():
        try:
            response = requests.post(slack_conf["webhook_url"], json={"text": payload})
            if response.status_code == 200:
                save_integrations_status(notification_id, resource_type, "")
            else:
                error_text = response.text
                app.logger.error("Error sending slack notification [{}]".format(error_text))
                save_integrations_status(notification_id, resource_type, "Error in Slack: {0}".format(error_text))
        except Exception as exc:
            save_integrations_status(notification_id, resource_type, exc)
            app.logger.error(
                "Slack notification failed. webhook: [{}], error: [{}]".format(slack_conf["webhook_url"], exc))


@celery_app.task(bind=True, default_retry_delay=1 * 60)
def create_splunk_event(self, splunk_conf, payloads, notification_id, resource_type):
    """
    Definition - this function is responsible for sending notification to Splunk

    Argument Description - 
    splunk_conf : 
    {
        'api_url': '',
        'token': ''
    }
    payloads:
    {
        'summary': 'this is an error event!',
        'severity': 'critical',
    }
    """

    with app.app_context():
        app.logger.info("Sending Splunk notification")
        try:
            curr_ts = get_epochtime()
            for payload in payloads:
                if "@timestamp" not in payload:
                    payload["@timestamp"] = curr_ts
                payload["timestamp"] = payload.pop("@timestamp")

                headers = {"Authorization": "Splunk {0}".format(splunk_conf['token'])}
                r = requests.post(splunk_conf['api_url'], data=json.dumps({"event": payload}), headers=headers,
                                  verify=False)
                response, status = json.loads(r.content), r.status_code
                if status == 200 and response['text'] == 'Success':
                    app.logger.info(
                        "[Splunk] Sending data to splunk has been successful, we received text:{0} and response status {1}".format(
                            response['text'], status))
                    save_integrations_status(notification_id, resource_type, "")
                else:
                    app.logger.error(
                        "[Splunk] Sending data to splunk has been failed, we received text:{0} and response status {1}".format(
                            response['text'], status))
                    save_integrations_status(notification_id, resource_type,
                                             "Sending data to splunk failed, we received text:{0} and response status {1}".format(
                                                 response['text'], status))
        except Exception as exc:
            app.logger.error("Splunk notification failed. api: [{}], error: [{}]".format(splunk_conf["api_url"], exc))
            save_integrations_status(notification_id, resource_type, exc)


@celery_app.task(bind=True, default_retry_delay=1 * 60)
def create_pagerduty_event(self, pagerduty_conf, alert_level, payload, summary, notification_id, resource_type):
    """
    Payload sample:
    {
        'summary': 'this is an error event!',
        'severity': 'critical',
        'source': 'deepfence',
    }
    """
    # app.logger.info("Sending pagerduty notification")
    with app.app_context():
        pagerduty_severity_mapping = {
            "critical": "critical",
            "high": "error",
            "medium": "warning",
            "low": "info",
            "info": "info"
        }

        try:
            pypd.api_key = pagerduty_conf["api_key"]
            pypd.EventV2.create(data={
                'routing_key': pagerduty_conf["service_key"],
                'event_action': 'trigger',
                'payload': {
                    'summary': summary,
                    'severity': pagerduty_severity_mapping[alert_level],
                    'source': 'deepfence',
                    'custom_details': {
                        "alerts": payload
                    }
                }
            })
            save_integrations_status(notification_id, resource_type, "")
        except Exception as exc:
            app.logger.error("Pager duty notification failed. Error: [{}]".format(exc))
            save_integrations_status(notification_id, resource_type, "Error in Pager duty: {0}".format(exc))


@celery_app.task(bind=True, default_retry_delay=1 * 60)
def send_sumo_logic_notification(self, sumo_logic_conf, payload, notification_id, resource_type):
    with app.app_context():
        for content in payload:
            try:
                requests.post(sumo_logic_conf["api_url"], json=content, headers={'Content-Type': 'application/json'})
                save_integrations_status(notification_id, resource_type, "")
            except Exception as exc:
                app.logger.error(
                    "Sumo Logic notification failed. room:[{}], error:[{}]".format(sumo_logic_conf["api_url"], exc))
                save_integrations_status(notification_id, resource_type, "Error in Sumo Logic: {0}".format(exc))


@celery_app.task(bind=True, default_retry_delay=1 * 60)
def send_jira_notification(self, config, payloads, notification_id, resource_type, prefix=None):
    with app.app_context():
        try:
            if not config.get('api_token'):
                jclient = JIRA(config.get('jira_site_url'), auth=(config.get('username'), config.get('password')),
                               options={"verify": False})
            else:
                jclient = JIRA(config.get('jira_site_url'),
                               basic_auth=(config.get('username'), config.get('api_token')), options={"verify": False})
            index = 1
            gmt = time.gmtime()
            ts = calendar.timegm(gmt)
            for payload in payloads:
                if prefix is None:
                    summary = "Deepfence Notification"
                else:
                    if len(payloads) > 1:
                        summary = "{0} {1} - Deepfence - {2} of {3}".format(ts, prefix, index, len(payloads))
                        index += 1
                    else:
                        summary = "{0} {1} - Deepfence".format(ts, prefix)
                issue_number = jclient.create_issue(project=config.get('jira_project_key'),
                                     summary=summary,
                                     description=payload,
                                     issuetype={'name': config.get('issue_type')})
                if config.get('assignee'):
                    issue_created = jclient.issue(issue_number)
                    jclient.assign_issue(issue_created.id, config.get('assignee'))
                
        except JIRAError as e:
            save_integrations_status(notification_id, resource_type, e)
        except Exception as exc:
            save_integrations_status(notification_id, resource_type, "Error in Jira: {0}".format(exc))
            app.logger.error("Jira notification failed. Site:[{}], error:[{}]".format(config.get("jira_site_url"), exc))
        else:
            save_integrations_status(notification_id, resource_type, "")


@celery_app.task(bind=True, default_retry_delay=1 * 60)
def send_http_endpoint_notification(self, http_endpoint_conf, payload, notification_id, resource_type):
    with app.app_context():
        try:
            headers = {'Content-Type': 'application/json'}
            if http_endpoint_conf['authorization_key']:
                headers['Authorization'] = http_endpoint_conf['authorization_key']

            response = requests.post(http_endpoint_conf["api_url"], json=payload, headers=headers, verify=False)
            if response.status_code in [200, 201, 204]:
                save_integrations_status(notification_id, resource_type, "")
            else:
                save_integrations_status(notification_id, resource_type, response.text)
        except Exception as exc:
            app.logger.error(
                "HTTP Endpoint notification failed. url:[{}], error:[{}]".format(http_endpoint_conf["api_url"], exc))
            save_integrations_status(notification_id, resource_type, "Error in HTTP endpoint: {0}".format(exc))


@celery_app.task(bind=True, default_retry_delay=1 * 60)
def send_google_chronicle_notification(self, chronicle_endpoint_conf, payload, notification_id, resource_type):
    with app.app_context():
        try:
            headers = {'Content-Type': 'application/json'}
            if chronicle_endpoint_conf['authorization_key']:
                headers['Authorization'] = chronicle_endpoint_conf['authorization_key']

            response = requests.post(chronicle_endpoint_conf["api_url"], json=payload, headers=headers, verify=False)
            if response.status_code in [200, 201, 204]:
                save_integrations_status(notification_id, resource_type, "")
            else:
                save_integrations_status(notification_id, resource_type, response.text)
        except Exception as exc:
            app.logger.error(
                "HTTP Endpoint notification failed. url:[{}], error:[{}]".format(chronicle_endpoint_conf["api_url"],
                                                                                 exc))
            save_integrations_status(notification_id, resource_type, "Error in HTTP endpoint: {0}".format(exc))


def map_payload_to_findings(payload, resource_type, region, account_id):
    findings = []
    if resource_type == CVE_ES_TYPE:
        hosts = fetch_topology_data(node_type=NODE_TYPE_HOST, format="scope")
        for cve in payload:
            resources = []
            if cve["node_type"] == NODE_TYPE_HOST:
                scope_resource = hosts.get("{};<{}>".format(cve["host_name"], cve["node_type"]), None)
                if scope_resource:
                    cloud_metadata = list(filter(lambda x: x["id"] == "cloud_metadata",
                                                 scope_resource.get("metadata", [])))
                    if cloud_metadata:
                        try:
                            cloud_metadata_value = json.loads(cloud_metadata[0]["value"])
                            resources.append({
                                "Type": "AwsEc2Instance",
                                "Id": "arn:aws:ec2:{}:{}:instance/{}".format(cloud_metadata_value["region"],
                                                                             account_id,
                                                                             cloud_metadata_value["instance_id"])
                            })
                        except ValueError:
                            continue
                    else:
                        continue
                else:
                    continue
            package_name = ""
            package_version = ""
            package_split = cve["cve_caused_by_package"].split(":", 1)
            if package_split:
                package_name = package_split[0]
                package_version = package_split[1]

            findings.append({
                "ProductArn": "arn:aws:securityhub:{region}:{account_id}:product/{account_id}/default".format(
                    region=region, account_id=account_id
                ),
                "AwsAccountId": account_id,
                "CreatedAt": cve["@timestamp"],
                "Description": cve["cve_description"],
                "Title": cve["cve_id"],
                "UpdatedAt": cve["@timestamp"],
                "GeneratorId": "deepfence-vulnerability-mapper-v1-0",
                "Id": "{}/{}/{}".format(region, account_id, cve["doc_id"]),
                "Resources": resources,
                "SchemaVersion": "2018-10-08",
                "Severity": {"Label": cve["cve_severity"].upper(), "Original": str(cve["cve_cvss_score"])},
                "Types": ["Software and Configuration Checks/Vulnerabilities/CVE"],
                "Vulnerabilities": [{
                    "Id": cve["cve_id"],
                    "ReferenceUrls": [cve["cve_link"]],
                    "VulnerablePackages": [{
                        "Name": package_name,
                        "Version": package_version,
                    }]
                }]
            })
        return findings
    elif resource_type == COMPLIANCE_ES_TYPE:
        hosts = fetch_topology_data(node_type=NODE_TYPE_HOST, format="scope")
        for compliance in payload:
            resources = []
            if compliance.get("compliance_node_type", "") == COMPLIANCE_LINUX_HOST:
                scope_resource = hosts.get(compliance["node_id"], None)
                if scope_resource:
                    cloud_metadata = list(filter(lambda x: x["id"] == "cloud_metadata",
                                                 scope_resource.get("metadata", [])))
                    if cloud_metadata:
                        try:
                            cloud_metadata_value = json.loads(cloud_metadata[0]["value"])
                            resources.append({
                                "Type": "AwsEc2Instance",
                                "Id": "arn:aws:ec2:{}:{}:instance/{}".format(cloud_metadata_value["region"],
                                                                             account_id,
                                                                             cloud_metadata_value["instance_id"])
                            })
                        except ValueError:
                            continue
                    else:
                        continue
                else:
                    continue
            findings.append({
                "ProductArn": "arn:aws:securityhub:{region}:{account_id}:product/{account_id}/default".format(
                    region=region, account_id=account_id
                ),
                "AwsAccountId": account_id,
                "CreatedAt": compliance["@timestamp"],
                "Description": compliance["description"],
                "Title": compliance["test_category"],
                "UpdatedAt": compliance["@timestamp"],
                "GeneratorId": "deepfence-compliance-v1-0",
                "Id": "{}/{}/{}".format(region, account_id, compliance["doc_id"]),
                "Resources": resources,
                "SchemaVersion": "2018-10-08",
                "Severity": {"Label": compliance["status"].upper(), "Original": str(compliance["test_severity"])},
                "Types": [COMPLIANCE_TYPE_ASFF_MAPPING.get(compliance["compliance_check_type"])],
                "Compliance": {
                    "Status": COMPLIANCE_STATUS_ASFF_MAPPING.get(compliance["status"])
                }
            })
        return findings
    else:
        return findings


@celery_app.task(bind=True, default_retry_delay=1 * 60)
def send_aws_security_hub_notification(self, security_hub_conf, payload, notification_id, resource_type):
    with app.app_context():
        try:
            import boto3

            def default(o):
                if isinstance(o, (datetime.date, datetime.datetime)):
                    return o.isoformat()

            security_hub_client = boto3.client('securityhub', aws_access_key_id=security_hub_conf["aws_access_key"],
                                               region_name=security_hub_conf["region_name"],
                                               aws_secret_access_key=security_hub_conf["aws_secret_key"])
            findings = map_payload_to_findings(payload, resource_type, security_hub_conf["region_name"],
                                               security_hub_conf["aws_account_id"][0])
            security_hub_client.batch_import_findings(Findings=findings)
            save_integrations_status(notification_id, resource_type, "")
        except Exception as exc:
            app.logger.error("Security Hub notification failed, error:[{}]".format(exc))
            save_integrations_status(notification_id, resource_type, "Error in Security Hub: {0}".format(exc))


@celery_app.task(bind=True, default_retry_delay=1 * 60)
def send_notification_to_es(self, es_conf, payloads, notification_id, resource_type):
    with app.app_context():
        try:
            headers = {"Content-Type": "application/x-ndjson"}
            if es_conf["auth_header"]:
                headers["Authorization"] = es_conf["auth_header"]
            bulk_query = ""
            for payload in payloads:
                bulk_query += '{"index":{"_index":"' + es_conf["index"] + '"}}\n'
                bulk_query += json.dumps(payload) + "\n"
            requests.post(es_conf["es_url"] + "/_bulk", headers=headers, verify=False, data=bulk_query)
            save_integrations_status(notification_id, resource_type, "")
        except Exception as exc:
            app.logger.error("Elasticsearch notification failed, error:[{}]".format(exc))
            save_integrations_status(notification_id, resource_type, "Error in Elasticsearch: {0}".format(exc))


@celery_app.task(bind=True, default_retry_delay=1 * 60)
def send_notification_to_s3(self, s3_conf, payload, notification_id, resource_type):
    with app.app_context():
        try:
            import boto3

            def default(o):
                if isinstance(o, (datetime.date, datetime.datetime)):
                    return o.isoformat()

            s3_key = "{0}/{1}.json".format(s3_conf["folder_path"], get_epochtime())
            s3_client = boto3.client('s3', aws_access_key_id=s3_conf["aws_access_key"],
                                     region_name=s3_conf["region_name"],
                                     aws_secret_access_key=s3_conf["aws_secret_key"])
            s3_client.put_object(Bucket=s3_conf["s3_bucket"], Key=s3_key,
                                 Body=json.dumps(payload, indent=4, sort_keys=True, default=default), ContentType='application/json')
            save_integrations_status(notification_id, resource_type, "")
        except Exception as exc:
            app.logger.error("S3 notification failed, error:[{}]".format(exc))
            save_integrations_status(notification_id, resource_type, "Error in S3: {0}".format(exc))


@celery_app.task(bind=True, default_retry_delay=1 * 60)
def send_microsoft_teams_notification(self, team_conf, payloads, notification_id, resource_type):
    with app.app_context():
        try:
            for payload in payloads:
                req_payload_json = {
                    "@type": "MessageCard",
                    "@context": "http://schema.org/extensions",
                    "themeColor": "007FFF",
                    "text": payload
                }
                response = requests.post(team_conf["webhook_url"], json=req_payload_json)
                if response.status_code == 200:
                    save_integrations_status(notification_id, resource_type, "")
                else:
                    error_text = response.text
                    app.logger.error("Error sending Microsoft Teams notification [{}]".format(error_text))
                    save_integrations_status(notification_id, resource_type,
                                             "Error in Microsoft Teams: {0}".format(error_text))
        except Exception as exc:
            save_integrations_status(notification_id, resource_type, "Error in Microsoft Teams: {0}".format(exc))
            app.logger.error(
                "Microsoft Teams notification failed. webhook: [{}], error: [{}]".format(team_conf["webhook_url"], exc))

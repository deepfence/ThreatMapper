import arrow
import pypd
import requests
import json
import calendar
import time
from jira import JIRA, JIRAError
from config.app import app, celery_app
from models.notification import UserActivityNotification, VulnerabilityNotification
from models.user_activity_log import UserActivityLog
from models.user import User
from utils.common import get_epochtime
from utils.constants import FILTER_TYPE_IMAGE_NAME_WITH_TAG, CVE_ES_TYPE, USER_DEFINED_TAGS, \
    NODE_TYPE_POD, FILTER_TYPE_HOST_NAME, FILTER_TYPE_IMAGE_NAME, FILTER_TYPE_KUBE_CLUSTER_NAME, \
    FILTER_TYPE_KUBE_NAMESPACE, FILTER_TYPE_TAGS,  NODE_TYPE_HOST, NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_CONTAINER


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
                    filters.get(FILTER_TYPE_TAGS, [])):
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
                jclient = JIRA(config.get('jira_site_url'), auth=(config.get('username'), config.get('password')))
            else:
                jclient = JIRA(config.get('jira_site_url'),
                               basic_auth=(config.get('username'), config.get('api_token')))
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
                jclient.create_issue(project=config.get('jira_project_key'),
                                     summary=summary,
                                     description=payload,
                                     issuetype=config.get('issue_type')
                                     )
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
            s3_key = "{0}/{1}.json".format(s3_conf["folder_path"], get_epochtime())
            s3_client = boto3.client('s3', aws_access_key_id=s3_conf["aws_access_key"],
                                     region_name=s3_conf["region_name"],
                                     aws_secret_access_key=s3_conf["aws_secret_key"])
            s3_client.put_object(Bucket=s3_conf["s3_bucket"], Key=s3_key,
                                 Body=json.dumps(payload), ContentType='application/json')
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

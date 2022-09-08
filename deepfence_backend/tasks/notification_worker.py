import json
from config.app import celery_app, app as flask_app
from config.redisconfig import redis
from models.notification import VulnerabilityNotification, ComplianceReportNotification
from models.user import User
from tasks.notification import filter_vulnerability_notification, filter_compliance_notification
from models.integration import Integration
from utils.constants import NOTIFICATION_TYPE_VULNERABILITY, NODE_TYPE_HOST, NODE_TYPE_CONTAINER, \
    NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_POD, CVE_ES_TYPE, NOTIFICATION_TYPE_COMPLIANCE, COMPLIANCE_ES_TYPE
from utils.helper import websocketio_channel_name_format


@celery_app.task(bind=True, default_retry_delay=60)
def notification_task(self, **kwargs):
    topology_data = redis.mget(
        websocketio_channel_name_format(NODE_TYPE_HOST + "?format=deepfence")[1],
        websocketio_channel_name_format(NODE_TYPE_CONTAINER + "?format=deepfence")[1],
        websocketio_channel_name_format(NODE_TYPE_CONTAINER_IMAGE + "?format=deepfence")[1],
        websocketio_channel_name_format(NODE_TYPE_POD + "?format=deepfence")[1],
    )
    topology_data = [
        json.loads(topology_data[0]) if topology_data[0] else {},
        json.loads(topology_data[1]) if topology_data[1] else {},
        json.loads(topology_data[2]) if topology_data[2] else {},
        json.loads(topology_data[3]) if topology_data[3] else {},
    ]
    try:
        notification_type = kwargs["notification_type"]
        data = kwargs["data"]  # list of vulnerability docs
        with flask_app.app_context():
            active_user_ids = [user.id for user in User.query.filter_by(isActive=True).all()]
            integrations = {integration.id: integration for integration in Integration.query.all()}

            if notification_type == NOTIFICATION_TYPE_VULNERABILITY:
                vulnerability_notifications = VulnerabilityNotification.query.filter(
                    VulnerabilityNotification.user_id.in_(active_user_ids),
                    VulnerabilityNotification.duration_in_mins == -1).all()
                for notification in vulnerability_notifications:
                    filtered_cve_list = []
                    for cve in data:
                        if filter_vulnerability_notification(notification.filters, cve, topology_data):
                            filtered_cve_list.append(cve)
                    if not filtered_cve_list:
                        continue
                    try:
                        integration = integrations.get(notification.integration_id)
                        integration.send(notification.format_content(filtered_cve_list),
                                         summary="Deepfence - Vulnerabilities Subscription",
                                         notification_id=notification.id, resource_type=CVE_ES_TYPE)
                    except Exception as ex:
                        flask_app.logger.error("Error sending notification: {0}".format(ex))
            elif notification_type == NOTIFICATION_TYPE_COMPLIANCE:
                compliance_notifications = ComplianceReportNotification.query.filter(
                    ComplianceReportNotification.user_id.in_(active_user_ids),
                    ComplianceReportNotification.duration_in_mins == -1).all()
                for notification in compliance_notifications:
                    filtered_compliance_docs = []
                    for compliance_doc in data:
                        if filter_compliance_notification(notification.filters, compliance_doc, topology_data):
                            filtered_compliance_docs.append(compliance_doc)
                        if not compliance_doc.get("region") and compliance_doc.get("cloud_provider"):
                            compliance_doc["region"] = "global"
                    if not filtered_compliance_docs:
                        continue
                    try:
                        integration = integrations.get(notification.integration_id)
                        integration.send(notification.format_content(filtered_compliance_docs),
                                         summary="Deepfence - Compliance Reports Subscription",
                                         notification_id=notification.id, resource_type=COMPLIANCE_ES_TYPE)
                    except Exception as ex:
                        flask_app.logger.error("Error sending notification: {0}".format(ex))
    except Exception as exc:
        print(exc)

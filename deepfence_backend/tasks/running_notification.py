from config.app import celery_app
import requests
import arrow
from utils.helper import get_deepfence_container_state, get_deepfence_console_host_stats


@celery_app.task(bind=True, default_retry_delay=60)
def deepfence_health_notification(*args):
    try:
        deepfence_health = ""
        container_state, ok = get_deepfence_container_state()
        if not ok:
            print("Failed to get Deepfence container state")
            return
        for containerID, value in container_state.items():
            if value.get("Restarting", False) or value.get("Paused", False) or value.get("OOMKilled", False) or \
                    value.get("Dead", False) or not value.get("Running", True):
                deepfence_health = "Deepfence component failure. Contact customer support"
                break
        content = deepfence_health
        source_application_id = "deepfence_health_notification"

        params = {
            "content": content,
            "source_application_id": source_application_id
        }
        try:
            resp = requests.post(url="http://deepfence-api:9997/running_notification", json=params)
        except Exception as e:
            print("Something went wrong while performing running notification POST call: Err: {}".format(e))

    except Exception as e:
        print("Something went wrong during deepfence_health_notification task execution: Err: {}".format(e))


@celery_app.task(bind=True, default_retry_delay=60)
def deepfence_console_host_stats(*args):
    try:
        message = ""
        console_host_stats, ok = get_deepfence_console_host_stats()
        if not ok:
            print("Could not retrieve system stats.")
            return
        for resource, value in console_host_stats.items():
            if resource == "cpu":
                if value <= 75.0:
                    message += "CPU Safe Value {} ,".format(str(value))
                elif value > 75.0 and value <= 90.0:
                    message += "CPU Warning Value {} ,".format(str(value))
                else:
                    message += "CPU Critical Value {} ,".format(str(value))
            elif resource == "memory":
                if value <= 75.0:
                    message += "Memory Safe Value {} ,".format(str(value))
                elif value > 75.0 and value <= 90.0:
                    message += "Memory Warning Value {} ,".format(str(value))
                else:
                    message += "Memory Critical Value {} ,".format(str(value))
        content = message
        source_application_id = "deepfence_console_resource_usage_notification"
        params = {
            "content": content,
            "source_application_id": source_application_id,
        }
        try:
            resp = requests.post(url="http://deepfence-api:9997/running_notification", json=params)
        except Exception as ex:
            print("Could not send message to the task. Reason: {}".format(ex))
    except Exception as ex:
        print("Something went wrong when running the task. Reason: {}".format(ex))


def set_db_update_notification(date_str):
    try:
        content = "Threat Intel feeds updated at {}".format(date_str)
        params = {
            "content": content,
            "source_application_id": "cve_db_update_notification"
        }
        try:
            resp = requests.post(url="http://deepfence-api:9997/running_notification", json=params)
        except Exception as e:
            print(e)
    except Exception as ex:
        print('Failed to run task cve_db_update_notification: {}'.format(ex))


@celery_app.task(bind=True, default_retry_delay=60)
def cve_db_update_notification(*args):
    try:
        set_db_update_notification(arrow.now().format('Do MMM, hh:mm A ZZ'))
    except Exception as ex:
        print('Failed to run task cve_db_update_notification: {}'.format(ex))

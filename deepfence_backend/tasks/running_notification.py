from config.app import celery_app
import os
import psycopg2
import requests
from datetime import datetime
from utils.helper import pretty_date, get_deepfence_container_state, get_deepfence_console_host_stats


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


@celery_app.task(bind=True, default_retry_delay=60)
def cve_db_update_notification(*args):
    try:
        fetcher_db_name = os.getenv('POSTGRES_FETCHER_DB_NAME')
        fetcher_db_user = os.getenv('POSTGRES_FETCHER_DB_USER')
        fetcher_db_password = os.getenv('POSTGRES_FETCHER_DB_PASSWORD')
        fetcher_db_host = os.getenv('POSTGRES_FETCHER_DB_HOST')
        fetcher_db_port = os.getenv('POSTGRES_FETCHER_DB_PORT')
        fetcher_db_sslmode = os.getenv('POSTGRES_FETCHER_DB_SSLMODE')
        dsn = "dbname={} user={} password={} host={} port={} sslmode={}".format(
            fetcher_db_name,
            fetcher_db_user,
            fetcher_db_password,
            fetcher_db_host,
            fetcher_db_port,
            fetcher_db_sslmode,
        )
        conn = psycopg2.connect(dsn)
        cursor = conn.cursor()
        cursor.execute("select value from keyvalue where key='updater/last'")
        last_update_timestamp, = cursor.fetchone()
        cve_db_update_status = ""
        if last_update_timestamp:
            updated_time = datetime.fromtimestamp(int(last_update_timestamp))
            cve_db_update_status = "Threat Intel feeds updated {}".format(pretty_date(updated_time))
        content = cve_db_update_status
        source_application_id = "cve_db_update_notification"

        params = {
            "content": content,
            "source_application_id": source_application_id
        }
        try:
            resp = requests.post(url="http://deepfence-api:9997/running_notification", json=params)
        except Exception as e:
            print(e)
    except Exception as ex:
        print('Failed to run task cve_db_update_notification: {}'.format(ex))

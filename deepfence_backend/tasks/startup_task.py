from config.app import app as flask_app
from tasks.reaper_tasks import cve_fix_interrupted_at_start, update_deepfence_key_in_redis
from tasks.running_notification import set_db_update_notification
from threading import Thread
import json
from tasks.registry_images import update_all_registry_images
from utils.esconn import ESConn
from models.compliance_rules import ComplianceRules
from models.setting import Setting
from utils.constants import COMPLIANCE_CHECK_TYPES, COMPLIANCE_INDEX, AES_SETTING_KEY, CLOUD_CREDENTIAL_AES_SETTING_KEY
from utils.helper import wait_for_postgres_table
import secrets
import string
import arrow


def add_compliance_rules(compliance_check_type, cloud_provider, rules_json_file_name):
    with open(rules_json_file_name, 'r', encoding="utf-8") as rules_file:
        rules = json.load(rules_file)
        for rule_json in rules:
            if not rule_json or not rule_json.get("test_number"):
                continue
            try:
                rule = ComplianceRules.query.filter_by(compliance_check_type=compliance_check_type,
                                                       cloud_provider=cloud_provider,
                                                       test_number=rule_json["test_number"]).one_or_none()
                if rule:
                    continue
                rule = ComplianceRules(
                    compliance_check_type=compliance_check_type,
                    test_category=rule_json["test_category"],
                    test_number=rule_json["test_number"],
                    test_desc=rule_json["test_desc"],
                    test_rationale=rule_json["test_rationale"],
                    cloud_provider=cloud_provider,
                    is_enabled=True,
                )
                rule.save()
            except Exception as ex:
                print(ex)


def insert_compliance_rules():
    wait_for_postgres_table("compliance_rules")
    file_path = "/app/code/compliance_rules/{0}/{1}.json"
    with flask_app.app_context():
        for cloud_provider, compliance_check_types in COMPLIANCE_CHECK_TYPES.items():
            for compliance_check_type in compliance_check_types:
                try:
                    add_compliance_rules(compliance_check_type, cloud_provider, file_path.format(cloud_provider,
                                                                                                 compliance_check_type))
                except Exception as ex:
                    print(ex)


def mask_not_applicable_compliance_scans():
    try:
        query_filters = {"status": ["notapplicable", "notchecked", "notselected", "unknown"], "masked": "false"}
        if ESConn.count(index_name=COMPLIANCE_INDEX, filters=query_filters) == 0:
            return
        update_body = {
            "script": {
                "source": "ctx._source.masked='true'",
                "lang": "painless"
            },
            "query": {"bool": {"must": [
                {"terms": {"status.keyword": query_filters["status"]}},
                {"term": {"masked.keyword": query_filters["masked"]}},
            ]}}
        }
        ESConn.update_by_query(index=COMPLIANCE_INDEX, body=update_body,
                               conflicts="proceed", wait_for_completion=True)
    except:
        pass


def update_all_registry_images_in_redis():
    wait_for_postgres_table("registry_credential")
    with flask_app.app_context():
        update_all_registry_images()


def generate_random_alphanumeric_string(length):
    return ''.join(secrets.choice(string.ascii_letters + string.digits + string.punctuation) for _ in range(length))


def generate_aes_settings():
    wait_for_postgres_table("setting")
    with flask_app.app_context():
        try:
            aes_setting_val = {
                "value": {
                    "aes_key": generate_random_alphanumeric_string(16),
                    "aes_iv": generate_random_alphanumeric_string(16),
                },
                "label": "AES Encryption Setting",
                "description": "AES Encryption Key-IV pair",
                "is_visible_on_ui": False,
            }
            generate_aes_setting(AES_SETTING_KEY, aes_setting_val)
            cloud_credentials_aes_setting_val = {
                "value": {
                    "aes_key": generate_random_alphanumeric_string(16),
                    "aes_iv": generate_random_alphanumeric_string(16),
                },
                "label": "Cloud Credentials AES Encryption Setting",
                "description": "Cloud Credentials AES Encryption Key-IV pair",
                "is_visible_on_ui": False,
            }
            generate_aes_setting(CLOUD_CREDENTIAL_AES_SETTING_KEY, cloud_credentials_aes_setting_val)
        except Exception as ex:
            print(ex)


def generate_aes_setting(key, value):
    aes_setting = Setting.query.filter_by(key=key).one_or_none()
    if aes_setting:
        if not aes_setting.value or not aes_setting.value.get("value"):
            aes_setting.value = value
            aes_setting.save()
    else:
        aes_setting = Setting(
            key=key,
            value=value
        )
        aes_setting.save()
    return aes_setting


def main():
    update_deepfence_key_in_redis.delay()
    set_db_update_notification(arrow.now().format('Do MMM, hh:mm A ZZ'))
    process1 = Thread(target=cve_fix_interrupted_at_start)
    process2 = Thread(target=update_all_registry_images_in_redis)
    process3 = Thread(target=generate_aes_settings)
    process4 = Thread(target=insert_compliance_rules)
    process1.start()
    process2.start()
    process3.start()
    process4.start()
    process1.join()
    process2.join()
    process3.join()
    process4.join()


if __name__ == '__main__':
    main()

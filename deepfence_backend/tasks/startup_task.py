from config.app import app as flask_app
from tasks.reaper_tasks import cve_fix_interrupted_at_start, update_deepfence_key_in_redis
from threading import Thread
from tasks.registry_images import update_all_registry_images
from models.setting import Setting
from utils.constants import AES_SETTING_KEY, CLOUD_CREDENTIAL_AES_SETTING_KEY
from utils.helper import wait_for_postgres_table
import secrets
import string


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
    process1 = Thread(target=cve_fix_interrupted_at_start)
    process2 = Thread(target=update_all_registry_images_in_redis)
    process3 = Thread(target=generate_aes_settings)
    process1.start()
    process2.start()
    process3.start()
    process1.join()
    process2.join()
    process3.join()


if __name__ == '__main__':
    main()

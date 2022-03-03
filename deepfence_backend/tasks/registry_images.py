from config.app import celery_app, app
from models.container_image_registry import RegistryCredential
from utils.constants import REGISTRY_IMAGES_CACHE_KEY_PREFIX, REGISTRY_IMAGES_CACHE_EXPIRY_TIME, \
    NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_REGISTRY_IMAGE, TOPOLOGY_FILTERS_PREFIX
from datetime import datetime
import json
from utils.node_utils import NodeUtils


@celery_app.task
def update_all_registry_images():
    with app.app_context():
        registry_credentials = RegistryCredential.query.all()
        if not registry_credentials:
            return
        for registry_credential in registry_credentials:
            update_registry_images(registry_credential.id)


@celery_app.task(bind=True)
def update_registry_images(self, registry_id):
    with app.app_context():
        try:
            registry_credential = RegistryCredential.query.get(registry_id)
        except Exception as err:
            app.logger.error("Failed to get registry credential: error={}".format(err))
        try:
            client = registry_credential.client
        except Exception as err:
            app.logger.error("Unable to initialize client: error={}".format(err))
            return
        image_list = []
        filters_image_os = set()
        filters_image_name = set()
        filters_image_tag = set()
        try:
            node_utils = NodeUtils()
            tmp_image_list = client.get_images_list()
            for image_detail in tmp_image_list:
                image_detail["scope_id"] = image_detail["image_name_with_tag"] + ";<container_image>"
                image_detail["id"] = node_utils.get_df_id_from_scope_id(
                    image_detail["scope_id"], NODE_TYPE_CONTAINER_IMAGE)
                image_detail["type"] = NODE_TYPE_REGISTRY_IMAGE
                if image_detail["image_os"]:
                    filters_image_os.add(image_detail["image_os"])
                filters_image_name.add(image_detail["image_name"])
                filters_image_tag.add(image_detail["image_tag"])
                image_list.append(image_detail)
        except Exception as err:
            app.logger.error("Failed to list images: error={}".format(err))
        image_list_details = {
            "image_list": image_list,
            "last_updated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        }
        from config.redisconfig import redis
        redis_cache_key = "{0}:{1}".format(REGISTRY_IMAGES_CACHE_KEY_PREFIX, registry_id)
        redis.setex(redis_cache_key, REGISTRY_IMAGES_CACHE_EXPIRY_TIME, json.dumps(image_list_details))
        filters = []
        if filters_image_os:
            filters.append({
                "name": "image_os", "label": "Platform", "type": "string", "options": list(filters_image_os)
            })
        if filters_image_name:
            filters.append({
                "name": "image_name", "label": "Image Name", "type": "string", "options": list(filters_image_name)
            })
            filters.append({
                "label": "Vulnerability Scan Status", "name": "vulnerability_scan_status",
                "options": ["queued", "in_progress", "complete", "error", "never_scanned"], "type": "string"})
            filters.append({
                "label": "Secret Scan Status", "name": "secret_scan_status",
                "options": ["queued", "in_progress", "complete", "error", "never_scanned"], "type": "string"})
            filters.append({
                "label": "Pushed At", "name": "pushed_at", "type": "date", "multi_select": False,
                "options": ["Past 1 day", "Past 7 days", "Past 1 month", "Past 3 months", "Past 6 months", "Show all"]})
        if filters_image_tag:
            filters.append({
                "name": "image_tag", "label": "Image Tag", "type": "string", "options": list(filters_image_tag)
            })
        filters_key = "{0}{1}:{2}".format(TOPOLOGY_FILTERS_PREFIX, NODE_TYPE_REGISTRY_IMAGE.upper(), registry_id)
        redis.setex(filters_key, REGISTRY_IMAGES_CACHE_EXPIRY_TIME, json.dumps(filters))

from models.setting import Setting
from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from utils.response import set_response
from utils.custom_exception import InvalidUsage, NotFound
from utils.decorators import non_read_only_user
from urllib.parse import urlparse
from utils.helper import validate_domain, validate_ip

setting_api = Blueprint("setting_api", __name__)


@setting_api.route("/settings", methods=["GET"], endpoint='api_v1_5_settings')
@jwt_required()
def settings():
    all_settings = Setting.query.filter(Setting.value['is_visible_on_ui'].as_boolean()).all()
    result = []
    for setting in all_settings:
        result.append({
            "id": setting.id,
            "key": setting.key,
            "value": setting.value["value"],
            "label": setting.value["label"],
            "description": setting.value["description"]
        })
    return set_response(data=result)


@setting_api.route("/settings/<int:setting_id>", methods=["POST"], endpoint='api_v1_5_user_update')
@jwt_required()
@non_read_only_user
def setting_update(setting_id):
    """
    Settings update api.
    This api is used for updating global settings

    ---
    tags:
      - Global Settings API
    parameters:
      - name: body
        in: body
        description: JSON parameters.
        schema:
          properties:
            key:
              type: string
              description: Key
              example: domain_name
            value:
              type: string
              description: Value corresponding to the Key
              example: https://console.deepfence.io
    responses:
      200:
        description: Settings updated successfully.
      400:
        description: Bad request.
      404:
        description: Setting not found.
    """
    setting = Setting.query.filter(Setting.value['is_visible_on_ui'].as_boolean()).filter_by(id=setting_id).one_or_none()
    if setting is None:
        raise NotFound("Setting not found")
    if type(request.json) != dict:
        raise InvalidUsage("Request data invalid")
    key = request.json.get("key")
    value = request.json.get("value")


    if not key:
        raise InvalidUsage("Key is required")
    elif not value:
        raise InvalidUsage("Value is required")
    elif key != setting.key:
        raise InvalidUsage("Setting key cannot be changed")

    if key == "console_url":
        if "http://" in value or "https://" in value:
            value = urlparse(value).netloc
        if not (validate_ip(value) or validate_domain(value)):
            raise InvalidUsage("URL is not valid")
        value = "https://" + value

    setting.value = {
        "value": value,
        "label": setting.value["label"],
        "description": setting.value["description"],
        "is_visible_on_ui": setting.value["is_visible_on_ui"],
    }
    setting.save()
    return set_response(data="ok")

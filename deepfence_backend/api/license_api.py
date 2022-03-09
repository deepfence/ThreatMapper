from flask import Blueprint
from utils.common import get_eula_text
from utils.response import set_response

license_api = Blueprint("license_api", __name__)


@license_api.route("/eula", methods=["GET"])
def eula():
    """
    Eula

    Permission: ALL
    ---
    tags:
      - LICENSE API
    responses:
      200:
        description: Request successful.
    """
    eula_text = get_eula_text()
    return set_response(data=eula_text)

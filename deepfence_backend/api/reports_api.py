from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from utils.custom_exception import InvalidUsage
from utils.esconn import ESConn, GroupByParams
from utils.response import set_response
from utils.constants import ES_TERMS_AGGR_SIZE, PDF_REPORT_INDEX, TIME_UNIT_MAPPING
from models.setting import Setting
import uuid
import urllib.parse
from datetime import datetime


reports_api = Blueprint("reports_api", __name__)


@reports_api.route('/detailed_report', methods=['POST'], endpoint="api_v1_5_get_detailed_report_api")
@jwt_required
def get_detailed_report_api():
    number = request.args.get("number")
    time_unit = request.args.get("time_unit")
    resource_type = request.args.get("resource_type")

    if number:
        try:
            number = int(number)
        except ValueError:
            raise InvalidUsage("Number should be an integer value.")

    if bool(number is not None) ^ bool(time_unit):
        raise InvalidUsage("Require both number and time_unit or ignore both of them.")

    if time_unit and time_unit not in TIME_UNIT_MAPPING.keys():
        raise InvalidUsage("time_unit should be one of these, month/day/hour/minute")

    time_unit = TIME_UNIT_MAPPING.get(time_unit)
    lucene_query_string = request.args.get("lucene_query")
    if lucene_query_string:
        lucene_query_string = urllib.parse.unquote(lucene_query_string)
    filters = {}
    node_filters = {}
    resources = {}
    if request.is_json:
        if type(request.json) != dict:
            raise InvalidUsage("Request data invalid")
        filters = request.json.get("filters", {})
        node_filters = request.json.get("node_filters", {})
        resources = request.json.get("resources", {})

    # ___________________
    # data = get_nodes_list(get_default_params({"filters": node_filters, "size": 500000}))
    # print(data)
    # ___________________
    domain_name = ""
    console_url_setting = Setting.query.filter_by(key="console_url").one_or_none()
    if console_url_setting and console_url_setting.value:
        domain_name = console_url_setting.value.get("value")
    pdf_report_id = uuid.uuid4()
    body = {
        "type": PDF_REPORT_INDEX,
        "pdf_report_id": pdf_report_id,
        "status": "started",
        "masked": "false",
        "report_type": resource_type,
        "@timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    }
    ESConn.create_doc(PDF_REPORT_INDEX, body, refresh="wait_for")
    from config.app import celery_app
    celery_app.send_task(
        'tasks.common_worker.generate_pdf_report', args=(),
        kwargs={"pdf_report_id": pdf_report_id, "filters": filters, "lucene_query_string": lucene_query_string,
                "node_filters": node_filters, "number": number, "time_unit": time_unit, "resource_type": resource_type,
                "domain_name": domain_name, "resources": resources})
    return set_response(data="Started")


@reports_api.route('/detailed_report_status', methods=['GET'], endpoint="api_v1_5_get_detailed_report_api_status")
@jwt_required
def get_detailed_report_api_status():
    param = GroupByParams(PDF_REPORT_INDEX)
    param.add_agg_field_generic('pdf_report_id.keyword', 'terms', "status", size=ES_TERMS_AGGR_SIZE)
    param.add_agg_field_generic('', 'top_hits', 'document', size=1, sort=[{"@timestamp": {"order": "desc"}}])
    es_response = ESConn.group_by(param, None)
    data = []
    for ele in es_response['status']['buckets']:
        for info in ele['document']['hits']['hits']:
            data.append(info['_source'])
    data = sorted(data, key=lambda k: k["@timestamp"], reverse=True)
    return set_response(data=data)

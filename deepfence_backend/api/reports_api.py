from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from utils.custom_exception import InvalidUsage
from utils.esconn import ESConn, GroupByParams
from utils.response import set_response
from utils.constants import ES_TERMS_AGGR_SIZE, REPORT_INDEX, TIME_UNIT_MAPPING

reports_api = Blueprint("reports_api", __name__)


@reports_api.route('/detailed_report_status', methods=['GET'], endpoint="api_v1_5_get_detailed_report_api_status")
@jwt_required
def get_detailed_report_api_status():
    param = GroupByParams(REPORT_INDEX)
    param.add_agg_field_generic('report_id.keyword', 'terms', "status", size=ES_TERMS_AGGR_SIZE)
    param.add_agg_field_generic('', 'top_hits', 'document', size=1, sort=[{"@timestamp": {"order": "desc"}}])
    es_response = ESConn.group_by(param, None)
    data = []
    for ele in es_response['status']['buckets']:
        for info in ele['document']['hits']['hits']:
            data.append(info['_source'])
    data = sorted(data, key=lambda k: k["@timestamp"], reverse=True)
    return set_response(data=data)

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.redisconfig import redis
from utils.constants import THREAT_GRAPH_CACHE_KEY, THREAT_GRAPH_NODE_DETAIL_KEY
from utils.response import set_response, format_response
from utils.custom_exception import InvalidUsage
import json

threat_graph_api = Blueprint("threat_graph_api", __name__)


@threat_graph_api.route("/threat-graph/graph", methods=["GET"])
@jwt_required()
def threat_graph():
    response = {}
    graph = redis.get(THREAT_GRAPH_CACHE_KEY)
    if graph:
        response = json.loads(graph)
    return set_response(data=response)


@threat_graph_api.route("/threat-graph/node", methods=["GET"])
@jwt_required()
def threat_graph_node_data():
    graph_node_id = request.args.get("graph_node_id")
    if not graph_node_id:
        raise InvalidUsage("graph_node_id is required.")
    response = {}
    node_detail = redis.hget(THREAT_GRAPH_NODE_DETAIL_KEY, graph_node_id)
    if node_detail:
        response = json.loads(node_detail)
    return set_response(data=response)

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from config.redisconfig import redis
from utils.constants import ATTACK_GRAPH_CACHE_KEY, ATTACK_GRAPH_NODE_DETAIL_KEY
from utils.response import set_response, format_response
from utils.custom_exception import InvalidUsage
import json

attack_graph_api = Blueprint("attack_graph_api", __name__)


@attack_graph_api.route("/attack-graph/graph", methods=["GET"])
@jwt_required()
def attack_graph():
    response = {}
    graph = redis.get(ATTACK_GRAPH_CACHE_KEY)
    if graph:
        response = json.loads(graph)
    return set_response(data=response)


@attack_graph_api.route("/attack-graph/node", methods=["GET"])
@jwt_required()
def attack_graph_node_data():
    graph_node_id = request.args.get("graph_node_id")
    if not graph_node_id:
        raise InvalidUsage("graph_node_id is required.")
    response = {}
    node_detail = redis.hget(ATTACK_GRAPH_NODE_DETAIL_KEY, graph_node_id)
    if node_detail:
        response = json.loads(node_detail)
    return set_response(data=response)

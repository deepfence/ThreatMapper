from utils.helper import tag_str_comparator, websocketio_channel_name_format
from utils.constants import CVE_SCAN_LOGS_INDEX, NODE_TYPE_HOST, NODE_TYPE_CONTAINER, ES_TERMS_AGGR_SIZE, \
    TOPOLOGY_ID_CONTAINER, TOPOLOGY_ID_CONTAINER_IMAGE, TOPOLOGY_ID_HOST, COMPLIANCE_LOGS_INDEX, \
    NODE_TYPE_CONTAINER_IMAGE, USER_DEFINED_TAGS, TOPOLOGY_ID_NODE_TYPE_MAP
from utils.scope import fetch_topology_data, topology_meta_filter
from utils.esconn import ESConn, GroupByParams
from functools import reduce
import json
from utils.custom_exception import InvalidUsage


def determine_node_status(node_type, status_type, taglist_filter=None):
    if not taglist_filter:
        taglist_filter = []
    if status_type == 'cve':
        return get_topology_cve_status(node_type, taglist_filter)
    elif status_type == 'compliance':
        return get_node_compliance_status(node_type, taglist_filter)
    else:
        raise InvalidUsage('Invalid status_type')


def get_node_compliance_status(node_type, user_defined_tags_filter=None):
    from config.redisconfig import redis

    if user_defined_tags_filter:
        user_defined_tags = ",".join(user_defined_tags_filter)
    else:
        user_defined_tags = []

    active_node_ids = []

    redis_pipe = redis.pipeline()
    if node_type == TOPOLOGY_ID_HOST or node_type == 'all':
        redis_pipe.get(websocketio_channel_name_format(NODE_TYPE_HOST + "?format=deepfence")[1])
    if node_type == TOPOLOGY_ID_CONTAINER or node_type == 'all':
        redis_pipe.get(websocketio_channel_name_format(NODE_TYPE_CONTAINER + "?format=deepfence")[1])
    if node_type == TOPOLOGY_ID_CONTAINER_IMAGE or node_type == 'all':
        redis_pipe.get(websocketio_channel_name_format(NODE_TYPE_CONTAINER_IMAGE + "?format=deepfence")[1])
    redis_resp = redis_pipe.execute()

    topology_data = {}

    if node_type == "all":
        if redis_resp[0]:
            topology_data.update(json.loads(redis_resp[0]))
        if redis_resp[1]:
            topology_data.update(json.loads(redis_resp[1]))
        if redis_resp[2]:
            topology_data.update(json.loads(redis_resp[2]))
    else:
        if redis_resp[0]:
            topology_data.update(json.loads(redis_resp[0]))

    for node_id, node_details in topology_data.items():
        if not node_details.get("is_ui_vm") and not node_details.get("pseudo", False) and node_details.get("scope_id"):
            if user_defined_tags:
                if node_details.get("user_defined_tags"):
                    if any(val in node_details["user_defined_tags"] for val in user_defined_tags):
                        active_node_ids.append(node_details["scope_id"])
            else:
                active_node_ids.append(node_details["scope_id"])

    # ES query to aggregate by image name and further pick the latest document for each imagename
    param = GroupByParams(COMPLIANCE_LOGS_INDEX)
    if node_type != "all":
        param.add_filter('term', 'node_type.keyword', TOPOLOGY_ID_NODE_TYPE_MAP.get(node_type))
    NODE = 'node'
    CHECKTYPE = 'checktype'
    DOCUMENT = 'document'
    param.add_agg_field_generic('node_id.keyword', 'terms', NODE, size=ES_TERMS_AGGR_SIZE)
    param.add_agg_field_generic('compliance_check_type.keyword', 'terms', CHECKTYPE)
    param.add_agg_field_generic('', 'top_hits', DOCUMENT, size=1, sort=[{"@timestamp": {"order": "desc"}}])
    es_response = ESConn.group_by(param, None)
    node_buckets = es_response.get(NODE, {}).get('buckets', [])

    # In Compliance, just getting the latest results doesn't always holds good
    # If HIPAA is in completed state and its the latest doc, there might be
    # a failure in PCIDSS which needs to reported instead of HIPAA completion.
    compliance_status = {}
    for node_bucket in node_buckets:
        if node_bucket.get("key") not in active_node_ids:
            continue
        checktype_buckets = node_bucket.get(CHECKTYPE, {}).get('buckets', [])
        latest_status_docs = []
        for checktype_bucket in checktype_buckets:
            status_docs = checktype_bucket.get(DOCUMENT, {}).get('hits', {}).get('hits', [])
            for status_doc in status_docs:
                latest_status_docs.append(status_doc)
        in_progress = []
        error = []
        completed = []
        for status_doc in latest_status_docs:
            scan_status = status_doc.get('_source', {}).get('scan_status')
            if scan_status == 'INPROGRESS' or scan_status == 'SCAN_IN_PROGRESS' or scan_status == 'UPLOADING_IMAGE' or scan_status == 'UPLOAD_COMPLETE' or scan_status == 'QUEUED':
                in_progress.append(status_doc)
            if scan_status == 'ERROR':
                error.append(status_doc)
            if scan_status == 'COMPLETED':
                completed.append(status_doc)
        node_compliance_status_list = []
        if len(in_progress) > 0:
            node_compliance_status_list.extend([el.get('_source', {}) for el in in_progress])
        if len(error) > 0:
            node_compliance_status_list.extend([el.get('_source', {}) for el in error])
        if len(completed) > 0:
            node_compliance_status_list.extend([el.get('_source', {}) for el in completed])
        compliance_status[node_bucket.get('key')] = node_compliance_status_list
    return compliance_status


def get_topology_cve_status(node_type, taglist_filter):
    node_list = []
    if node_type in ["all", TOPOLOGY_ID_CONTAINER, TOPOLOGY_ID_CONTAINER_IMAGE]:
        # fetch current container nodes.
        # filter out uncontained and internet nodes
        topology_data = {}
        if node_type == TOPOLOGY_ID_CONTAINER or node_type == 'all':
            # fetch current container nodes.
            # filter out uncontained and internet nodes
            topology_data.update(fetch_topology_data(NODE_TYPE_CONTAINER))
        if node_type == TOPOLOGY_ID_CONTAINER_IMAGE or node_type == 'all':
            topology_data.update(fetch_topology_data(NODE_TYPE_CONTAINER_IMAGE))
        # TODO: read deepfence format
        if len(taglist_filter) > 0:
            taglist_str = ",".join(taglist_filter)
            filtered_topology_data = topology_meta_filter(topology_data, USER_DEFINED_TAGS, taglist_str,
                                                          comparator=tag_str_comparator)
        else:
            filtered_topology_data = topology_data

        # filter list of image related meta data for each node
        node_image_meta = list(
            map(
                lambda id: {
                    "meta_list": filter(
                        lambda meta: meta.get('id') == "docker_image_tag" or meta.get('id') == "docker_image_name",
                        filtered_topology_data[id].get('metadata', [])
                    ),
                    "node_id": id
                },
                filtered_topology_data
            )
        )

        # reduce image name and image tag into one string by concatination
        def reduce_handler(acc, meta):
            acc = "{0}:{1}".format(acc, meta.get('value'))
            return acc.strip(":")

        # creating list of {image_name, node_id} for each container node
        node_list = node_list + list(
            map(
                lambda meta: {
                    "image_name": reduce(
                        reduce_handler,
                        sorted(meta.get('meta_list'), key=lambda el: el.get('priority'),
                               reverse=True if node_type == TOPOLOGY_ID_CONTAINER else False),
                        ""
                    ),
                    "node_id": meta.get('node_id'),
                },
                node_image_meta
            )
        )

    if node_type == TOPOLOGY_ID_HOST or node_type == 'all':
        topology_data = fetch_topology_data(NODE_TYPE_HOST)
        # TODO: read deepfence format
        if len(taglist_filter) > 0:
            taglist_str = ",".join(taglist_filter)
            filtered_topology_data = topology_meta_filter(topology_data, USER_DEFINED_TAGS, taglist_str,
                                                          comparator=tag_str_comparator)
        else:
            filtered_topology_data = topology_data

        # filter out Deepfence console node and internet nodes
        filtered_topology = []
        for _, node in filtered_topology_data.items():
            if node.get('pseudo') is True:
                continue
            to_skip = False
            for metadata in node.get('metadata', []):
                if metadata.get('id') == 'is_ui_vm' and metadata.get('value') == 'true':
                    to_skip = True
                    break
            if to_skip:
                continue
            filtered_topology.append(node)

        # creating list of {image_name, node_id} for each host node
        node_list = node_list + list(
            map(
                lambda node: {
                    "image_name": reduce(
                        lambda acc, hostname_meta: hostname_meta.get('value'), filter(
                            lambda meta: meta.get('id') == "host_name",
                            node.get('metadata', [])
                        ), ""
                    ),
                    "node_id": node.get('id')
                },
                filtered_topology
            )
        )

    # create an index for mapping node_id and image_name
    def node_index_handler(acc, node):
        acc[node.get('node_id')] = node.get('image_name')
        return acc

    node_index = reduce(node_index_handler, node_list, {})

    # ES query to aggregate by image name and further pick the latest document for each imagename
    param = GroupByParams(CVE_SCAN_LOGS_INDEX)
    if node_type != "all":
        tmp_node_type = {TOPOLOGY_ID_HOST: NODE_TYPE_HOST, TOPOLOGY_ID_CONTAINER: NODE_TYPE_CONTAINER_IMAGE,
                         TOPOLOGY_ID_CONTAINER_IMAGE: NODE_TYPE_CONTAINER_IMAGE}.get(node_type)
        param.add_filter('term', 'node_type.keyword', tmp_node_type)
    param.add_agg_field('node_id.keyword', 'terms', size=ES_TERMS_AGGR_SIZE)
    param.add_sub_agg_field('', 'top_hits', size=1, sort=[
        {"@timestamp": {"order": "desc"}}, {"scan_id.keyword": {"order": "desc"}}])
    NODE = 'node'
    DOCUMENT = 'document'
    es_response = ESConn.group_by(param, NODE, DOCUMENT)
    node_buckets = es_response.get(NODE, {}).get('buckets', [])

    # create an index for mapping image name and cve status details
    def image_index_handler(acc, node):
        hits = node.get(DOCUMENT, {}).get('hits', {}).get('hits', {})
        if len(hits) > 0:
            acc[node.get('key')] = hits[0].get('_source')
        return acc

    image_index = reduce(image_index_handler, node_buckets, {})

    # merge node_index and image index
    # creating the above two indicies handles scenerios where multiple nodes can have same image name
    topology_cve_status = {node_id: image_index.get(image_name, {}) for node_id, image_name in node_index.items()}
    return topology_cve_status

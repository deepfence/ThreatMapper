import json
import xlsxwriter
import io
import copy
from utils.esconn import ESConn
from utils.common import get_rounding_time_unit
from utils.constants import ES_TERMS_AGGR_SIZE, CVE_INDEX, NODE_TYPE_HOST, \
    NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_CONTAINER, NODE_TYPE_POD, DEEPFENCE_SUPPORT_EMAIL, TIME_UNIT_MAPPING, \
    ES_MAX_CLAUSE, SECRET_SCAN_INDEX

from utils.resource import get_nodes_list, get_default_params


header_fields = {
    'ALERT_TYPE_META_SUB_FIELD': ['cloud_provider', 'name', 'private_ip', 'public_ip'],
    CVE_INDEX: ['@timestamp', 'cve_attack_vector', 'cve_caused_by_package', 'cve_container_image', 'scan_id',
                     'cve_container_image_id', 'cve_cvss_score', 'cve_description', 'cve_fixed_in', 'cve_id',
                     'cve_link', 'cve_severity', 'cve_overall_score', 'cve_type', 'host', 'host_name', 'masked'],
    "secret-scan-source": [ 'Match.full_filename', 'Match.matched_content', 'Rule.name', 'Rule.part','Severity.level', 'node_name', 'container_name', 'kubernetes_cluster_name', 'node_type' ],
    "secret-scan-header": [ 'Filename', 'Content', 'Name', 'Rule','Severity', 'Node Name', 'Container Name', 'Kubernetes Cluster Name', 'NodeType' ]
}

sheet_name = {
    CVE_INDEX: "Vulnerability",
    SECRET_SCAN_INDEX: "Secrets"
}


def prepare_report_email_body(node_type, filters, resources, duration):
    if not filters:
        filters = {"type": node_type}
    elif not filters.get("type", None):
        filters["type"] = node_type
    if not resources:
        resources = []
    node_type_label = node_type.replace("_", " ").title()
    sheets_html = ""
    for resource in resources:
        sheets_html += "<li>" + sheet_name[resource["type"]] + "</li>"
    filters_html = ""
    for k, v in filters.items():
        if not v:
            continue
        val = v
        if type(v) is list:
            val = ", ".join(v)
        filters_html += "<li>{0}: {1}</li>".format(k.replace("_", " ").replace(".", " - ").title(), val)
    if duration:
        duration_number = duration.get('number')
        duration_time_unit = duration.get('time_unit')
        if duration_time_unit == "all":
            filters_html += "<li>Duration: All</li>"
        else:
            for k, v in TIME_UNIT_MAPPING.items():
                if v == duration_time_unit:
                    duration_time = k
                    if duration_number > 1:
                        duration_time += "s"  # plural
                    filters_html += "<li>Duration: Past {0} {1}</li>".format(duration_number, duration_time)
                    break
    email_body = """
Attached report file has following sheets and entries will be based on the filters as described below.<br/>
<ul>
    {sheets_html}
</ul>
<b>Filters</b><br/>
<ul>
{filters_html}
</ul>
""".format(sheets_html=sheets_html, filters_html=filters_html, node_type=node_type_label)
    email_html = """
<table width="600" border="0" cellpadding="0" cellspacing="0">
    <tr>
        <td width="268" height="50">
            <img src="https://deepfence-public.s3.amazonaws.com/deepfence_logo_200_55.png"
                 alt="Deepfence Logo"/>
        </td>
    </tr>
    <tr>
        <td colspan="2" align="center">
            <hr style="width: 600px; height: 0; display: block; margin-top: 0.5em; margin-bottom: 0.5em;
                margin-left: auto; margin-right: auto; border-style: solid; border-width: 2px; border-color:#177AC8;"/>
        </td>
    </tr>
    <tr>
        <td width="600" colspan="2" align="center" valign="top">
            <table width="580" align="left" cellspacing="0">
                <tr>
                    <td valign="top" width="530" style="font-family: Arial, Helvetica, sans-serif; font-size:12px;"
                        align="left">
                        <div style="font-size:15px; color:#000000;"><br/>Hello,<br/><br/>
                        </div>
                    </td>
                </tr>
            </table>
            <br style="clear:both;"/>
            <table width="580">
                <tr>
                    <td valign="top" width="530" style="font-family: Arial, Helvetica, sans-serif; font-size:14px;"
                        align="left">
                        {email_body}
                    </td>
                </tr>
            </table>
            <br style="clear:both;"/>
            <br/>
        </td>
    </tr>
    <tr>
        <td colspan="2" align="center">
            <hr style="width: 600px; height: 0; display: block; margin-top: 0.5em; margin-bottom: 0.5em;
                margin-left: auto; margin-right: auto; border-style: solid; border-width: 2px; border-color:#177AC8;"/>
        </td>
    </tr>
    <tr>
        <td colspan="2" align="center">
            <div style="font-family: Arial, Helvetica, sans-serif; font-size:11px; width:500px; text-align:center; color:#7f7f7f;">
                <br/>
                Deepfence Inc.
                3101, Park Blvd, Suite 101,
                Palo Alto, CA 94306
                <br/><br/>
                Website: https://deepfence.io &nbsp; E-Mail support: {support_email}
                <br/><br/>
                Copyright © 2020, Deepfence Inc.
            </div>
        </td>
    </tr>
</table>
""".format(support_email=DEEPFENCE_SUPPORT_EMAIL, email_body=email_body)
    return email_html


def prepare_report_download(node_type, filters, resources, duration, include_dead_nodes=False):
    number = duration.get('number')
    time_unit = duration.get('time_unit')
    no_node_filters_set = False
    if not filters:
        filters = {"type": node_type}
    elif not filters.get("type", None):
        filters["type"] = node_type
    # In filters, only node_type is set, no other filters like host_name, image_name, etc
    if len(filters) == 1:
        no_node_filters_set = True

    if include_dead_nodes == True and node_type == NODE_TYPE_HOST:
        filtered_node_list = []
    else:
        filtered_node_list = get_nodes_list(get_default_params({"filters": filters, "size": 500000})).get("data", [])

    host_names = []
    container_names = []
    image_name_with_tag_list = []
    scope_ids = []
    pod_names = []

    
    buffer = io.BytesIO()
    wb = xlsxwriter.Workbook(buffer, {'in_memory': True, 'strings_to_urls': False, 'strings_to_formulas': False})
    for resource in resources:
        resource_type = resource.get('type')
        if resource_type not in [CVE_INDEX, SECRET_SCAN_INDEX]:
            continue
        if resource_type == SECRET_SCAN_INDEX:
            headers = header_fields["secret-scan-header"]
        else:
            headers = header_fields[resource_type]
        ws = wb.add_worksheet(sheet_name[resource_type])
        row = 0
        col = 0
        for header in headers:
            if header == 'cloud_metadata':
                for sub_header in header_fields['ALERT_TYPE_META_SUB_FIELD']:
                    ws.write(row, col, sub_header)
                    col += 1
                continue
            ws.write(row, col, header)
            col += 1
        # here changing the header to default format to align with the code
        if resource_type == SECRET_SCAN_INDEX:
            headers = header_fields["secret-scan-source"]

        if not filtered_node_list and no_node_filters_set is False:
            # User is trying to filter and download report for old node, which does not exist now
            proceed = False
            if node_type == NODE_TYPE_HOST and filters.get("host_name"):
                proceed = True
            # if node_type == NODE_TYPE_CONTAINER and (filters.get("host_name") or filters.get("image_name_with_tag")):
            #     proceed = True
            if node_type == NODE_TYPE_CONTAINER_IMAGE and filters.get("image_name_with_tag"):
                proceed = True
            if not proceed:
                continue
        resource_filter = resource.get("filter", {})
        and_terms = []
        cve_scan_id_list = []
        if resource_type == CVE_INDEX:
            if "scan_id" not in resource_filter:
                aggs = {
                    "cve_container_image": {
                        "terms": {
                            "field": "cve_container_image.keyword",
                            "size": ES_TERMS_AGGR_SIZE
                        },
                        "aggs": {
                            "scan_id": {
                                "terms": {
                                    "field": "scan_id.keyword",
                                    "size": ES_TERMS_AGGR_SIZE
                                },
                                "aggs": {
                                    "scan_recent_timestamp": {
                                        "max": {
                                            "field": "@timestamp"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                aggs_response = ESConn.aggregation_helper(
                     CVE_INDEX, {"type": CVE_INDEX, }, aggs, number, time_unit, None
                )
                if "aggregations" in aggs_response:
                    for image_aggr in aggs_response["aggregations"]["cve_container_image"]["buckets"]:
                        latest_scan_id = ""
                        latest_scan_time = 0
                        for scan_id_aggr in image_aggr["scan_id"]["buckets"]:
                            if scan_id_aggr["scan_recent_timestamp"]["value"] > latest_scan_time:
                                latest_scan_time = scan_id_aggr["scan_recent_timestamp"]["value"]
                                latest_scan_id = scan_id_aggr["key"]
                        cve_scan_id_list.append(latest_scan_id)
        elif resource_type == SECRET_SCAN_INDEX:
            if "scan_id" not in resource_filter:
                aggs = {
                    "node_name": {
                        "terms": {
                            "field": "node_name.keyword",
                            "size": ES_TERMS_AGGR_SIZE
                        },
                        "aggs": {
                            "scan_id": {
                                "terms": {
                                    "field": "scan_id.keyword",
                                    "size": ES_TERMS_AGGR_SIZE
                                },
                                "aggs": {
                                    "scan_recent_timestamp": {
                                        "max": {
                                            "field": "@timestamp"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                filter_for_scan = {}
                if len(filters.get("type", [])) != 0:
                    filter_for_scan = { "node_type" : filters.get("type") }
                aggs_response = ESConn.aggregation_helper(
                     SECRET_SCAN_INDEX, filter_for_scan, aggs, number, time_unit, None
                )
                if "aggregations" in aggs_response:
                    for image_aggr in aggs_response["aggregations"]["node_name"]["buckets"]:
                        latest_scan_id = ""
                        latest_scan_time = 0
                        for scan_id_aggr in image_aggr["scan_id"]["buckets"]:
                            if scan_id_aggr["scan_recent_timestamp"]["value"] > latest_scan_time:
                                latest_scan_time = scan_id_aggr["scan_recent_timestamp"]["value"]
                                latest_scan_id = scan_id_aggr["key"]
                        cve_scan_id_list.append(latest_scan_id)
        

        if number and time_unit and time_unit != 'all':
            rounding_time_unit = get_rounding_time_unit(time_unit)
            and_terms.append({
                "range": {
                    "@timestamp": {
                        "gt": "now-{0}{1}/{2}".format(number, time_unit, rounding_time_unit)
                    }
                }
            })

        for filter_key, filter_value in resource_filter.items():
            if not filter_value:
                continue
            if type(filter_value) == list:
                and_terms.append({"terms": {"{}.keyword".format(filter_key): filter_value}})
            else:
                and_terms.append({"term": {"{}.keyword".format(filter_key): filter_value}})

        if node_type == NODE_TYPE_HOST and not no_node_filters_set:
            host_names = []
            if not filtered_node_list:
                host_names = filters["host_name"]
            for filtered_node in filtered_node_list:
                if filtered_node.get("host_name"):
                    host_names.append(filtered_node["host_name"])
            # if len(host_names) > 0:
            #     # and_terms.append({"terms": {"host_name.keyword": host_names}})
            #     pass
        if node_type == NODE_TYPE_CONTAINER and not no_node_filters_set:
            container_names = []
            scope_ids = []
            for filtered_node in filtered_node_list:
                if filtered_node.get("name"):
                    container_names.append(filtered_node["name"])
                if filtered_node.get("scope_id"):
                    scope_ids.append(filtered_node["scope_id"])
            # if resource_type == CVE_TYPE_FIELD:
            #     if container_names:
            #         # and_terms.append({"terms": {"cve_container_name.keyword": container_names}})
            #         pass
        if node_type == NODE_TYPE_CONTAINER_IMAGE and not no_node_filters_set:
            image_name_with_tag_list = []
            scope_ids = []
            if not filtered_node_list:
                image_name_with_tag_list = filters["image_name_with_tag"]
                scope_ids = [i + ";<container_image>" for i in filters["image_name_with_tag"]]
            for filtered_node in filtered_node_list:
                if filtered_node.get("image_name_with_tag"):
                    image_name_with_tag_list.append(filtered_node["image_name_with_tag"])
                if filtered_node.get("scope_id"):
                    scope_ids.append(filtered_node["scope_id"])
            # if resource_type == CVE_INDEX:
            #     if image_name_with_tag_list:
            #         # and_terms.append({"terms": {"cve_container_image.keyword": image_name_with_tag_list}})
            #         pass
        if node_type == NODE_TYPE_POD and not no_node_filters_set:
            pod_names = []
            for filtered_node in filtered_node_list:
                if filtered_node.get("name"):
                    pod_names.append(filtered_node["name"])

        global_hits = []
        max_size = 49999  # Currently limiting to this, xlsx writer takes long time and times out

        def fetch_documents(res_type, query):
            es_hits = ESConn.get_data_from_scroll(res_type, query, page_size=10000, max_size=max_size)
            return es_hits

        def get_all_docs(node_scope_ids_list, cve_scan_id_list, and_terms, keyword, global_hits, resource_type):
            if len(node_scope_ids_list) != 0 and len(cve_scan_id_list) != 0:
                for index in range(0, len(node_scope_ids_list), ES_MAX_CLAUSE):
                    for scan_id_index in range(0, len(cve_scan_id_list), ES_MAX_CLAUSE):
                        and_terms_per_batch = copy.deepcopy(and_terms)
                        list_per_batch = cve_scan_id_list[scan_id_index:scan_id_index + ES_MAX_CLAUSE]
                        node_list_per_batch = node_scope_ids_list[index:index + ES_MAX_CLAUSE]

                        if len(list_per_batch) > 0:
                            and_terms_per_batch.append({"terms": {"scan_id.keyword": list_per_batch}})

                        if len(node_list_per_batch) > 0:
                            and_terms_per_batch.append({"terms": {"{0}.keyword".format(keyword): node_list_per_batch}})

                        query_body = {
                            "query": {"bool": {"must": and_terms_per_batch}},
                            "sort": [{"@timestamp": {"order": "desc"}}],
                            "_source": headers
                        }
                        hits = fetch_documents(resource_type, query_body)
                        global_hits.extend(hits)
            elif len(cve_scan_id_list) != 0:
                for index in range(0, len(cve_scan_id_list), ES_MAX_CLAUSE):
                    and_terms_per_batch = copy.deepcopy(and_terms)
                    list_per_batch = cve_scan_id_list[index:index + ES_MAX_CLAUSE]

                    if len(list_per_batch) > 0:
                        and_terms_per_batch.append({"terms": {"scan_id.keyword": list_per_batch}})

                    query_body = {
                        "query": {"bool": {"must": and_terms_per_batch}}, "sort": [{"@timestamp": {"order": "desc"}}],
                        "_source": headers
                    }
                    hits = fetch_documents(resource_type, query_body)
                    global_hits.extend(hits)
            else:
                and_terms_per_batch = copy.deepcopy(and_terms)

                query_body = {
                    "query": {"bool": {"must": and_terms_per_batch}}, "sort": [{"@timestamp": {"order": "desc"}}],
                    "_source": headers
                }
                hits = fetch_documents(resource_type, query_body)
                global_hits.extend(hits)

        if node_type == NODE_TYPE_CONTAINER_IMAGE and resource_type == CVE_INDEX:
            get_all_docs(image_name_with_tag_list, cve_scan_id_list, and_terms, "cve_container_image", global_hits,
                         resource_type)
        elif node_type == NODE_TYPE_CONTAINER and resource_type == CVE_INDEX:
            get_all_docs(container_names, cve_scan_id_list, and_terms, "cve_container_name", global_hits, resource_type)
        elif node_type == NODE_TYPE_HOST:
            get_all_docs(host_names, cve_scan_id_list, and_terms, "host_name", global_hits, resource_type)
        elif node_type == NODE_TYPE_POD and resource_type in [CVE_INDEX]:
            get_all_docs(pod_names, cve_scan_id_list, and_terms, "pod_name", global_hits, resource_type)

        global_hits = global_hits[:max_size]
        row_count = 1

        for es_doc in global_hits:
            doc = es_doc.get('_source')
            doc_index = es_doc.get('_index')
            col = 0
            if doc_index == SECRET_SCAN_INDEX:
                for header in headers:
                    header_split = header
                    if "." in header:
                        header_split = header.split('.')
                        value = doc.get(header_split[0])
                    else:
                        value = doc.get(header)
                    if type(value) == dict or type(value) == list:
                        value = value.get(header_split[1])
                    ws.write(row_count, col, value)
                    col += 1
            else:
                for header in headers:
                    value = doc.get(header)
                    if header == 'cloud_metadata':
                        if value:
                            for sub_header in header_fields['ALERT_TYPE_META_SUB_FIELD']:
                                sub_value = value.get(sub_header, '')
                                if type(sub_value) == dict or type(sub_value) == list:
                                    sub_value = json.dumps(sub_value)
                                ws.write(row_count, col, sub_value)
                                col += 1
                        else:
                            col += len(header_fields['ALERT_TYPE_META_SUB_FIELD'])
                        continue
                    if type(value) == dict or type(value) == list:
                        value = json.dumps(value)
                    ws.write(row_count, col, value)
                    col += 1
            row_count += 1
    wb.close()
    buffer.seek(0)
    return buffer

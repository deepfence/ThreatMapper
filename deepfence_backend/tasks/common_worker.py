import json
import traceback

from config.app import celery_app, app as flask_app

from tasks.task_scheduler import run_node_task
from utils.constants import REPORT_INDEX, \
    NODE_TYPE_HOST, ES_TERMS_AGGR_SIZE, CVE_SCAN_LOGS_INDEX, ES_MAX_CLAUSE, NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_CONTAINER, \
    PDF_REPORT_MAX_DOCS, REPORT_ES_TYPE, CVE_ES_TYPE, COMPLIANCE_INDEX, SECRET_SCAN_INDEX, SECRET_SCAN_ES_TYPE, \
    COMPLIANCE_ES_TYPE, CLOUD_COMPLIANCE_INDEX, CLOUD_COMPLIANCE_ES_TYPE, MALWARE_SCAN_ES_TYPE, MALWARE_SCAN_INDEX
import pandas as pd
import requests
from utils.constants import CVE_INDEX, MAX_TOTAL_SEVERITY_SCORE
import pdfkit
import jinja2
import numpy as np
import itertools
from datetime import datetime, date
from utils.esconn import ESConn
from utils.helper import mkdir_recursive, split_list_into_chunks, rmdir_recursive
from utils.reports import prepare_report_download, prepare_report_email_body
from utils.resource import filter_node_for_vulnerabilities, get_active_node_images_count, filter_node_for_compliance
from utils.common import get_rounding_time_unit
from copy import deepcopy
from dateutil.relativedelta import relativedelta


@celery_app.task(serializer='json', bind=True, default_retry_delay=60)
def common_worker(self, **kwargs):
    with flask_app.app_context():
        if kwargs.get("task_type") == "node_task":
            run_node_task(kwargs["action"], kwargs["node_action_details"])


def add_report_status_in_es(report_id, status, filters_applied_str, file_type, duration="None", report_path=None):
    if duration:
        if "d" in duration:
            duration = "Last " + duration.replace("d", " days")
        elif "all" in duration:
            duration = "All Documents"
    body = {
        "type": REPORT_ES_TYPE,
        "report_id": report_id,
        "status": status,
        "masked": 'false',
        "filters": filters_applied_str,
        "file_type": file_type,
        "duration": duration,
        "@timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    }
    if report_path:
        body["report_path"] = report_path
    ESConn.create_doc(REPORT_INDEX, body, refresh="wait_for")


def convert_time_unit_to_date(number, time_unit):
    if time_unit == 'M':
        start_time_str = str(date.today() + relativedelta(months=-number))
        end_time_str = str(date.today())
    elif time_unit == 'd':
        start_time_str = str(date.today() + relativedelta(days=-number))
        end_time_str = str(date.today())
    elif time_unit == 'h':
        start_time_str = str((datetime.now() + relativedelta(hours=-number)).time())
        end_time_str = str(datetime.now().time())
    elif time_unit == 'm':
        start_time_str = str((datetime.now() + relativedelta(minutes=-number)).time())
        end_time_str = str(datetime.now().time())
    else:
        start_time_str = 'All Data'
        end_time_str = 'All Data'
    return start_time_str, end_time_str


def compliance_pdf_report_cloud(filters, lucene_query_string, number, time_unit, domain_name, resource, node_type):
    if len(resource.get("compliance_check_type", "")) > 0:
        resource["compliance_check_type"] = resource.get("compliance_check_type", [])
    else:
        resource["compliance_check_type"] = []
    node_filters = deepcopy(filters)
    filters_applied = deepcopy(node_filters)

    from_arg = 0
    size_arg = 10000
    sort_order = "desc"
    sort_by = "@timestamp"
    _source = []
    filters_applied = {k: v for k, v in filters_applied.items() if v}
    filters_applied_str = json.dumps(filters_applied) if filters_applied else "None"

    filters['cloud_provider'] = filters['type']
    filters['compliance_check_type'] = resource["compliance_check_type"]
    del filters["type"]

    # if node_filters:
    #     tmp_filters = filter_node_for_compliance(node_filters)
    #     if tmp_filters:
    #         filters = {**filters, **tmp_filters}


    # # Count total data to fetch from es. If it's > 75000 docs, throw error
    doc_count = ESConn.count(CLOUD_COMPLIANCE_INDEX, filters, number=number, time_unit=time_unit,
                             lucene_query_string=lucene_query_string)
    if doc_count > PDF_REPORT_MAX_DOCS:
        return "<div>Error while fetching compliance data, please use filters to reduce the number of documents " \
                   "to download.</div> "

    search_response = ESConn.search_by_and_clause(
        CLOUD_COMPLIANCE_INDEX,
        filters,
        from_arg,
        sort_order,
        number,
        time_unit,
        lucene_query_string,
        size_arg,
        _source,
        sort_by=sort_by
    )
    filters.update({
        "type": CLOUD_COMPLIANCE_ES_TYPE,
        "masked": "false"
    })
    if len(search_response['hits']) == 0:
        return "<div>No compliance reports found for the applied filters</div>"

    try:
        df = pd.json_normalize(search_response['hits'])
    except Exception as ex:
        return "<div>No compliance reports found for the applied filters, Try with different filters</div>"

    def datetime_format(string):
        date_time = datetime.strptime(string, '%Y-%m-%dT%H:%M:%S.%fZ')
        return "{date} {time}".format(date=date_time.strftime("%d %b, %Y"), time=date_time.strftime("%H:%M:%S"))

    df['_source.@timestamp'] = df['_source.@timestamp'].apply(datetime_format)
    df['_source.status'] = df['_source.status'].apply(lambda x: x.lower())
    c_df = df[['_source.node_name','_source.account_id', '_source.control_id', '_source.compliance_check_type','_source.title',
               '_source.description', '_source.doc_id', '_source.status', '_source.@timestamp', '_source.cloud_provider']]

    template_loader = jinja2.FileSystemLoader(searchpath="/app/code/config/templates/")
    template_env = jinja2.Environment(loader=template_loader)

    compliance_check_type = c_df['_source.compliance_check_type'].unique()
    compliance_nodewise_count_report_html = ''
    all_hosts = c_df['_source.node_name'].unique()
    cloud_providers = c_df['_source.cloud_provider'].unique()
    account_ids = c_df['_source.account_id'].unique()
    all_status = ['alarm', 'ok', 'skip', 'info']
    page_index = 30


    for cloud_provider in cloud_providers:
        for account_id in account_ids:
            compliance_count_data_list = []
            temp_html = ''
            for check in compliance_check_type:
                compliance_count_data = {}
                compliance_count_data["compliance_check"] = check
                for status in all_status:
                    compliance_count_data[status] = len(c_df[(c_df['_source.account_id'] == account_id) & (
                            c_df['_source.status'] == status) & (c_df['_source.compliance_check_type'] == check) & (
                                                                    c_df['_source.cloud_provider'] == cloud_provider)])
                summ = 0
                for key, val in compliance_count_data.items():
                    if type(val) != str:
                        summ += val
                if summ > 0:
                    compliance_count_data_list.append(compliance_count_data)
            start_index = 0
            arr_index = 0
            end_index = 0
            content_length = 0
            while arr_index < len(compliance_count_data_list):
                content_length += len(compliance_count_data_list[arr_index]['compliance_check'])
                if page_index != 0:
                    page_break = ''
                else:
                    page_break = 'yes'
                if content_length > 1200 or end_index - start_index > 30 or page_index == 0:
                    end_index = arr_index
                    temp_html += template_env.get_template('detailed_report_nodewise_cloud_compliance_count.html').render(
                        data=compliance_count_data_list[start_index:end_index], summary_heading="Compliance Summary",
                        account_id=account_id, page_break=page_break, node_type=cloud_provider)
                    start_index = arr_index
                    content_length = 0
                    if page_index == 0:
                        page_index = 30
                elif arr_index == len(compliance_count_data_list) - 1 or page_index == 0:
                    end_index = arr_index + 1
                    temp_html += template_env.get_template('detailed_report_nodewise_cloud_compliance_count.html').render(
                        data=compliance_count_data_list[start_index:end_index], summary_heading="Compliance Summary",
                        account_id=account_id, page_break=page_break, node_type=cloud_provider)
                    if page_index == 0:
                        page_index = 26
                    else:
                        page_index -= 5
                else:
                    end_index += 1
                page_index -= 1
                arr_index += 1
            compliance_nodewise_count_report_html += temp_html
    compliance_nodewise_count_report_html += '<div class="page-break"></div>'


    compliance_nodewise_summary_report_html = ''

    for host in all_hosts:
        for check in compliance_check_type:
            conditioned_data = c_df[
                (c_df['_source.node_name'] == host) & (c_df['_source.compliance_check_type'] == check)]
            conditioned_data.insert(0, 'ID', range(1, 1 + len(conditioned_data)))
            conditioned_data_dict = conditioned_data.to_dict('records')

            if check in ['nist_master', 'nist_slave']:
                test_number = "yes"
            else:
                test_number = ""
            start_index = 0
            arr_index = 0
            end_index = 0
            content_length = 0
            while arr_index < len(conditioned_data_dict):
                content_length += len(conditioned_data_dict[arr_index]['_source.title'])
                if content_length > 580 or end_index - start_index > 23:
                    end_index = arr_index
                    compliance_nodewise_summary_report_html += template_env.get_template(
                        'detailed_report_nodewise_cloud_compliance.html').render(
                        data=conditioned_data_dict[start_index:end_index], host_name=host, compliance_type=check,
                        domain_name=domain_name, test_number=test_number,
                        time=conditioned_data_dict[0]['_source.@timestamp'])
                    start_index = arr_index
                    content_length = 0
                elif arr_index == len(conditioned_data_dict) - 1:
                    end_index = arr_index + 1
                    compliance_nodewise_summary_report_html += template_env.get_template(
                        'detailed_report_nodewise_cloud_compliance.html').render(
                        data=conditioned_data_dict[start_index:end_index], host_name=host, compliance_type=check,
                        domain_name=domain_name, test_number=test_number,
                        time=conditioned_data_dict[0]['_source.@timestamp'])
                else:
                    end_index += 1
                arr_index += 1

    start_time_str, end_time_str = convert_time_unit_to_date(number, time_unit)
    header_html = template_env.get_template('detailed_report_summary_report_header.html').render(
        start_time_str=start_time_str, end_time_str=end_time_str, heading="Compliance Summary")

    applied_filters_html = template_env.get_template('detailed_report_applied_filter.html').render(
        applied_filter="Applied Filters" if filters_applied else "Filters Not Applied", data=filters_applied)

    report_dict = {
        "compliance_nodewise_count_report_html": compliance_nodewise_count_report_html,
        "compliance_nodewise_summary_report_html": compliance_nodewise_summary_report_html.rstrip(
            '<div class="page-break"></div>'),
        "header_html": header_html,
        "applied_filters_html": applied_filters_html
    }
    final_html = template_env.get_template('detailed_report_summary_report.html').render(**report_dict)

    return final_html


def compliance_pdf_report(filters, lucene_query_string, number, time_unit, domain_name, resource):
    if len(resource.get("compliance_check_type", "")) > 0:
        resource["compliance_check_type"] = resource.get("compliance_check_type", "")
    else:
        resource["compliance_check_type"] = []

    filters['compliance_node_type'] = filters['type']
    filters['compliance_check_type'] = resource["compliance_check_type"]

    node_filters = deepcopy(filters)
    filters_applied = deepcopy(node_filters)

    del node_filters["type"]

    from_arg = 0
    size_arg = 10000
    sort_order = "desc"
    sort_by = "@timestamp"
    _source = []
    filters_applied = {k: v for k, v in filters_applied.items() if v}
    filters_applied_str = json.dumps(filters_applied) if filters_applied else "None"
    if node_filters:
        tmp_filters = filter_node_for_compliance(node_filters)
        if tmp_filters:
            filters = {**filters, **tmp_filters}

    del filters["type"]

    # Count total data to fetch from es. If it's > 75000 docs, throw error
    doc_count = ESConn.count(COMPLIANCE_INDEX, filters, number=number, time_unit=time_unit,
                             lucene_query_string=lucene_query_string)
    if doc_count > PDF_REPORT_MAX_DOCS:
        return "<div>Error while fetching compliance data, please use filters to reduce the number of documents " \
                   "to download.</div> "

    search_response = ESConn.search_by_and_clause(
        COMPLIANCE_INDEX,
        filters,
        from_arg,
        sort_order,
        number,
        time_unit,
        lucene_query_string,
        size_arg,
        _source,
        sort_by=sort_by
    )
    filters.update({
        "type": COMPLIANCE_ES_TYPE,
        "masked": "false"
    })
    if len(search_response['hits']) == 0:
        return "<div>No compliance reports found for the applied filters</div>"
    try:
        df = pd.json_normalize(search_response['hits'])
    except Exception as ex:
        return "<div>No compliance reports found for the applied filters, Try with different filters</div>"
    def datetime_format(string):
        date_time = datetime.strptime(string, '%Y-%m-%dT%H:%M:%S.%fZ')
        return "{date} {time}".format(date=date_time.strftime("%d %b, %Y"), time=date_time.strftime("%H:%M:%S"))
    df['_source.@timestamp'] = df['_source.@timestamp'].apply(datetime_format)
    df['_source.status'] = df['_source.status'].apply(lambda x: x.lower())
    c_df = df[['_source.node_name', '_source.test_category', '_source.compliance_check_type', '_source.test_number',
               '_source.description', '_source.doc_id', '_source.status', '_source.@timestamp', '_source.node_type']]

    template_loader = jinja2.FileSystemLoader(searchpath="/app/code/config/templates/")
    template_env = jinja2.Environment(loader=template_loader)
    compliance_check_type = c_df['_source.compliance_check_type'].unique()
    compliance_nodewise_count_report_html = ''
    all_hosts = c_df['_source.node_name'].unique()
    node_types = c_df['_source.node_type'].unique()
    all_status = ['pass', 'note', 'warn', 'info', 'fail']
    page_index = 30
    for node in node_types:
        for check in compliance_check_type:
            compliance_count_data_list = []
            temp_html = ''
            for host in all_hosts:
                compliance_count_data = {}
                compliance_count_data["host_name"] = host
                for status in all_status:
                    compliance_count_data[status] = len(c_df[(c_df['_source.node_name'] == host) & (
                            c_df['_source.status'] == status) & (c_df['_source.compliance_check_type'] == check) & (
                                                                     c_df['_source.node_type'] == node)])
                summ = 0
                for key, val in compliance_count_data.items():
                    if type(val) != str:
                        summ += val
                if summ > 0:
                    compliance_count_data_list.append(compliance_count_data)
            start_index = 0
            arr_index = 0
            end_index = 0
            content_length = 0
            while arr_index < len(compliance_count_data_list):
                content_length += len(compliance_count_data_list[arr_index]['host_name'])
                if page_index != 0:
                    page_break = ''
                else:
                    page_break = 'yes'
                if content_length > 1200 or end_index - start_index > 30 or page_index == 0:
                    end_index = arr_index
                    temp_html += template_env.get_template('detailed_report_nodewise_compliance_count.html').render(
                        data=compliance_count_data_list[start_index:end_index], summary_heading="Compliance Summary",
                        check=check, page_break=page_break, node_type=node)
                    start_index = arr_index
                    content_length = 0
                    if page_index == 0:
                        page_index = 30
                elif arr_index == len(compliance_count_data_list) - 1 or page_index == 0:
                    end_index = arr_index + 1
                    temp_html += template_env.get_template('detailed_report_nodewise_compliance_count.html').render(
                        data=compliance_count_data_list[start_index:end_index], summary_heading="Compliance Summary",
                        check=check, page_break=page_break, node_type=node)
                    if page_index == 0:
                        page_index = 26
                    else:
                        page_index -= 5
                else:
                    end_index += 1
                page_index -= 1
                arr_index += 1
            compliance_nodewise_count_report_html += temp_html
    compliance_nodewise_count_report_html += '<div class="page-break"></div>'


    compliance_nodewise_summary_report_html = ''

    for host in all_hosts:
        for check in compliance_check_type:
            conditioned_data = c_df[
                (c_df['_source.node_name'] == host) & (c_df['_source.compliance_check_type'] == check)]
            conditioned_data.insert(0, 'ID', range(1, 1 + len(conditioned_data)))
            conditioned_data_dict = conditioned_data.to_dict('records')
            if check in ['nist_master', 'nist_slave']:
                test_number = "yes"
            else:
                test_number = ""
            start_index = 0
            arr_index = 0
            end_index = 0
            content_length = 0
            while arr_index < len(conditioned_data_dict):
                content_length += len(conditioned_data_dict[arr_index]['_source.test_category'])
                if content_length > 580 or end_index - start_index > 23:
                    end_index = arr_index
                    compliance_nodewise_summary_report_html += template_env.get_template(
                        'detailed_report_nodewise_compliance.html').render(
                        data=conditioned_data_dict[start_index:end_index], host_name=host, compliance_type=check,
                        domain_name=domain_name, test_number=test_number,
                        time=conditioned_data_dict[0]['_source.@timestamp'])
                    start_index = arr_index
                    content_length = 0
                elif arr_index == len(conditioned_data_dict) - 1:
                    end_index = arr_index + 1
                    compliance_nodewise_summary_report_html += template_env.get_template(
                        'detailed_report_nodewise_compliance.html').render(
                        data=conditioned_data_dict[start_index:end_index], host_name=host, compliance_type=check,
                        domain_name=domain_name, test_number=test_number,
                        time=conditioned_data_dict[0]['_source.@timestamp'])
                else:
                    end_index += 1
                arr_index += 1
    start_time_str, end_time_str = convert_time_unit_to_date(number, time_unit)
    header_html = template_env.get_template('detailed_report_summary_report_header.html').render(
        start_time_str=start_time_str, end_time_str=end_time_str, heading="Compliance Summary")
    applied_filters_html = template_env.get_template('detailed_report_applied_filter.html').render(
        applied_filter="Applied Filters" if filters_applied else "Filters Not Applied", data=filters_applied)
    report_dict = {
        "compliance_nodewise_count_report_html": compliance_nodewise_count_report_html,
        "compliance_nodewise_summary_report_html": compliance_nodewise_summary_report_html.rstrip(
            '<div class="page-break"></div>'),
        "header_html": header_html,
        "applied_filters_html": applied_filters_html
    }
    final_html = template_env.get_template('detailed_report_summary_report.html').render(**report_dict)

    return final_html


def vulnerability_pdf_report(filters, lucene_query_string, number, time_unit, resource, node_type):
    if len(resource.get("cve_severity", "")) > 0:
        resource["cve_severity"] = resource.get("cve_severity", "").split(",")
    else:
        resource["cve_severity"] = []
    
    filters["node_type"] = filters.get("type",[] )
    node_filters = deepcopy(filters)
    filters_applied = deepcopy(node_filters)
    del node_filters["type"]
    filters_cve_scan = {"action": "COMPLETED"}
    filters["type"] = CVE_ES_TYPE
    node_filters_for_cve_scan_index = {}
    

    if node_filters:
        node_filters_for_cve_index, node_filters_for_cve_scan_index = filter_node_for_vulnerabilities(node_filters)
        if node_filters_for_cve_index:
            filters = {**filters, **node_filters_for_cve_index}
            filters_cve_scan = {**filters_cve_scan, **node_filters_for_cve_scan_index}
            
    and_terms = []
    for key, value in filters.items():
        if key == "image_name_with_tag":
            continue
        if type(value) is not list:
            value = [value]
        if value:
            and_terms.append({"terms": {key + ".keyword": value}})
            

    for key, value in resource.items():
        if type(value) is not list:
            value = [value]
        if value and len(value) != 0:
            if key == "cve_severity":
                and_terms.append({"terms": {"cve_severity": value}})
            else:
                and_terms.append({"terms": {key: value}})

    if number and time_unit and time_unit != 'all':
        rounding_time_unit = get_rounding_time_unit(time_unit)
        and_terms.append({"range": {"@timestamp": {"gt": "now-{0}{1}/{2}".format(
            number, time_unit, rounding_time_unit)}}})

    query_body = {"query": {"bool": {"must": and_terms}}, "sort": [{"@timestamp": {"order": "desc"}}]}
    


    filters_applied = {**filters_applied, **resource}
    filters_applied = {k: v for k, v in filters_applied.items() if v}
    filters_applied_str = json.dumps(filters_applied) if filters_applied else "None"

    template_loader = jinja2.FileSystemLoader(searchpath="/app/code/config/templates/")
    template_env = jinja2.Environment(loader=template_loader)

    # Get most recent scan_id
    cve_scan_aggs = {
        "node_id": {
            "terms": {
                "field": "node_id.keyword",
                "size": ES_TERMS_AGGR_SIZE
            },
            "aggs": {
                "docs": {
                    "top_hits": {
                        "size": 1,
                        "sort": [{"@timestamp": {"order": "desc"}}, {"scan_id.keyword": {"order": "desc"}}],
                        "_source": {"includes": ["scan_id"]}
                    }
                }
            }
        }
    }

    cve_scan_aggs_response = ESConn.aggregation_helper(
        CVE_SCAN_LOGS_INDEX, filters_cve_scan, cve_scan_aggs, number, time_unit,
        lucene_query_string, add_masked_filter=False)
    recent_scan_ids = []
    for node_id_bkt in cve_scan_aggs_response.get("aggregations", {}).get("node_id", {}).get("buckets", []):
        if node_id_bkt.get("docs", {}).get("hits", {}).get("hits", []):
            recent_scan_ids.append(node_id_bkt["docs"]["hits"]["hits"][0]["_source"]["scan_id"])
    if not recent_scan_ids:
        return "<div>No vulnerabilities found for the applied filters</div>"

    recent_scan_id_chunks = split_list_into_chunks(recent_scan_ids, ES_MAX_CLAUSE)

    # Count total data to fetch from es. If it's > 75000 docs, throw error
    doc_count = 0
    for scan_id_chunk in recent_scan_id_chunks:
        tmp_filters = deepcopy(filters)
        tmp_filters["scan_id"] = scan_id_chunk
        doc_count += ESConn.count(CVE_INDEX, tmp_filters, number=number, time_unit=time_unit,
                                  lucene_query_string=lucene_query_string)
        if doc_count > PDF_REPORT_MAX_DOCS:
            return "<div>Error while fetching vulnerabilities, please use filters to reduce the number of documents " \
                   "to download.</div> "

    cve_data = []
    for scan_id_chunk in recent_scan_id_chunks:
        query = deepcopy(query_body)
        query["query"]["bool"]["must"].append({"terms": {"scan_id.keyword": scan_id_chunk}})
        for total_pages, page_count, page_items, page_data in ESConn.scroll(
                CVE_INDEX, query, page_size=5000):
            docs = page_data.get('hits', {}).get('hits', [])
            for doc in docs:
                if doc.get("_source"):
                    cve_data.append(doc["_source"])
    if not cve_data:
        return "<div>No vulnerabilities found for the applied filter</div>"
    df = pd.json_normalize(cve_data)
    cve_count = {}
    severity_types = ["critical", "high", "medium", "low"]

    if len(resource.get("cve_severity", [])) != 0:
        applied_severity = resource.get("cve_severity", [])
    else:
        applied_severity = deepcopy(severity_types)

    cve_table_html = ""
    active_node_images_count = get_active_node_images_count(node_filters)
    node_types = [i for i in [NODE_TYPE_HOST, NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_CONTAINER] if i in df.node_type.unique()]
    for node_type in node_types:
        for severity_type in severity_types:
            count = int(
                df[(df['cve_severity'] == str(severity_type)) & (df['node_type'] == str(node_type))]['count'].sum())
            cve_count[severity_type] = count
        if node_type == NODE_TYPE_HOST:
            count_data = {
                "active": active_node_images_count['hosts'],
                "scanned": len(df[df['node_type'] == NODE_TYPE_HOST]['host_name'].unique())
            }
            total_cluster_count = 0
            total_worker_node_count = 0
            all_k8_hosts = []
            for _, info in active_node_images_count['clusters'].items():
                total_cluster_count += 1
                total_worker_node_count += info['count']
                all_k8_hosts += info['hosts']
            not_scanned_k8_worker_node = len(
                set(all_k8_hosts) - set(df[df['node_type'] == NODE_TYPE_HOST]['host_name'].unique()))
            scanned_host = len(set(df[df['node_type'] == NODE_TYPE_HOST]['host_name'].unique()) - set(all_k8_hosts))
            scanned_host_names_dead_active = set(df[df['node_type'] == NODE_TYPE_HOST]['host_name'].unique()) - set(
                all_k8_hosts)
            scanned_host_names_active_count = len(set(active_node_images_count['host_names']) - (
                    set(active_node_images_count['host_names']) - scanned_host_names_dead_active))
            scanned_dead_host_count = scanned_host - scanned_host_names_active_count

            final_string = ""
            if "kubernetes_cluster_name" in filters_applied:
                k8_summary_str = "{total_cluster_count} kubernetes clusters - scanned {total_worker_node_count_scanned} out of {total_worker_node_count} worker nodes. ".format(
                    total_cluster_count=total_cluster_count,
                    total_worker_node_count_scanned=total_worker_node_count - not_scanned_k8_worker_node,
                    total_worker_node_count=total_worker_node_count)
                final_string += k8_summary_str

            if "host_name" in filters_applied:
                host_summary_str = "scanned {scanned_host_names_active_count} out of {active_hosts_count} hosts. ".format(
                    scanned_host_names_active_count=scanned_host_names_active_count,
                    active_hosts_count=count_data["active"])
                final_string += host_summary_str

            # dead_host_summary = "{scanned_dead_host_count} hosts currently not monitored)".format(scanned_dead_host_count=scanned_dead_host_count)

            if final_string:
                summary_heading = "Host Summary ({final_string})".format(final_string=final_string)
            else:
                summary_heading = "Host Summary"

        else:
            count_data = {
                "active": active_node_images_count['images'],
                "scanned": len(df[df['node_type'] == NODE_TYPE_CONTAINER_IMAGE]['cve_container_image'].unique())
            }
            scanned_images_names_dead_active = set(
                df[df['node_type'] == NODE_TYPE_CONTAINER_IMAGE]['cve_container_image'].unique())
            scanned_image_names_active_count = len(
                set(active_node_images_count['image_names']) - scanned_images_names_dead_active)
            scanned_image_names_dead_count = len(
                scanned_images_names_dead_active - set(active_node_images_count['image_names']))
            
            if node_type == NODE_TYPE_CONTAINER:
                active_image_summary = "Container Summary (scanned {scanned_image_names_active_count} out of {active} images)".format(
                scanned_image_names_active_count=scanned_image_names_active_count, active=count_data['active'])
            else:
                active_image_summary = "Image Summary (scanned {scanned_image_names_active_count} out of {active} images)".format(
                scanned_image_names_active_count=scanned_image_names_active_count, active=count_data['active'])

            dead_image_summary = "{scanned_image_names_dead_count} images currently not monitored. ".format(
                scanned_image_names_dead_count=scanned_image_names_dead_count)

            summary_heading = active_image_summary

        cve_table_html += template_env.get_template('detailed_report_summary_report_table.html').render(
            cve_count=cve_count, summary_heading=summary_heading, count_data=count_data,
            applied_severity=applied_severity)

    table_index_length = 22
    for node_type in node_types:
        if node_type == 'host':
            df3 = df[df['node_type'] == node_type][['cve_severity', 'host_name', 'count']]
            pivot_table = pd.pivot_table(df3, index=["host_name", "cve_severity"], aggfunc=[np.sum])

            node_count_info = {}
            temp_df = df[df['node_type'] == node_type][['host_name', 'cve_overall_score']].groupby('host_name').sum()
            temp_df['score'] = temp_df['cve_overall_score'].apply(lambda x: min(x * 10 / MAX_TOTAL_SEVERITY_SCORE, 10))

            for host_name in temp_df.sort_values('score', ascending=False).index:
                node_count_info[host_name] = {}

            for i, v in pivot_table.to_dict()[('sum', 'count')].items():
                if i[0] not in node_count_info:
                    node_count_info[i[0]] = {i[1]: v}
                else:
                    node_count_info[i[0]][i[1]] = v
            summary_heading = "Host & worker node vulnerabilities"
            start_index = 0

            arr_index = 0
            end_index = 0
            content_length = 0
            while arr_index < len(node_count_info.keys()):
                content_length += len(list(node_count_info.keys())[arr_index])
                if content_length > 2950 or end_index - start_index > table_index_length:
                    end_index = arr_index
                    cve_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=applied_severity)
                    start_index = arr_index
                    content_length = 0
                    table_index_length = 30
                elif content_length <= 2950 and arr_index == len(node_count_info.keys()) - 1:
                    end_index = arr_index + 1
                    cve_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=applied_severity)
                    table_index_length = 30
                else:
                    end_index += 1
                arr_index += 1

        else:
            df3 = df[df['node_type'] == node_type][['cve_severity', 'cve_container_image', 'count']]
            pivot_table = pd.pivot_table(df3, index=["cve_container_image", "cve_severity"], aggfunc=[np.sum])

            node_count_info = {}
            temp_df = df[df['node_type'] == node_type][['cve_container_image', 'cve_overall_score']].groupby(
                'cve_container_image').sum()
            temp_df['score'] = temp_df['cve_overall_score'].apply(lambda x: min(x * 10 / MAX_TOTAL_SEVERITY_SCORE, 10))

            for host_name in temp_df.sort_values('score', ascending=False).index:
                node_count_info[host_name] = {}

            for i, v in pivot_table.to_dict()[('sum', 'count')].items():
                if i[0] not in node_count_info:
                    node_count_info[i[0]] = {i[1]: v}
                else:
                    node_count_info[i[0]][i[1]] = v
            
            if node_type == NODE_TYPE_CONTAINER:
                summary_heading = "Container vulnerabilities"
            else:
                summary_heading = "Image vulnerabilities"
            start_index = 0
            arr_index = 0
            end_index = 0
            content_length = 0
            while arr_index < len(node_count_info.keys()):
                content_length += len(list(node_count_info.keys())[arr_index])
                if content_length > 2950 or end_index - start_index > table_index_length:
                    end_index = arr_index
                    cve_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=applied_severity)
                    start_index = arr_index
                    content_length = 0
                    table_index_length = 30
                elif content_length <= 2950 and arr_index == len(node_count_info.keys()) - 1:
                    end_index = arr_index + 1
                    cve_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=applied_severity)
                    table_index_length = 30
                else:
                    end_index += 1
                arr_index += 1

    node_wise_vulnerability_html = ''
    for node_type in node_types:
        if node_type == NODE_TYPE_HOST:
            for host_name in df[df['node_type'] == node_type]['host_name'].unique():
                df2 = df[(df['host_name'] == host_name) & (df['node_type'] == node_type)][
                    ['cve_id', 'cve_severity', 'cve_caused_by_package', 'cve_link', 'cve_description',
                     'cve_overall_score']].sort_values('cve_overall_score', ascending=False)
                df2.insert(0, 'ID', range(1, 1 + len(df2)))
                vulnerability_data = df2.to_dict('records')
                start_index = 0
                arr_index = 0
                content_length = 0
                end_index = 0
                while arr_index < len(vulnerability_data):
                    content_length += len(vulnerability_data[arr_index]['cve_caused_by_package'])
                    if content_length > 1900 or end_index - start_index > 21:
                        end_index = arr_index
                        node_wise_vulnerability_html += template_env.get_template(
                            'detailed_report_nodewise_vulnerability.html').render(
                            host_image_name=host_name, data=vulnerability_data[start_index: end_index])
                        start_index = arr_index
                        content_length = 0
                    elif content_length <= 1900 and arr_index == len(vulnerability_data) - 1:
                        end_index = arr_index + 1
                        node_wise_vulnerability_html += template_env.get_template(
                            'detailed_report_nodewise_vulnerability.html').render(
                            host_image_name=host_name, data=vulnerability_data[start_index: end_index])
                    else:
                        end_index += 1
                    arr_index += 1
        else:
            for cve_container_image in df[df['node_type'] == node_type]['cve_container_image'].unique():
                df2 = df[(df['cve_container_image'] == cve_container_image) & (df['node_type'] == node_type)][
                    ['cve_id', 'cve_severity', 'cve_caused_by_package', 'cve_link', 'cve_description',
                     'cve_overall_score']].sort_values('cve_overall_score', ascending=False)
                df2.insert(0, 'ID', range(1, 1 + len(df2)))
                vulnerability_data = df2.to_dict('records')
                start_index = 0
                arr_index = 0
                content_length = 0
                end_index = 0
                while arr_index < len(vulnerability_data):
                    content_length += len(vulnerability_data[arr_index]['cve_caused_by_package'])
                    if content_length > 1900 or end_index - start_index > 21:
                        end_index = arr_index
                        node_wise_vulnerability_html += template_env.get_template(
                            'detailed_report_nodewise_vulnerability.html').render(
                            host_image_name=cve_container_image, data=vulnerability_data[start_index: end_index])
                        start_index = arr_index
                        content_length = 0
                    elif content_length <= 1900 and arr_index == len(vulnerability_data) - 1:
                        end_index = arr_index + 1
                        node_wise_vulnerability_html += template_env.get_template(
                            'detailed_report_nodewise_vulnerability.html').render(
                            host_image_name=cve_container_image, data=vulnerability_data[start_index: end_index])
                    else:
                        end_index += 1
                    arr_index += 1

    start_time_str, end_time_str = convert_time_unit_to_date(number, time_unit)
    header_html = template_env.get_template('detailed_report_summary_report_header.html').render(
        start_time_str=start_time_str, end_time_str=end_time_str, heading="Vulnerability Report")
    applied_filters_html = template_env.get_template('detailed_report_applied_filter.html').render(
        applied_filter="Applied Filters" if filters_applied else "Filters Not Applied", data=filters_applied)

    report_dict = {
        "cve_table_html": cve_table_html,
        "node_wise_vulnerability_html": node_wise_vulnerability_html.rstrip('<div class="page-break"></div>'),
        "header_html": header_html,
        "applied_filters_html": applied_filters_html
    }
    final_html = template_env.get_template('detailed_report_summary_report.html').render(**report_dict)
    return final_html


def vulnerability_pdf_report_secret(filters, lucene_query_string, number, time_unit, resource):
    node_filters = deepcopy(filters)
    filters_applied = deepcopy(node_filters)
    filters_cve_scan = {"action": "COMPLETED"}
    # filters["type"] = SECRET_SCAN_ES_TYPE
    cve_scan_id_list = []
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
        filter_for_scan["node_type"] = filters.get("type")
    if len(filters.get("host_name", [])) != 0:
        filter_for_scan["node_name"] = filters.get("host_name")
    if len(filters.get("image_name_with_tag", [])) != 0:
        filter_for_scan["node_name"] = filters.get("image_name_with_tag")
    if len(filters.get("container_name", [])) != 0:
        filter_for_scan["container_name"] = filters.get("container_name")
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

    and_terms = []
    for key, value in filters.items():
        if key == "type":
            continue
        if key == "image_name_with_tag":
            key = "node_name"
        if type(value) is not list:
            value = [value]
        if value:
            and_terms.append({"terms": {key + ".keyword": value}})

    # for key, value in resource.items():
    #     if type(value) is not list:
    #         value = [value]
    #     if value and len(value) != 0:
    #         if key == "cve_severity":
    #             and_terms.append({"terms": {"cve_severity": value}})
    #         else:
    #             and_terms.append({"terms": {key: value}})

    if number and time_unit and time_unit != 'all':
        rounding_time_unit = get_rounding_time_unit(time_unit)
        and_terms.append({"range": {"@timestamp": {"gt": "now-{0}{1}/{2}".format(
            number, time_unit, rounding_time_unit)}}})

    query_body = {"query": {"bool": {"must": and_terms}}, "sort": [{"@timestamp": {"order": "desc"}}]}

    recent_scan_id_chunks = split_list_into_chunks(cve_scan_id_list, ES_MAX_CLAUSE)

    # Count total data to fetch from es. If it's > 75000 docs, throw error
    doc_count = 0
    for scan_id_chunk in recent_scan_id_chunks:
        tmp_filters = deepcopy({})
        tmp_filters["scan_id"] = scan_id_chunk
        doc_count += ESConn.count(SECRET_SCAN_INDEX, tmp_filters, number=number, time_unit=time_unit,
                                  lucene_query_string=lucene_query_string)
        if doc_count > PDF_REPORT_MAX_DOCS:
            return "<div>Error while fetching vulnerabilities, please use filters to reduce the number of documents " \
                   "to download.</div> "

    secret_scan_data = []
    for scan_id_chunk in recent_scan_id_chunks:
        query = deepcopy(query_body)

        query["query"]["bool"]["must"].append({"terms": {"scan_id.keyword": scan_id_chunk}})
        for total_pages, page_count, page_items, page_data in ESConn.scroll(
                SECRET_SCAN_INDEX, query, page_size=5000):
            docs = page_data.get('hits', {}).get('hits', [])
            for doc in docs:
                if doc.get("_source"):
                    secret_scan_data.append(doc["_source"])
    if not secret_scan_data:
        return "<div>No vulnerabilities found for the applied filter</div>"
    df = pd.json_normalize(secret_scan_data)
    df.insert(0, 'count', 1)
    secret_count = {}
    severity_types = ["critical", "high", "medium", "low"]

    template_loader = jinja2.FileSystemLoader(searchpath="/app/code/config/templates/")
    template_env = jinja2.Environment(loader=template_loader)

    secret_table_html = ""

    severity_wise_frequency = df['Severity.level'].value_counts()
    for severity_type in severity_types:
        secret_count[severity_type] = severity_wise_frequency.get(severity_type, 0)

    secret_table_html += template_env.get_template('detailed_secret_summary_table.html').render(
        secret_count=secret_count, summary_heading="total count severity wise", applied_severity=severity_types)

    node_types = [i for i in [NODE_TYPE_HOST, NODE_TYPE_CONTAINER_IMAGE,NODE_TYPE_CONTAINER] if i in df.node_type.unique()]
    table_index_length = 22
    for node_type in node_types:
        if node_type == 'host':
            df3 = df[df['node_type'] == node_type][["Severity.level", 'host_name', 'count']]
            pivot_table = pd.pivot_table(df3, index=["host_name", "Severity.level"], aggfunc=[np.sum])

            node_count_info = {}
            temp_df = df[df['node_type'] == node_type][['host_name', 'count']].groupby('host_name').sum()
            temp_df['score'] = temp_df['count'].apply(lambda x: min(x * 10 / MAX_TOTAL_SEVERITY_SCORE, 10))

            for host_name in temp_df.sort_values('score', ascending=False).index:
                node_count_info[host_name] = {}

            for i, v in pivot_table.to_dict()[('sum', 'count')].items():
                if i[0] not in node_count_info:
                    node_count_info[i[0]] = {i[1]: v}
                else:
                    node_count_info[i[0]][i[1]] = v
            summary_heading = "Host & worker node secrets"
            start_index = 0

            arr_index = 0
            end_index = 0
            content_length = 0
            while arr_index < len(node_count_info.keys()):
                content_length += len(list(node_count_info.keys())[arr_index])
                if content_length > 2950 or end_index - start_index > table_index_length:
                    end_index = arr_index
                    secret_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=severity_types)
                    start_index = arr_index
                    content_length = 0
                    table_index_length = 30
                elif content_length <= 2950 and arr_index == len(node_count_info.keys()) - 1:
                    end_index = arr_index + 1
                    secret_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=severity_types)
                    table_index_length = 30
                else:
                    end_index += 1
                arr_index += 1

        else:
            if node_type == NODE_TYPE_CONTAINER:
                pivot = "container_name"
                summary_heading = "Container Secrets"
            else:
                pivot = "node_name"
                summary_heading = "Image Secrets"

            df3 = df[df['node_type'] == node_type][["Severity.level", pivot, 'count']]
            pivot_table = pd.pivot_table(df3, index=[pivot, "Severity.level"], aggfunc=[np.sum])

            node_count_info = {}
            temp_df = df[df['node_type'] == node_type][[pivot, 'count']].groupby(
                pivot).sum()
            temp_df['score'] = temp_df['count'].apply(lambda x: min(x * 10 / MAX_TOTAL_SEVERITY_SCORE, 10))

            for node_name in temp_df.sort_values('score', ascending=False).index:
                node_count_info[node_name] = {}

            for i, v in pivot_table.to_dict()[('sum', 'count')].items():
                if i[0] not in node_count_info:
                    node_count_info[i[0]] = {i[1]: v}
                else:
                    node_count_info[i[0]][i[1]] = v
            
            start_index = 0
            arr_index = 0
            end_index = 0
            content_length = 0
            while arr_index < len(node_count_info.keys()):
                content_length += len(list(node_count_info.keys())[arr_index])
                if content_length > 2950 or end_index - start_index > table_index_length:
                    end_index = arr_index
                    secret_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=severity_types)
                    start_index = arr_index
                    content_length = 0
                    table_index_length = 30
                elif content_length <= 2950 and arr_index == len(node_count_info.keys()) - 1:
                    end_index = arr_index + 1
                    secret_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=severity_types)
                    table_index_length = 30
                else:
                    end_index += 1
                arr_index += 1

    node_wise_secret_html = ''
    for node_type in node_types:
        if node_type == NODE_TYPE_HOST:
            for host_name in df[df['node_type'] == node_type]['host_name'].unique():
                df2 = df[(df['host_name'] == host_name) & (df['node_type'] == node_type)][
                    ['Match.full_filename', 'Match.matched_content', 'Rule.name', 'Rule.part', 'Severity.level',
                     'Severity.score']].sort_values('Severity.score', ascending=False)
                df2.insert(0, 'ID', range(1, 1 + len(df2)))
                secret_data = df2.to_dict('records')
                start_index = 0
                arr_index = 0
                content_length = 0
                end_index = 0
                while arr_index < len(secret_data):
                    content_length += len(secret_data[arr_index]['Match.matched_content'])
                    if content_length > 1900 or end_index - start_index > 21:
                        end_index = arr_index
                        node_wise_secret_html += template_env.get_template(
                            'detailed_report_nodewise_secret.html').render(
                            host_image_name=host_name, data=secret_data[start_index: end_index])
                        start_index = arr_index
                        content_length = 0
                    elif content_length <= 1900 and arr_index == len(secret_data) - 1:
                        end_index = arr_index + 1
                        node_wise_secret_html += template_env.get_template(
                            'detailed_report_nodewise_secret.html').render(
                            host_image_name=host_name, data=secret_data[start_index: end_index])
                    else:
                        end_index += 1
                    arr_index += 1
        else:
            if node_type == NODE_TYPE_CONTAINER:
                name = "container_name"
            else:
                name = "node_name"
            for node_name in df[df['node_type'] == node_type][name].unique():
                df2 = df[(df[name] == node_name) & (df['node_type'] == node_type)][
                    ['Match.full_filename', 'Match.matched_content', 'Rule.name', 'Rule.part', 'Severity.level',
                     'Severity.score']].sort_values('Severity.score', ascending=False)
                df2.insert(0, 'ID', range(1, 1 + len(df2)))
                secret_data = df2.to_dict('records')
                start_index = 0
                arr_index = 0
                content_length = 0
                end_index = 0
                while arr_index < len(secret_data):
                    content_length += len(secret_data[arr_index]['Match.matched_content'])
                    if content_length > 1900 or end_index - start_index > 21:
                        end_index = arr_index
                        node_wise_secret_html += template_env.get_template(
                            'detailed_report_nodewise_secret.html').render(
                            host_image_name=node_name, data=secret_data[start_index: end_index])
                        start_index = arr_index
                        content_length = 0
                    elif content_length <= 1900 and arr_index == len(secret_data) - 1:
                        end_index = arr_index + 1
                        node_wise_secret_html += template_env.get_template(
                            'detailed_report_nodewise_secret.html').render(
                            host_image_name=node_name, data=secret_data[start_index: end_index])
                    else:
                        end_index += 1
                    arr_index += 1

    start_time_str, end_time_str = convert_time_unit_to_date(number, time_unit)
    header_html = template_env.get_template('detailed_report_summary_report_header.html').render(
        start_time_str=start_time_str, end_time_str=end_time_str, heading="Secret Scan Report")
    applied_filters_html = template_env.get_template('detailed_report_applied_filter.html').render(
        applied_filter="Applied Filters" if filters_applied else "Filters Not Applied", data=filters_applied)

    report_dict = {
        "header_html": header_html,
        "applied_filters_html": applied_filters_html,
        "secret_table_html": secret_table_html,
        "node_wise_secret_html": node_wise_secret_html
    }

    final_html = template_env.get_template('detailed_secret_report_summary.html').render(**report_dict)
    return final_html


def malware_pdf_report(filters, lucene_query_string, number, time_unit, resource):
    node_filters = deepcopy(filters)
    filters_applied = deepcopy(node_filters)
    filters_cve_scan = {"action": "COMPLETED"}
    # filters["type"] = SECRET_SCAN_ES_TYPE
    malware_scan_id_list = []
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
        filter_for_scan["node_type"] = filters.get("type")
    if len(filters.get("host_name", [])) != 0:
        filter_for_scan["node_name"] = filters.get("host_name")
    if len(filters.get("image_name_with_tag", [])) != 0:
        filter_for_scan["node_name"] = filters.get("image_name_with_tag")
    if len(filters.get("container_name", [])) != 0:
        filter_for_scan["container_name"] = filters.get("container_name")
    aggs_response = ESConn.aggregation_helper(
        MALWARE_SCAN_INDEX, filter_for_scan, aggs, number, time_unit, None
    )
    if "aggregations" in aggs_response:
        for image_aggr in aggs_response["aggregations"]["node_name"]["buckets"]:
            latest_scan_id = ""
            latest_scan_time = 0
            for scan_id_aggr in image_aggr["scan_id"]["buckets"]:
                if scan_id_aggr["scan_recent_timestamp"]["value"] > latest_scan_time:
                    latest_scan_time = scan_id_aggr["scan_recent_timestamp"]["value"]
                    latest_scan_id = scan_id_aggr["key"]
            malware_scan_id_list.append(latest_scan_id)

    and_terms = []
    for key, value in filters.items():
        if key == "type":
            continue
        if key == "image_name_with_tag":
            key = "node_name"
        if type(value) is not list:
            value = [value]
        if value:
            and_terms.append({"terms": {key + ".keyword": value}})

    # for key, value in resource.items():
    #     if type(value) is not list:
    #         value = [value]
    #     if value and len(value) != 0:
    #         if key == "cve_severity":
    #             and_terms.append({"terms": {"cve_severity": value}})
    #         else:
    #             and_terms.append({"terms": {key: value}})

    if number and time_unit and time_unit != 'all':
        rounding_time_unit = get_rounding_time_unit(time_unit)
        and_terms.append({"range": {"@timestamp": {"gt": "now-{0}{1}/{2}".format(
            number, time_unit, rounding_time_unit)}}})

    query_body = {"query": {"bool": {"must": and_terms}}, "sort": [{"@timestamp": {"order": "desc"}}]}

    recent_scan_id_chunks = split_list_into_chunks(malware_scan_id_list, ES_MAX_CLAUSE)

    # Count total data to fetch from es. If it's > 75000 docs, throw error
    doc_count = 0
    for scan_id_chunk in recent_scan_id_chunks:
        tmp_filters = deepcopy({})
        tmp_filters["scan_id"] = scan_id_chunk
        doc_count += ESConn.count(MALWARE_SCAN_INDEX, tmp_filters, number=number, time_unit=time_unit,
                                  lucene_query_string=lucene_query_string)
        if doc_count > PDF_REPORT_MAX_DOCS:
            return "<div>Error while fetching malwares, please use filters to reduce the number of documents " \
                   "to download.</div> "

    malware_scan_data = []
    for scan_id_chunk in recent_scan_id_chunks:
        query = deepcopy(query_body)

        query["query"]["bool"]["must"].append({"terms": {"scan_id.keyword": scan_id_chunk}})
        for total_pages, page_count, page_items, page_data in ESConn.scroll(
                MALWARE_SCAN_INDEX, query, page_size=5000):
            docs = page_data.get('hits', {}).get('hits', [])
            for doc in docs:
                if doc.get("_source"):
                    malware_scan_data.append(doc["_source"])
    if not malware_scan_data:
        return "<div>No malwares found for the applied filter</div>"
    df = pd.json_normalize(malware_scan_data)
    df.insert(0, 'count', 1)
    malware_count = {}
    severity_types = ["critical", "high", "medium", "low"]

    template_loader = jinja2.FileSystemLoader(searchpath="/app/code/config/templates/")
    template_env = jinja2.Environment(loader=template_loader)

    malware_table_html = ""

    severity_wise_frequency = df['FileSeverity'].value_counts()
    for severity_type in severity_types:
        malware_count[severity_type] = severity_wise_frequency.get(severity_type, 0)

    malware_table_html += template_env.get_template('detailed_malware_summary_table.html').render(
        malware_count=malware_count, summary_heading="Total Count Severity Wise", applied_severity=severity_types)

    node_types = [i for i in [NODE_TYPE_HOST, NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_CONTAINER] if i in
                  df.node_type.unique()]
    table_index_length = 22
    for node_type in node_types:
        if node_type == 'host':
            df3 = df[df['node_type'] == node_type][["FileSeverity", 'host_name', 'count']]
            pivot_table = pd.pivot_table(df3, index=["host_name", "FileSeverity"], aggfunc=[np.sum])

            node_count_info = {}
            temp_df = df[df['node_type'] == node_type][['host_name', 'count']].groupby('host_name').sum()
            temp_df['score'] = temp_df['count'].apply(lambda x: min(x * 10 / MAX_TOTAL_SEVERITY_SCORE, 10))

            for host_name in temp_df.sort_values('score', ascending=False).index:
                node_count_info[host_name] = {}

            for i, v in pivot_table.to_dict()[('sum', 'count')].items():
                if i[0] not in node_count_info:
                    node_count_info[i[0]] = {i[1]: v}
                else:
                    node_count_info[i[0]][i[1]] = v
            summary_heading = "Host & worker node Malwares"
            start_index = 0

            arr_index = 0
            end_index = 0
            content_length = 0
            while arr_index < len(node_count_info.keys()):
                content_length += len(list(node_count_info.keys())[arr_index])
                if content_length > 2950 or end_index - start_index > table_index_length:
                    end_index = arr_index
                    malware_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=severity_types)
                    start_index = arr_index
                    content_length = 0
                    table_index_length = 30
                elif content_length <= 2950 and arr_index == len(node_count_info.keys()) - 1:
                    end_index = arr_index + 1
                    malware_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=severity_types)
                    table_index_length = 30
                else:
                    end_index += 1
                arr_index += 1

        else:
            if node_type == NODE_TYPE_CONTAINER:
                pivot = "container_name"
                summary_heading = "Container Malwares"
            else:
                pivot = "node_name"
                summary_heading = "Image Malwares"

            df3 = df[df['node_type'] == node_type][["FileSeverity", pivot, 'count']]
            pivot_table = pd.pivot_table(df3, index=[pivot, "FileSeverity"], aggfunc=[np.sum])

            node_count_info = {}
            temp_df = df[df['node_type'] == node_type][[pivot, 'count']].groupby(
                pivot).sum()
            temp_df['score'] = temp_df['count'].apply(lambda x: min(x * 10 / MAX_TOTAL_SEVERITY_SCORE, 10))

            for node_name in temp_df.sort_values('score', ascending=False).index:
                node_count_info[node_name] = {}

            for i, v in pivot_table.to_dict()[('sum', 'count')].items():
                if i[0] not in node_count_info:
                    node_count_info[i[0]] = {i[1]: v}
                else:
                    node_count_info[i[0]][i[1]] = v
            
            start_index = 0
            arr_index = 0
            end_index = 0
            content_length = 0
            while arr_index < len(node_count_info.keys()):
                content_length += len(list(node_count_info.keys())[arr_index])
                if content_length > 2950 or end_index - start_index > table_index_length:
                    end_index = arr_index
                    malware_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=severity_types)
                    start_index = arr_index
                    content_length = 0
                    table_index_length = 30
                elif content_length <= 2950 and arr_index == len(node_count_info.keys()) - 1:
                    end_index = arr_index + 1
                    malware_table_html += template_env.get_template(
                        'detailed_report_nodewise_vulnerability_count.html').render(
                        summary_heading=summary_heading, data=dict(itertools.islice(
                            node_count_info.items(), start_index, end_index)), applied_severity=severity_types)
                    table_index_length = 30
                else:
                    end_index += 1
                arr_index += 1

    node_wise_malware_html = ''
    for node_type in node_types:
        if node_type == NODE_TYPE_HOST:
            for host_name in df[df['node_type'] == node_type]['host_name'].unique():
                df2 = df[(df['host_name'] == host_name) & (df['node_type'] == node_type)][
                    ['CompleteFilename', 'Class', 'Summary', 'RuleName', 'FileSeverity', 'FileSevScore']
                ].sort_values('FileSevScore', ascending=False)
                df2.insert(0, 'ID', range(1, 1 + len(df2)))
                secret_data = df2.to_dict('records')
                start_index = 0
                arr_index = 0
                content_length = 0
                end_index = 0
                while arr_index < len(secret_data):
                    content_length += len(secret_data[arr_index]['Summary'])
                    if content_length > 1900 or end_index - start_index > 21:
                        end_index = arr_index
                        node_wise_malware_html += template_env.get_template(
                            'detailed_report_nodewise_malware.html').render(
                            host_image_name=host_name, data=secret_data[start_index: end_index])
                        start_index = arr_index
                        content_length = 0
                    elif content_length <= 1900 and arr_index == len(secret_data) - 1:
                        end_index = arr_index + 1
                        node_wise_malware_html += template_env.get_template(
                            'detailed_report_nodewise_malware.html').render(
                            host_image_name=host_name, data=secret_data[start_index: end_index])
                    else:
                        end_index += 1
                    arr_index += 1
        else:
            if node_type == NODE_TYPE_CONTAINER:
                name = "container_name"
            else:
                name = "node_name"
            for node_name in df[df['node_type'] == node_type][name].unique():
                df2 = df[(df[name] == node_name) & (df['node_type'] == node_type)][
                    ['CompleteFilename', 'Class', 'Summary', 'RuleName', 'FileSeverity', 'FileSevScore']
                ].sort_values('FileSevScore', ascending=False)
                df2.insert(0, 'ID', range(1, 1 + len(df2)))
                secret_data = df2.to_dict('records')
                start_index = 0
                arr_index = 0
                content_length = 0
                end_index = 0
                while arr_index < len(secret_data):
                    content_length += len(secret_data[arr_index]['Summary'])
                    if content_length > 1900 or end_index - start_index > 21:
                        end_index = arr_index
                        node_wise_malware_html += template_env.get_template(
                            'detailed_report_nodewise_malware.html').render(
                            host_image_name=node_name, data=secret_data[start_index: end_index])
                        start_index = arr_index
                        content_length = 0
                    elif content_length <= 1900 and arr_index == len(secret_data) - 1:
                        end_index = arr_index + 1
                        node_wise_malware_html += template_env.get_template(
                            'detailed_report_nodewise_malware.html').render(
                            host_image_name=node_name, data=secret_data[start_index: end_index])
                    else:
                        end_index += 1
                    arr_index += 1

    start_time_str, end_time_str = convert_time_unit_to_date(number, time_unit)
    header_html = template_env.get_template('detailed_report_summary_report_header.html').render(
        start_time_str=start_time_str, end_time_str=end_time_str, heading="Malware Scan Report")
    applied_filters_html = template_env.get_template('detailed_report_applied_filter.html').render(
        applied_filter="Applied Filters" if filters_applied else "Filters Not Applied", data=filters_applied)

    report_dict = {
        "header_html": header_html,
        "applied_filters_html": applied_filters_html,
        "malware_table_html": malware_table_html,
        "node_wise_malware_html": node_wise_malware_html
    }

    final_html = template_env.get_template('detailed_malware_report_summary.html').render(**report_dict)
    return final_html


def generate_xlsx_report(report_id, filters, number, time_unit, node_type, resources,
                         include_dead_nodes, report_email):
    add_report_status_in_es(report_id=report_id, status="In Progress",
                            filters_applied_str=str({"filters": filters, "resources": resources}), file_type="xlsx",
                            duration=f"{number}{time_unit}")
    xlsx_buffer = prepare_report_download(
        node_type, filters, resources,
        {"duration": {"number": number, "time_unit": time_unit}}, include_dead_nodes)
    if report_email == "":
        report_file_name = "/data/xlsx-report/" + report_id + "/report.xlsx"
        headers = {"DF_FILE_NAME": report_file_name}
        res = requests.post("http://deepfence-fetcher:8006/df-api/uploadMultiPart", headers=headers,
                            files={"DF_MULTIPART_BOUNDARY": xlsx_buffer})
        if res.status_code == 200:
            add_report_status_in_es(
                report_id=report_id, status="Completed",
                filters_applied_str=str({"filters": filters, "resources": resources}),
                file_type="xlsx", duration=f"{number}{time_unit}", report_path=report_file_name)
        else:
            add_report_status_in_es(
                report_id=report_id, status="Error. Please try again later.",
                filters_applied_str=str(
                    {"filters": {"filters": filters, "resources": resources}, "resources": resources}),
                file_type="xlsx", duration=f"{number}{time_unit}")
    else:
        from tasks.email_sender import send_email_with_attachment
        email_html = prepare_report_email_body(
            node_type, filters, resources,
            {"duration": {"number": number, "time_unit": time_unit}})
        send_email_with_attachment(
            recipients=[report_email], attachment=xlsx_buffer.getvalue(),
            attachment_file_name="deepfence-report.xlsx", subject='Deepfence Report', html=email_html,
            attachment_content_type="application/vnd.ms-excel; charset=UTF-8")


def generate_pdf_report(report_id, filters, node_type,
                        lucene_query_string, number, time_unit, resources, domain_name, report_email):
    add_report_status_in_es(report_id=report_id, status="In Progress",
                            filters_applied_str=str({"filters": filters, "resources": resources}), file_type="pdf",
                            duration=f"{number}{time_unit}")
    final_html = ""
    for resource in resources:
        resource_type = resource.get('type')
        if resource_type == CVE_ES_TYPE:
            final_html += vulnerability_pdf_report(filters=filters, lucene_query_string=lucene_query_string,
                                                   number=number, time_unit=time_unit,
                                                   resource=resource.get("filter", {}), node_type=node_type)
        elif resource_type == COMPLIANCE_ES_TYPE:
            if node_type == "aws" or node_type == "gcp" or node_type == "azure":
                final_html += compliance_pdf_report_cloud(filters=filters,
                                                          lucene_query_string=lucene_query_string,
                                                          number=number, time_unit=time_unit, domain_name=domain_name, resource=resource.get("filter", {}), node_type=node_type)
            else:
                final_html += compliance_pdf_report(filters=filters,
                                                    lucene_query_string=lucene_query_string,
                                                    number=number, time_unit=time_unit, domain_name=domain_name, resource=resource.get("filter", {}))
        elif resource_type == SECRET_SCAN_ES_TYPE:
            final_html += vulnerability_pdf_report_secret(filters=filters, lucene_query_string=lucene_query_string,
                                                          number=number, time_unit=time_unit,
                                                          resource=resource.get("filter", {}))
        elif resource_type == MALWARE_SCAN_ES_TYPE:
            final_html += malware_pdf_report(filters=filters, lucene_query_string=lucene_query_string,
                                             number=number, time_unit=time_unit, resource=resource.get("filter", {}))
    options = {
        'page-size': 'Letter',
        'margin-top': '0.5in',
        'margin-right': '0.1in',
        'margin-bottom': '0.5in',
        'margin-left': '0.1in',
        'encoding': "UTF-8",
        'no-outline': None
    }
    report_file_dir = "/data/pdf-report/" + report_id
    mkdir_recursive(report_file_dir)
    report_file_name = "/data/pdf-report/" + report_id + "/report.pdf"
    pdfkit.from_string(final_html, report_file_name, options=options)
    if report_email == "":
        headers = {"DF_FILE_NAME": report_file_name}
        with open(report_file_name, 'rb') as f:
            res = requests.post("http://deepfence-fetcher:8006/df-api/uploadMultiPart", headers=headers,
                                files={"DF_MULTIPART_BOUNDARY": f})
            if res.status_code == 200:
                add_report_status_in_es(
                    report_id=report_id, status="Completed",
                    filters_applied_str=str({"filters": filters, "resources": resources}), file_type="pdf",
                    report_path=report_file_name, duration=f"{number}{time_unit}")
            else:
                add_report_status_in_es(
                    report_id=report_id, status="Error. Please try again later.",
                    filters_applied_str=str({"filters": filters, "resources": resources}), file_type="pdf",
                    duration=f"{number}{time_unit}")
    else:
        from tasks.email_sender import send_email_with_attachment
        email_html = prepare_report_email_body(
            node_type, filters, resources,
            {"duration": {"number": number, "time_unit": time_unit}})
        send_email_with_attachment(
            recipients=[report_email], attachment=open(report_file_name, 'rb'),
            attachment_file_name="deepfence-report.pdf", subject='Deepfence Report', html=email_html,
            attachment_content_type="application/pdf; charset=UTF-8")
    rmdir_recursive(report_file_dir)


@celery_app.task(serializer='json', bind=True, default_retry_delay=60)
def generate_report(self, **kwargs):
    report_id = kwargs["report_id"]
    filters = deepcopy(kwargs["filters"])
    lucene_query_string = kwargs["lucene_query_string"]
    number = kwargs["number"]
    time_unit = kwargs["time_unit"]
    domain_name = kwargs['domain_name']
    resources = kwargs["resources"]
    file_type = kwargs["file_type"]
    node_type = kwargs["node_type"]
    include_dead_nodes = kwargs["include_dead_nodes"]
    report_email = kwargs["report_email"]

    try:
        if file_type == "xlsx":
            generate_xlsx_report(report_id=report_id, filters=filters, number=number, time_unit=time_unit,
                                 node_type=node_type, resources=resources,
                                 include_dead_nodes=include_dead_nodes, report_email=report_email)
        elif file_type == "pdf":
            generate_pdf_report(report_id=report_id, filters=filters,
                                lucene_query_string=lucene_query_string, number=number, time_unit=time_unit,
                                resources=resources, domain_name=domain_name, report_email=report_email,
                                node_type=node_type)
    except Exception as ex:
        flask_app.logger.error("Error creating report: {0} stackTrace: {1}".format(ex, traceback.format_exc()))
        add_report_status_in_es(
            report_id=report_id, status="Error. Please contact deepfence support",
            filters_applied_str=str({"filters": filters, "resources": resources}), file_type=file_type,
            duration=f"{number}{time_unit}")

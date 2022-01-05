import json
import traceback

from config.app import celery_app, app as flask_app

from tasks.task_scheduler import run_node_task
from utils.constants import REPORT_INDEX, \
    NODE_TYPE_HOST, ES_TERMS_AGGR_SIZE, CVE_SCAN_LOGS_INDEX, ES_MAX_CLAUSE, NODE_TYPE_CONTAINER_IMAGE, \
    PDF_REPORT_MAX_DOCS
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
from utils.resource import filter_node_for_vulnerabilities, get_active_node_images_count
from utils.common import get_rounding_time_unit
from copy import deepcopy
from dateutil.relativedelta import relativedelta


@celery_app.task(serializer='json', bind=True, default_retry_delay=60)
def common_worker(self, **kwargs):
    with flask_app.app_context():
        if kwargs.get("task_type") == "node_task":
            run_node_task(kwargs["action"], kwargs["node_action_details"])


def add_report_status_in_es(report_id, status, filters_applied_str, file_type, report_path=None):
    body = {
        "type": REPORT_INDEX,
        "report_id": report_id,
        "status": status,
        "masked": 'false',
        "filters": filters_applied_str,
        "file_type": file_type,
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


def vulnerability_pdf_report(filters, lucene_query_string, number, time_unit, resource):
    if len(resource.get("cve_severity", "")) > 0:
        resource["cve_severity"] = resource.get("cve_severity", "").split(",")
    else:
        resource["cve_severity"] = []
    node_filters = deepcopy(filters)
    filters_applied = deepcopy(node_filters)
    del node_filters["type"]
    filters_cve_scan = {"action": "COMPLETED"}
    filters["type"] = CVE_INDEX
    node_filters_for_cve_scan_index = {}

    if node_filters:
        node_filters_for_cve_index, node_filters_for_cve_scan_index = filter_node_for_vulnerabilities(node_filters)
        if node_filters_for_cve_index:
            filters = {**filters, **node_filters_for_cve_index}
            filters_cve_scan = {**filters_cve_scan, **node_filters_for_cve_scan_index}
    and_terms = []
    for key, value in filters.items():
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
    node_types = [i for i in [NODE_TYPE_HOST, NODE_TYPE_CONTAINER_IMAGE] if i in df.node_type.unique()]
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


def generate_xlsx_report(report_id, filters, number, time_unit, node_type, resources,
                         include_dead_nodes, report_email):
    add_report_status_in_es(report_id=report_id, status="In Progress",
                            filters_applied_str=str({"filters": filters, "resources": resources}), file_type="xlsx")
    xlsx_buffer = prepare_report_download(
        node_type, filters, resources,
        {"duration": {"number": number, "time_unit": time_unit}}, include_dead_nodes)
    if report_email == "":
        report_file_name = "/data/xlsx-report/" + report_id + "/report.xlsx"
        headers = {"DF_FILE_NAME": report_file_name}
        res = requests.post("https://deepfence-fetcher:8006/df-api/uploadMultiPart", headers=headers,
                            files={"DF_MULTIPART_BOUNDARY": xlsx_buffer}, verify=False)
        if res.status_code == 200:
            add_report_status_in_es(
                report_id=report_id, status="Completed",
                filters_applied_str=str({"filters": filters, "resources": resources}),
                file_type="xlsx", report_path=report_file_name)
        else:
            add_report_status_in_es(
                report_id=report_id, status="Error. Please try again later.",
                filters_applied_str=str(
                    {"filters": {"filters": filters, "resources": resources}, "resources": resources}),
                file_type="xlsx")
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
                            filters_applied_str=str({"filters": filters, "resources": resources}), file_type="pdf")
    final_html = ""
    for resource in resources:
        resource_type = resource.get('type')
        if resource_type == CVE_INDEX:
            flask_app.logger.error("resources:{0}, resource:{1}, filters:{2}".format(str(resources), str(resource),
                                                                                     str(filters)))
            final_html += vulnerability_pdf_report(filters=filters, lucene_query_string=lucene_query_string,
                                                   number=number, time_unit=time_unit,
                                                   resource=resource.get("filter", {}))
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
            res = requests.post("https://deepfence-fetcher:8006/df-api/uploadMultiPart", headers=headers,
                                files={"DF_MULTIPART_BOUNDARY": f}, verify=False)
            if res.status_code == 200:
                add_report_status_in_es(
                    report_id=report_id, status="Completed",
                    filters_applied_str=str({"filters": filters, "resources": resources}),
                    file_type="pdf", report_path=report_file_name)
            else:
                add_report_status_in_es(
                    report_id=report_id, status="Error. Please try again later.",
                    filters_applied_str=str({"filters": filters, "resources": resources}), file_type="pdf")
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
            filters_applied_str=str({"filters": filters, "resources": resources}), file_type=file_type)

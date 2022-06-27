import os
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
import math

EL_HOST = "%s://%s:%s" % (
os.getenv('ELASTICSEARCH_SCHEME', 'http'), os.environ['ELASTICSEARCH_HOST'], os.environ['ELASTICSEARCH_PORT'])
http_auth = None
CUSTOMER_UNIQUE_ID = os.getenv('CUSTOMER_UNIQUE_ID', None)

if 'ELASTICSEARCH_USER' in os.environ:
    http_auth = (os.environ['ELASTICSEARCH_USER'],
                 os.environ['ELASTICSEARCH_PASSWORD'])

if http_auth:
    EL_CLIENT = Elasticsearch([EL_HOST], http_auth=http_auth, timeout=300)
else:
    EL_CLIENT = Elasticsearch([EL_HOST], timeout=300)

SBOM_INDEX = "sbom-cve-scan"
SBOM_ARTIFACT_INDEX = "sbom-artifact"
if CUSTOMER_UNIQUE_ID:
    SBOM_INDEX += f"-{CUSTOMER_UNIQUE_ID}"
    SBOM_ARTIFACT_INDEX += f"-{CUSTOMER_UNIQUE_ID}"

ARRAY_SIZE = 5

if EL_CLIENT.indices.exists(index=SBOM_INDEX) and EL_CLIENT.indices.exists(index=SBOM_ARTIFACT_INDEX):
    sbom_count_array = EL_CLIENT.cat.count(SBOM_INDEX, params={"format": "json"})
    sbom_count = 0
    if sbom_count_array:
        sbom_count = int(sbom_count_array[0]["count"])
    if sbom_count > 0:
        page = EL_CLIENT.search(
            index=SBOM_INDEX,
            scroll='1m',
            size=ARRAY_SIZE,
            body={"query": {"match_all": {}}},
            sort="scan_id.keyword:desc",
            _source=["scan_id", "node_id", "node_type", "@timestamp", "time_stamp", "artifacts"]
        )
        scroll_id = page['_scroll_id']
        sbom_docs = page['hits']['hits']
        while len(sbom_docs):
            for sbom_doc in sbom_docs:
                body = {
                    "query": {
                        "constant_score": {
                            "filter": {
                                "bool": {
                                    "must": {
                                        "terms": {
                                            "scan_id.keyword": [sbom_doc["_source"]["scan_id"]]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                sbom_artifact_res = EL_CLIENT.search(index=SBOM_ARTIFACT_INDEX, body=body, size=1)
                if sbom_artifact_res.get("hits", {}).get("total", {}).get("value", -1) == 0:
                    source_doc = sbom_doc["_source"]
                    defaults = {
                        "scan_id": source_doc["scan_id"],
                        "node_id": source_doc["node_id"],
                        "node_type": source_doc["node_type"],
                        "masked": "false",
                        "@timestamp": source_doc["@timestamp"],
                        "time_stamp": source_doc["time_stamp"],
                    }
                    bulk_index_actions = []
                    for artifact in sbom_doc["_source"]["artifacts"]:
                        # print("Going through artifact: ", artifact["name"])
                        doc = {
                            **defaults,
                            "name": artifact["name"],
                            "version": artifact["version"],
                            "locations": artifact["locations"],
                            "licenses": artifact["licenses"],
                            "language": artifact["language"]
                        }
                        bulk_index_actions.append({
                            "_op_type": "index",
                            "_index": SBOM_ARTIFACT_INDEX,
                            "_source": doc
                        })
                    errors = bulk(EL_CLIENT, bulk_index_actions)
                    if len(errors[1]) != 0:
                        print("Error while bulk processing artifacts for scan_id: ", source_doc["scan_id"])
                        print(errors[1])

            page = EL_CLIENT.scroll(scroll_id=scroll_id, scroll='1m')
            scroll_id = page['_scroll_id']
            sbom_docs = page['hits']['hits']

from utils.constants import CVE_INDEX, ES_TERMS_AGGR_SIZE, SECRET_SCAN_INDEX
from utils.esconn import ESConn


def get_latest_cve_scan_id():
    # Deprecated: use utils.helper.get_recent_scan_ids
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
        CVE_INDEX,
        {"type": CVE_INDEX},
        aggs,
        add_masked_filter=False,
    )
    scan_ids = []
    if "aggregations" in aggs_response:
        for image_aggr in aggs_response["aggregations"]["cve_container_image"]["buckets"]:
            latest_scan_id = ""
            latest_scan_time = 0
            for scan_id_aggr in image_aggr["scan_id"]["buckets"]:
                if scan_id_aggr["scan_recent_timestamp"]["value"] > latest_scan_time:
                    latest_scan_time = scan_id_aggr["scan_recent_timestamp"]["value"]
                    latest_scan_id = scan_id_aggr["key"]
            scan_ids.append(latest_scan_id)
    return scan_ids


def get_latest_secret_scan_id():
    # Deprecated: use utils.helper.get_recent_scan_ids
    aggs = {
        "node_id": {
            "terms": {
                "field": "node_id.keyword",
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
        SECRET_SCAN_INDEX,
        {},
        aggs,
        add_masked_filter=False,
    )
    scan_ids = []
    if "aggregations" in aggs_response:
        for image_aggr in aggs_response["aggregations"]["node_id"]["buckets"]:
            latest_scan_id = ""
            latest_scan_time = 0
            for scan_id_aggr in image_aggr["scan_id"]["buckets"]:
                if scan_id_aggr["scan_recent_timestamp"]["value"] > latest_scan_time:
                    latest_scan_time = scan_id_aggr["scan_recent_timestamp"]["value"]
                    latest_scan_id = scan_id_aggr["key"]
            scan_ids.append(latest_scan_id)
    return scan_ids

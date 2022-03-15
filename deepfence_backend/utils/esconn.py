import os
import operator
from collections import OrderedDict
import math
from elasticsearch import helpers
from elasticsearch import Elasticsearch
from elasticsearch.client.indices import IndicesClient

from utils.constants import CVE_SCAN_LOGS_INDEX, ES_TERMS_AGGR_SIZE, \
    TIME_UNIT_MAPPING
from utils.common import (
    sort_expression,
    get_rounding_time_unit,
    calculate_interval_for_show_all_filter
)

EL_HOST = "http://%s:%s" % (os.environ['ELASTICSEARCH_HOST'], os.environ['ELASTICSEARCH_PORT'])
http_auth = None

if 'ELASTICSEARCH_USER' in os.environ:
    http_auth = (os.environ['ELASTICSEARCH_USER'],
                 os.environ['ELASTICSEARCH_PASSWORD'])
if http_auth:
    EL_CLIENT = Elasticsearch([EL_HOST], http_auth=http_auth, timeout=300)
else:
    EL_CLIENT = Elasticsearch([EL_HOST], timeout=300)

IGNORE_METHODS = [
    "del_doc_by_id",
    "create_doc",
    "update_doc_having_id",
    "overwrite_doc_having_id"
]

SITE_SEARCH_VALUES = [
    "severity",
    "host_name",
    "container_name"
]


class GroupByParams:
    def __init__(self, index_name):
        self._indexname = index_name
        self._starttime = None
        self._endtime = None
        self._fieldname = None
        self._aggtype = None
        self._options = None
        self._subfieldname = None
        self._subaggtype = None
        self._suboptions = None
        self._starttime_relative = None
        self._starttimeunit_relative = None
        self._filters = []
        self._not_filters = []
        self._aggs_params = {}

    def addtimerange(self, starttime, endtime):
        self._starttime = starttime
        self._endtime = endtime

    def addrelativetimerange(self, starttime, timeunit):
        self._starttime_relative = starttime
        self._starttimeunit_relative = TIME_UNIT_MAPPING.get(timeunit)

    def addlucenequery(self, lucenestring):
        if lucenestring is not None:
            query = {
                "query_string": {
                    "query": lucenestring
                }
            }
            self._filters.append(query)

    def _update_aggs_params(self, params, newparams):
        updated_params = {**params}
        if not params.get('aggs_params'):
            updated_params['aggs_params'] = newparams
            return updated_params

        updated_sub_params = self._update_aggs_params(params.get('aggs_params'), newparams)
        updated_params['aggs_params'] = updated_sub_params
        return updated_params

    # NOTE: A new introduction over add_agg_field and add_sub_agg_field which were restricted
    # to support only 2 level aggregation.
    # This generic API allow unlimited levels of aggregation.
    # The older APIs too exists alongside to support backward compatibility
    def add_agg_field_generic(self, fieldname, aggtype, aggname, **options):
        new_params = {
            'fieldname': fieldname,
            'aggtype': aggtype,
            'aggname': aggname,
            'options': options,
        }
        if not self._aggs_params:
            self._aggs_params = new_params
        else:
            updated_aggs_param = self._update_aggs_params(self._aggs_params, new_params)
            self._aggs_params = updated_aggs_param

    # NOTE: deprecatred. Use add_agg_field_generic
    def add_agg_field(self, fieldname, aggtype, **options):
        self._fieldname = fieldname
        self._aggtype = aggtype
        self._options = options

    # NOTE: deprecatred. Use add_agg_field_generic
    def add_sub_agg_field(self, fieldname, aggtype, **options):
        self._subfieldname = fieldname
        self._subaggtype = aggtype
        self._suboptions = options

    def add_not_filter(self, querytype, fieldname, value=None):
        not_filter = {}
        if not querytype:
            return self._not_filters

        if not fieldname:
            return self._not_filters

        if querytype == "term":
            not_filter = {
                querytype: {
                    fieldname: value
                }
            }
        elif querytype == "exists":
            not_filter = {
                querytype: {
                    "field": fieldname
                }
            }
        self._not_filters.append(not_filter)

    def add_filter(self, querytype, fieldname, value=None):
        filter = {}
        if not querytype:
            return self._filters

        if not fieldname:
            return self.filters

        if querytype == "term" or querytype == "terms":
            filter = {
                querytype: {
                    fieldname: value
                }
            }
        elif querytype == "exists":
            filter = {
                querytype: {
                    "field": fieldname
                }
            }
        self._filters.append(filter)

    def _build_aggs_query_generic(self, p):
        query = {}
        NON_FIELD_AGGS_TYPES = ["top_hits"]
        if not p.get('aggtype'):
            return query
        if not p.get('fieldname') and p.get('aggtype') not in NON_FIELD_AGGS_TYPES:
            return query

        sub_query = {}
        if p.get('aggs_params'):
            sub_query = self._build_aggs_query_generic(p.get('aggs_params'))

        query = self._build_aggs_query(p.get('aggname'), p.get('fieldname'), p.get('aggtype'), p.get('options'))

        if sub_query:
            query[p.get('aggname')].update({
                "aggs": sub_query
            })

        return query

    def _build_aggs_query(self, aggsname, fieldname, aggs_type, aggs_options):
        query = {}
        field_query = {}
        if fieldname:
            field_query["field"] = fieldname  # Some aggs type like top_hits doesn't have fieldname

        field_query.update(aggs_options or {})
        aggs_type_query = {
            aggs_type: field_query
        }
        query[aggsname] = aggs_type_query
        return query

    def prepare_aggs_query(self, aggs_name, sub_aggs_name=None):
        if self._aggs_params:
            return self._build_aggs_query_generic(self._aggs_params)

        query = {}
        NON_FIELD_AGGS_TYPES = ["top_hits"]
        if not self._aggtype:
            return query
        if not self._fieldname and self._aggtype not in NON_FIELD_AGGS_TYPES:
            return query

        query = self._build_aggs_query(aggs_name, self._fieldname, self._aggtype, self._options)

        if not self._subaggtype:
            return query

        if not self._subfieldname and self._subaggtype not in NON_FIELD_AGGS_TYPES:
            return query

        sub_aggs_query = {
            "aggs": self._build_aggs_query(sub_aggs_name, self._subfieldname,
                                           self._subaggtype, self._suboptions)
        }
        query[aggs_name].update(sub_aggs_query)
        return query

    def prepare_range_query(self, fieldname):
        query = {}
        if not fieldname:
            return query

        query = {
            "range": {
                fieldname: {}
            }
        }

        if self._starttime_relative and self._starttimeunit_relative:
            rounding_time_unit = get_rounding_time_unit(self._starttimeunit_relative)
            query["range"][fieldname]["gt"] = "now-{0}{1}".format(self._starttime_relative,
                                                                  self._starttimeunit_relative)

        if self.starttime:
            query["range"][fieldname]["gt"] = self._starttime

        if self.endtime:
            query["range"][fieldname]["lt"] = self._endtime

        return query

    def prepare_not_filter_query(self):
        return self._not_filters

    def prepare_filter_query(self):
        return self._filters

    @property
    def indexname(self):
        return self._indexname

    @property
    def fieldname(self):
        return self._fieldname

    @property
    def aggtype(self):
        return self._aggtype

    @property
    def options(self):
        return self._options

    @property
    def subfieldname(self):
        return self._subfieldname

    @property
    def subaggtype(self):
        return self._subaggtype

    @property
    def suboptions(self):
        return self._suboptions

    @property
    def starttime(self):
        return self._starttime

    @property
    def endtime(self):
        return self._endtime

    @property
    def filters(self):
        return self._filters

    @property
    def notfilters(self):
        return self._not_filters


class ESConn:
    @staticmethod
    def get_server_info():
        """
        Check if the ES is connected
        """
        return EL_CLIENT.info()

    @staticmethod
    def create_doc(index_name, doc, refresh='false', pipeline=None):
        """
        Create a new document.
        """
        res = EL_CLIENT.index(index=index_name, body=doc, refresh=refresh, pipeline=pipeline)
        return res

    @staticmethod
    def get_doc_by_id(index_name, doc_id):
        res = EL_CLIENT.get(index=index_name, id=doc_id)
        return res

    @staticmethod
    def del_doc_by_id(index_name, doc_type, rec_id, refresh='false'):
        res = EL_CLIENT.delete(index=index_name, doc_type=doc_type, id=rec_id, refresh=refresh)
        return res

    @staticmethod
    def overwrite_doc_having_id(index_name, doc, doc_id):
        """
        This method will overwrite the existing record if exist
        say : existing_record = {"name":"John", "city":"SF","_id":1}
        doc is {"name":"John Lee","county":"US"} and doc_id is 1
        than after the operation record will be
         {"name":"John Lee","county":"US","_id":1}
        If record not exist it will be the doc with doc_id as _id.
        """
        res = EL_CLIENT.index(index=index_name, id=doc_id, body=doc)
        return res

    @staticmethod
    def get_index_aliases(index_name: str):
        return EL_CLIENT.indices.get_alias(index=index_name)

    @staticmethod
    def index_exists(index_name: str):
        return EL_CLIENT.indices.exists(index_name)

    @staticmethod
    def scroll(index, query_body, page_size=10000, debug=False, scroll='1m'):
        import math
        page = EL_CLIENT.search(index=index, scroll=scroll, size=page_size, body=query_body)
        sid = page['_scroll_id']
        scroll_size = page['hits']['total']['value']
        total_pages = math.ceil(scroll_size / page_size)
        page_counter = 0
        if debug:
            print('Total items : {}'.format(scroll_size))
            print('Total pages : {}'.format(math.ceil(scroll_size / page_size)))
        # Start scrolling
        while (scroll_size > 0):
            # Get the number of results that we returned in the last scroll
            scroll_size = len(page['hits']['hits'])
            if scroll_size > 0:
                if debug:
                    print('> Scrolling page {} : {} items'.format(page_counter, scroll_size))
                yield total_pages, page_counter, scroll_size, page
            # get next page
            page = EL_CLIENT.scroll(scroll_id=sid, scroll=scroll)
            page_counter += 1
            # Update the scroll ID
            sid = page['_scroll_id']

    @staticmethod
    def get_data_from_scroll(index_name, query, page_size=10000, max_size=None):
        es_docs = []
        for total_pages, page_counter, page_items, page_data in ESConn.scroll(
                index_name, query, page_size=page_size):
            if page_data and page_data.get("hits", {}).get("hits", []):
                es_docs.extend(page_data["hits"]["hits"])
            if max_size and (page_counter + 1) * page_size > max_size:
                break
        return es_docs

    @staticmethod
    def update_doc_having_id(index_name, doc, doc_id, refresh='false'):
        """
        This method will update the existing record if exist
        say : existing_record = {"name":"John", "city":"SF","_id":1}
        doc is {"name":"John Lee","county":"US"} and doc_id is 1
        than after the operation record will be
         {"name":"John Lee","county":"US","city":"SF","_id":1}
        If record not exist it will be the doc with doc_id as _id.


        """
        result = ESConn.search_by_and_clause(index_name, {"_id": doc_id}, 0)
        if result['total']['value']:
            assert result['total']['value'] == 1
            existing_data = result['hits'][0]['_source']
            existing_data.update(doc)
            res = EL_CLIENT.index(index=index_name, id=doc_id, body=existing_data, refresh=refresh)

        else:
            res = EL_CLIENT.index(index=index_name, id=doc_id, body=doc, refresh=refresh)
        return res

    @staticmethod
    def search_by_and_clause(index_name, filters, start_index=0, sort_order="desc", number=None,
                             time_unit=None, lucene_query_string=None, size=10, _source=None, must_not_filters=None,
                             custom_sort_expression=None, get_only_query=False, sort_by="@timestamp",
                             scripted_sort=None):
        """
        filters = {
            "container_name": ["container1", "container2"],
            "severity": ["critical"]
        }

        The values in the array are OR'ed and keys are AND'ed.
        The above will be equivalent to below lucene query
        (container_name:container1 OR container_name:container2) and (severity:critical)
        """
        and_terms = []
        and_terms_must_not = []

        for key, value in filters.items():
            if type(value) is not list:
                value = [value]
            if value:
                if type(value[0]) in [float, int]:
                    and_terms.append({"terms": {key: value}})
                else:
                    and_terms.append({"terms": {key + ".keyword": value}})
        if not must_not_filters:
            must_not_filters = {}
        for key, value in must_not_filters.items():
            if type(value) is not list:
                value = [value]
            if value:
                and_terms_must_not.append({"terms": {key + ".keyword": value}})

        if number and time_unit and time_unit != 'all':
            rounding_time_unit = get_rounding_time_unit(time_unit)
            and_terms.append({
                "range": {
                    "@timestamp": {
                        "gt": "now-{0}{1}/{2}".format(number, time_unit, rounding_time_unit)
                    }
                }
            })

        if lucene_query_string:
            and_terms.append({
                "bool": {
                    "must": {
                        "query_string": {
                            "query": lucene_query_string
                        }
                    }
                }
            })

        query = {
            "from": start_index,
            "query": {
                "constant_score": {
                    "filter": {
                        "bool": {
                            "must": and_terms,
                            "must_not": and_terms_must_not
                        }
                    }
                }
            },
            "size": size
        }

        if scripted_sort:
            sort = None
            query["sort"] = scripted_sort
        elif custom_sort_expression:
            sort = custom_sort_expression
        else:
            sort = sort_expression(index_name, sort_order, sort_by)
        if get_only_query:
            if scripted_sort:
                return query
            query["sort"] = []
            for sort_item in sort.split(","):
                sort_expr = sort_item.split(":")
                query["sort"].append({sort_expr[0]: {"order": sort_expr[1]}})
            return query
        res = EL_CLIENT.search(index=index_name, body=query, sort=sort, ignore=[400],
                               _source=_source)

        if 'error' in res:
            return {
                'hits': [],
                'total': {'value': 0}
            }
        return res['hits']

    @staticmethod
    def search(index_name, body, start_index, size, _source=None):
        q = {"from": start_index, "size": size}
        body.update(q)
        res = EL_CLIENT.search(index=index_name, body=body, _source=_source)
        return res

    @staticmethod
    def msearch(body):
        res = EL_CLIENT.msearch(body=body)
        return res

    @staticmethod
    def mget(body, _source=None):
        """
        body
        {"docs": [{
              "_index": "logstash-docs", "_type": "cve", "_id": "9bf2a14cbca8da6f0b21cee91014a31d"
        }]}
        """
        return EL_CLIENT.mget(body=body, _source=_source).get("docs", [])

    @staticmethod
    def create_filtered_query(filters, start_index=0, number=None, time_unit=None, lucene_query_string=None, size=0):
        and_terms = []
        for key, value in filters.items():
            if type(value) is not list:
                value = [value]
            if value:
                and_terms.append({"terms": {key + ".keyword": value}})
        if number and time_unit and time_unit != 'all':
            rounding_time_unit = get_rounding_time_unit(time_unit)
            and_terms.append(
                {"range": {"@timestamp": {"gt": "now-{0}{1}/{2}".format(number, time_unit, rounding_time_unit)}}})
        if lucene_query_string:
            and_terms.append({"bool": {"must": {"query_string": {"query": lucene_query_string}}}})
        query = {
            "from": start_index, "query": {"constant_score": {"filter": {"bool": {"must": and_terms}}}}, "size": size}
        return query

    @staticmethod
    def aggr(index_name, field_name, filters=None, number=None,
             time_unit=None, lucene_query_string=None, size=10):
        aggr_name = 'aggr_alias_name'

        and_terms = []

        for key, value in filters.items():
            if type(value) is not list:
                value = [value]
            if value:
                and_terms.append({"terms": {key + ".keyword": value}})

        if number and time_unit and time_unit != 'all':
            rounding_time_unit = get_rounding_time_unit(time_unit)
            and_terms.append({
                "range": {
                    "@timestamp": {
                        "gt": "now-{0}{1}/{2}".format(number, time_unit, rounding_time_unit)
                    }
                }
            })

        if lucene_query_string:
            and_terms.append({
                "query_string": {
                    "query": lucene_query_string
                }
            })

        body = {
            "size": 0,
            "aggs": {
                aggr_name: {
                    "terms": {
                        "field": field_name + ".keyword",
                        "size": size,
                        "order": {
                            "_count": "desc"
                        }
                    }
                }
            }
        }

        if and_terms:
            query = {
                'bool': {
                    'must': and_terms
                }
            }
            body["query"] = query

        res = ESConn.search(index_name, body, 0, 0)

        if res:
            aggr_res = res.get('aggregations')
        else:
            return {}
        if not aggr_res:
            return {}

        buckets = aggr_res[aggr_name]['buckets']
        return {
            "buckets": buckets, "categories": [str(e['key']) for e in buckets],
            "series": [{
                "name": "Distribution",
                "data": [bucket['doc_count'] for bucket in buckets]
            }]
        }

    @staticmethod
    def multi_aggr(index_name, field_names, filters=None, number=None,
                   time_unit=None, lucene_query_string=None, size=10):
        """
        Same as aggr method, but supports multiple field_names. This will send
        a single query to elasticsearch.
        """
        and_terms = []

        for key, value in filters.items():
            if type(value) is not list:
                value = [value]
            if value:
                and_terms.append({"terms": {key + ".keyword": value}})

        if number is not None and time_unit:
            rounding_time_unit = get_rounding_time_unit(time_unit)
            and_terms.append({
                "range": {
                    "@timestamp": {
                        "gt": "now-{0}{1}/{2}".format(number, time_unit, rounding_time_unit)
                    }
                }
            })

        if lucene_query_string:
            and_terms.append({
                "bool": {
                    "must": {
                        "query_string": {
                            "query": lucene_query_string
                        }
                    }
                }
            })

        aggs = {}
        for field_name in field_names:
            aggr_name = field_name

            value = {
                "terms": {
                    "field": field_name + ".keyword",
                    "size": size,
                    "order": {
                        "_count": "desc"
                    }
                }
            }

            aggs[aggr_name] = value

        start_index = 0
        body = {
            "size": start_index,
            "query": {
                "constant_score": {
                    "filter": {
                        "bool": {
                            "must": and_terms
                        }
                    }
                }
            },
            "aggs": aggs
        }

        res = ESConn.search(index_name, body, start_index, size)

        result = {}
        if res:
            aggr_res = res.get('aggregations')
        else:
            return result
        if not aggr_res:
            return result

        for aggregation in res['aggregations']:
            buckets = res['aggregations'][aggregation]['buckets']
            result[aggregation] = {
                "buckets": buckets, "categories": [str(e['key']) for e in buckets],
                "series": [{
                    "name": "Distribution",
                    "data": [bucket['doc_count'] for bucket in buckets]
                }]
            }
        return result

    @staticmethod
    def cardinality(index_name, field_names, filters=None, number=None,
                    time_unit=None, lucene_query_string=None, size=10):
        """
        Get the total number of unique values for a given field_name.
        """
        aggs = {}

        for field_name in field_names:
            aggr_name = field_name
            aggs[aggr_name] = {
                'cardinality': {
                    'field': field_name + ".keyword"
                }
            }

        body = {
            "size": 0,
            "aggs": aggs
        }

        must_objects = []

        if filters:
            for k, v in filters.items():
                must_objects.append({
                    'term': {
                        k + ".keyword": v
                    }
                })

        if number is not None and time_unit:
            rounding_time_unit = get_rounding_time_unit(time_unit)
            must_objects.append({
                "range": {
                    "@timestamp": {
                        "gt": "now-{0}{1}/{2}".format(number, time_unit, rounding_time_unit)
                    }
                }
            })

        if lucene_query_string:
            must_objects.append({
                "query_string": {
                    "query": lucene_query_string
                }
            })

        if must_objects:
            body["query"] = {
                "bool": {
                    "must": must_objects
                }
            }

        start_index = 0
        res = ESConn.search(index_name, body, start_index, size)

        result = {}
        if res:
            aggr_res = res.get('aggregations')
        else:
            return result

        if not aggr_res:
            return result

        for field_name in field_names:
            result[field_name] = aggr_res[field_name]['value']

        return result

    @staticmethod
    def count(index_name, filters, number=None, time_unit=None, lucene_query_string=None, ts_fieldname=None):
        """
        Get the count of the documents matching the field name and value.
        """
        must_objects = list()

        for field_name, field_value in filters.items():
            if type(field_value) is not list:
                field_value = [field_value]
            if field_value:
                has_int = False
                for field_val in field_value:
                    if type(field_val) == int:
                        has_int = True
                        break
                if has_int:
                    must_objects.append({"terms": {field_name: field_value}})
                else:
                    must_objects.append({"terms": {field_name + ".keyword": field_value}})

        if number and time_unit and time_unit != 'all':
            rounding_time_unit = get_rounding_time_unit(time_unit)
            if ts_fieldname:
                must_objects.append({
                    "range": {
                        ts_fieldname: {
                            "gt": "now-{0}{1}/{2}".format(number, time_unit, rounding_time_unit)
                        }
                    }
                })
            else:
                must_objects.append({
                    "range": {
                        "@timestamp": {
                            "gt": "now-{0}{1}/{2}".format(number, time_unit, rounding_time_unit)
                        }
                    }
                })

        if lucene_query_string:
            must_objects.append({
                "query_string": {
                    "query": lucene_query_string
                }
            })

        body = {
            "query": {
                "bool": {
                    "must": must_objects
                }
            }
        }
        res = EL_CLIENT.count(index=index_name, body=body)
        return res['count']

    @staticmethod
    def bulk_unmask_docs(docs_to_be_unmasked):
        """
        docs_to_be_unmasked = {
            "_index": "cve",
            "_id": "logstash-2017.10.30"
        }
        """
        indices = set()

        def generate_unmasked_actions():
            for doc in docs_to_be_unmasked:
                doc_index = doc["_index"]
                doc_id = doc["_id"]

                indices.add(doc_index)

                yield {
                    '_op_type': 'update',
                    '_index': doc_index,
                    '_id': doc_id,
                    'retry_on_conflict': 5,
                    'doc': {"masked": "false"}
                }

        helpers.bulk(
            EL_CLIENT,
            generate_unmasked_actions()
        )

        # refresh index, so that the changes are reflected in search.
        # Note: This action has an impact on the performance.
        EL_CLIENT.indices.refresh(index=list(indices))

    @staticmethod
    def bulk_mask_docs(docs_to_be_masked, comments=''):
        """
        docs_to_be_masked = {
            "_index": "cve",
            "_id": "logstash-2017.10.30"
        }
        """
        indices = set()

        def generate_masked_actions():
            for doc in docs_to_be_masked:
                doc_index = doc["_index"]
                doc_id = doc["_id"]
                source_fields = doc.get('source_fields', {})

                update_fields = {
                    "masked": "true",
                    "mask_comments": comments
                }
                update_fields.update(source_fields)

                indices.add(doc_index)

                yield {
                    '_op_type': 'update',
                    '_index': doc_index,
                    '_id': doc_id,
                    'retry_on_conflict': 5,
                    'doc': update_fields,
                }

        helpers.bulk(
            EL_CLIENT,
            generate_masked_actions()
        )

        # refresh index, so that the changes are reflected in search.
        # Note: This action has an impact on the performance.
        EL_CLIENT.indices.refresh(index=list(indices))

    @staticmethod
    def get_node_wise_cve_status():
        """
        Returns:
        {
          "ramanan-dev-2": {
            "mysql:5.6": {
              "action": "ERROR",
              "timestamp": "2018-06-18T07:04:33.678Z",
              "cve_scan_message": ""
            },
            "deepfenceio/wordpress:latest": {
              "action": "COMPLETED",
              "timestamp": "2018-06-18T06:45:17.478Z",
              "cve_scan_message": ""
            },
            "ramanan-dev-2": {
              "action": "STARTED",
              "timestamp": "2018-06-18T06:50:14.869Z",
              "cve_scan_message": "No feature has been detected on the image. This usually means that the image isn't supported by deepaudit, will do what we can."
            }
          }
        }
        """
        aggs_query = {
            "query": {"bool": {"must": [{"range": {"@timestamp": {"gte": "now-7d"}}}]}},
            "aggs": {
                "host_name": {
                    "terms": {
                        "field": "host_name.keyword", "size": ES_TERMS_AGGR_SIZE
                    },
                    "aggs": {
                        "node_id": {
                            "terms": {
                                "field": "node_id.keyword", "size": ES_TERMS_AGGR_SIZE
                            },
                            "aggs": {
                                "node_type": {
                                    "terms": {
                                        "field": "node_type.keyword", "size": ES_TERMS_AGGR_SIZE
                                    }
                                },
                                "action": {
                                    "terms": {
                                        "field": "action.keyword", "size": ES_TERMS_AGGR_SIZE
                                    },
                                    "aggs": {
                                        "cve_scan_message": {
                                            "terms": {
                                                "field": "cve_scan_message.keyword", "size": ES_TERMS_AGGR_SIZE
                                            }
                                        },
                                        "action_max_timestamp": {
                                            "max": {
                                                "field": "@timestamp"
                                            }
                                        },
                                        "scan_id": {
                                            "terms": {
                                                "field": "scan_id.keyword", "size": ES_TERMS_AGGR_SIZE
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "size": 0
        }
        res = EL_CLIENT.search(index=CVE_SCAN_LOGS_INDEX, body=aggs_query)
        response = {}
        if "aggregations" not in res:
            return response
        for host_aggr in res["aggregations"]["host_name"]["buckets"]:
            response[host_aggr["key"]] = {}
            for node_aggr in host_aggr["node_id"]["buckets"]:
                node_type = ""
                if node_aggr["node_type"]["buckets"]:
                    node_type = node_aggr["node_type"]["buckets"][0]["key"]
                if node_aggr["action"]["buckets"]:
                    recent_action = max(node_aggr["action"]["buckets"],
                                        key=lambda x: x["action_max_timestamp"]["value"])
                    cve_scan_message = ""
                    cve_scan_messages = recent_action["cve_scan_message"]["buckets"]
                    if cve_scan_messages:
                        cve_scan_message = cve_scan_messages[-1]["key"]
                    scan_id = ""
                    scan_id_buckets = recent_action["scan_id"]["buckets"]
                    if scan_id_buckets:
                        scan_id = scan_id_buckets[-1]["key"]
                    response[host_aggr["key"]][node_aggr["key"]] = {
                        "action": recent_action["key"], "timestamp": recent_action["action_max_timestamp"]["value"],
                        "cve_scan_message": cve_scan_message, "scan_id": scan_id, "node_type": node_type}
        return response

    @staticmethod
    def get_node_wise_secret_status():
        """
        Returns:
        {
          "ramanan-dev-2": {
            "mysql:5.6": {
              "scan_status": "ERROR",
              "timestamp": "2018-06-18T07:04:33.678Z",
              "scan_message": ""
            },
            "deepfenceio/wordpress:latest": {
              "action": "COMPLETED",
              "timestamp": "2018-06-18T06:45:17.478Z",
              "scan_message": ""
            },
            "ramanan-dev-2": {
              "action": "STARTED",
              "timestamp": "2018-06-18T06:50:14.869Z",
              "scan_message": "No feature has been detected on the image. This usually means that the image isn't supported by deepaudit, will do what we can."
            }
          }
        }
        """
        aggs_query = {
            "query": {"bool": {"must": [{"range": {"@timestamp": {"gte": "now-7d"}}}]}},
            "aggs": {
                "host_name": {
                    "terms": {
                        "field": "host_name.keyword", "size": ES_TERMS_AGGR_SIZE
                    },
                    "aggs": {
                        "node_id": {
                            "terms": {
                                "field": "node_id.keyword", "size": ES_TERMS_AGGR_SIZE
                            },
                            "aggs": {
                                "node_type": {
                                    "terms": {
                                        "field": "node_type.keyword", "size": ES_TERMS_AGGR_SIZE
                                    }
                                },
                                "action": {
                                    "terms": {
                                        "field": "scan_status.keyword", "size": ES_TERMS_AGGR_SIZE
                                    },
                                    "aggs": {
                                        "scan_message": {
                                            "terms": {
                                                "field": "scan_message.keyword", "size": ES_TERMS_AGGR_SIZE
                                            }
                                        },
                                        "action_max_timestamp": {
                                            "max": {
                                                "field": "@timestamp"
                                            }
                                        },
                                        "scan_id": {
                                            "terms": {
                                                "field": "scan_id.keyword", "size": ES_TERMS_AGGR_SIZE
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "size": 0
        }
        res = EL_CLIENT.search(index=CVE_SCAN_LOGS_INDEX, body=aggs_query)
        response = {}
        if "aggregations" not in res:
            return response
        for host_aggr in res["aggregations"]["host_name"]["buckets"]:
            response[host_aggr["key"]] = {}
            for node_aggr in host_aggr["node_id"]["buckets"]:
                node_type = ""
                if node_aggr["node_type"]["buckets"]:
                    node_type = node_aggr["node_type"]["buckets"][0]["key"]
                if node_aggr["action"]["buckets"]:
                    recent_action = max(node_aggr["action"]["buckets"],
                                        key=lambda x: x["action_max_timestamp"]["value"])
                    cve_scan_message = ""
                    cve_scan_messages = recent_action["scan_message"]["buckets"]
                    if cve_scan_messages:
                        cve_scan_message = cve_scan_messages[-1]["key"]
                    scan_id = ""
                    scan_id_buckets = recent_action["scan_id"]["buckets"]
                    if scan_id_buckets:
                        scan_id = scan_id_buckets[-1]["key"]
                    response[host_aggr["key"]][node_aggr["key"]] = {
                        "action": recent_action["key"], "timestamp": recent_action["action_max_timestamp"]["value"],
                        "scan_message": cve_scan_message, "scan_id": scan_id, "node_type": node_type}
        return response

    @staticmethod
    def bulk_query(index_name, bulk_body, refresh="false"):
        """
        Bulk query elasticsearch
        :param index_name:
        :param bulk_body: list of strings []
        :param refresh: false | wait_for | true
        :return:
        """
        return EL_CLIENT.bulk(body=bulk_body, index=index_name, refresh=refresh)

    @staticmethod
    def delete_index(index_name):
        """
        Delete index
        """
        EL_CLIENT.indices.delete(index=index_name, ignore=[400, 404])

    @staticmethod
    def bulk_delete_query(index_name, body, wait_for_completion=False):
        EL_CLIENT.delete_by_query(index=index_name, body=body,
                                  wait_for_completion=wait_for_completion)

    @staticmethod
    def bulk_delete(index_name, filters, number=0, time_unit='all', wait_for_completion=False,
                    must_not_filters=None):
        """
        Bulk delete documents from elasticsearch. This is an async operation by default.

        Note: wait_for_completion=True should never be used, as it might take a lot of time
        for deletion to complete.
        """
        and_terms = []
        and_terms_must_not = []
        for key, value in filters.items():
            if type(value) is not list:
                value = [value]
            if value:
                if type(value[0]) in [float, int]:
                    and_terms.append({"terms": {key: value}})
                else:
                    and_terms.append({"terms": {key + ".keyword": value}})
        if not must_not_filters:
            must_not_filters = {}
        for key, value in must_not_filters.items():
            if type(value) is not list:
                value = [value]
            if value:
                and_terms_must_not.append({"terms": {key + ".keyword": value}})
        if time_unit != 'all':
            rounding_time_unit = get_rounding_time_unit(time_unit)
            and_terms.append({
                "range": {
                    "@timestamp": {
                        "gt": "now-{0}{1}/{2}".format(number, time_unit, rounding_time_unit)
                    }
                }
            })

        body = {
            "query": {
                "bool": {
                    "must": and_terms
                }
            }
        }
        if and_terms_must_not:
            body["query"]["bool"]["must_not"] = and_terms_must_not
        EL_CLIENT.delete_by_query(index=index_name, body=body,
                                  wait_for_completion=wait_for_completion)

    @staticmethod
    def critical_notifications(index_name, field_name, filters, start_date, end_date='now'):
        aggr_name = 'aggr_alias_name'

        must_objects = []
        if filters:
            for k, v in filters.items():
                must_objects.append({
                    'term': {
                        k + ".keyword": v
                    }
                })

        must_objects.append({
            "range": {
                "@timestamp": {
                    "gt": start_date,
                    "lte": end_date,
                    "format": "dd/MM/yyyy HH:mm:ss"
                }
            }
        })

        body = {
            "size": 0,
            "aggs": {
                aggr_name: {
                    "terms": {
                        "field": field_name + ".keyword",
                        "order": {
                            "_count": "desc"
                        }
                    }
                }
            }
        }

        if must_objects:
            query = {
                'bool': {
                    'must': must_objects
                }
            }
            body["query"] = query

        start_index = 0
        res = ESConn.search(index_name, body, start_index, 10)

        if res:
            aggr_res = res.get('aggregations')
        else:
            return {}
        if not aggr_res:
            return {}

        buckets = aggr_res[aggr_name]['buckets']
        severities = {
            "buckets": buckets, "categories": [str(e['key']) for e in buckets],
            "series": [{
                "name": "Distribution",
                "data": [bucket['doc_count'] for bucket in buckets]
            }]
        }

        severities_buckets = severities.get('buckets', [])
        severities = {}

        for bucket in severities_buckets:
            if 'key' in bucket and 'doc_count' in bucket:
                key = bucket['key']
                value = bucket['doc_count']
                severities[key] = value

        return severities

    @staticmethod
    def aggregation_helper(index_name, filters, aggs, number=None, time_unit=None,
                           lucene_query_string=None, add_masked_filter=True, get_only_query=False):
        should_objects = []
        range_query = None
        if number and time_unit and time_unit != 'all':
            rounding_time_unit = get_rounding_time_unit(time_unit)
            range_query = {
                "range": {
                    "@timestamp": {
                        "gt": "now-{0}{1}/{2}".format(number, time_unit, rounding_time_unit)
                    }
                }
            }
        lucene_query = None
        if lucene_query_string:
            lucene_query = {
                "query_string": {
                    "query": lucene_query_string
                }
            }
        and_terms = []
        if add_masked_filter:
            and_terms.append({
                "term": {
                    "masked.keyword": "false"
                }
            })
        if not filters:
            filters = {}
        for key, value in filters.items():
            if type(value) is not list:
                value = [value]
            if value:
                and_terms.append({"terms": {key + ".keyword": value}})
        if range_query:
            and_terms.append(range_query)
        if lucene_query:
            and_terms.append(lucene_query)
        should_objects.append({
            "bool": {
                "must": and_terms
            }
        })
        aggs_query = {
            "query": {
                "constant_score": {
                    "filter": {
                        "bool": {
                            "should": should_objects
                        }
                    }
                }
            },
            "aggs": aggs,
            "size": 0
        }
        if get_only_query:
            return aggs_query
        else:
            return EL_CLIENT.search(index=index_name, body=aggs_query)

    @staticmethod
    def delete_docs(ids, index_name):

        def _get_bulk(_id):
            doc = {
                '_op_type': 'delete',
                "_index": index_name,
                "_id": _id
            }
            return doc

        actions = (_get_bulk(_id) for _id in ids)
        helpers.bulk(
            EL_CLIENT,
            actions)

    # NOTE: the parameters aggs_name and sub_aggs_name is deprecated and is no longer
    # required with the use of add_agg_field_generic API/
    # The parameters still exists to support backward compatibility
    @staticmethod
    def group_by(groupbyparam, aggs_name, sub_aggs_name=None):
        size = 10
        index_name = groupbyparam.indexname

        should_objects = []

        # TODO: move masked filter to the caller. Not all doc types have field named 'masked'
        and_terms = [{
            "term": {
                "masked.keyword": "false"
            }
        }]
        range_query = groupbyparam.prepare_range_query('@timestamp')
        if range_query.get("range", {}).get("@timestamp"):
            and_terms.append(range_query)
        filter_query = groupbyparam.prepare_filter_query()
        if filter_query:
            for filters in filter_query:
                and_terms.append(filters)
        not_filter_query = groupbyparam.prepare_not_filter_query()
        should_object = {"bool": {"must": and_terms}}
        if not_filter_query:
            should_object["bool"]["must_not"] = not_filter_query
        should_objects = [should_object]
        body = {
            "size": 0,
            "aggs": groupbyparam.prepare_aggs_query(aggs_name, sub_aggs_name=sub_aggs_name)
        }
        query = {
            'bool': {
                'should': should_objects
            }
        }
        body["query"] = query
        start_index = 0
        res = ESConn.search(index_name, body, start_index, size)
        if res:
            aggr_res = res.get('aggregations', {})
            aggr_res.update({"_total_doc_count": res.get('hits', {}).get('total', {}).get('value', 0)})
        else:
            return {}
        return aggr_res

    @staticmethod
    def get(**kwargs):
        try:
            doc = EL_CLIENT.get(**kwargs)
        except Exception as e:
            raise e
        return doc

    @staticmethod
    def update(**kwargs):
        try:
            doc = EL_CLIENT.update(**kwargs)
        except Exception as e:
            raise e
        return doc

    @staticmethod
    def update_by_query(**kwargs):
        try:
            resp = EL_CLIENT.update_by_query(**kwargs)
        except Exception as e:
            raise e
        return resp

    @staticmethod
    def index_put_settings(index, body):
        idxClient = IndicesClient(EL_CLIENT)
        response = idxClient.put_settings(index=index, body=body)
        return response

    @staticmethod
    def bulk_update_docs_improved(docs, print_failures=False):

        def query_generator():
            for doc in docs:
                yield {
                    '_op_type': 'update',
                    '_index': doc.get('_index'),
                    '_id': doc.get('_id'),
                    'retry_on_conflict': 5,
                    'doc': doc.get('_source'),
                }

        update_success_count = 0
        for status, info in helpers.parallel_bulk(EL_CLIENT, query_generator(), thread_count=2):
            if status:
                update_success_count += 1
            else:
                if print_failures:
                    print(status, info)

        return update_success_count

    @staticmethod
    def get_mapping(index=None, doc_type=None):
        return EL_CLIENT.indices.get_mapping(index, doc_type)

    @staticmethod
    def health(**kwargs):
        return EL_CLIENT.cluster.health(**kwargs)

#! /bin/bash

set -e

echo "Adding elasticsearch custom configuration"

add_template () {
    template_code=`curl -s -o /dev/null -w "%{http_code}" "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_template/df_template_1?pretty"`
    if [ "$template_code" != "200" ]; then
        curl -XPUT "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_template/df_template_1" -H 'Content-Type: application/json' -d '{
            "index_patterns": ["cve", "cve-scan"],
            "settings": {
                "number_of_shards": 1,
                "index": {
                    "max_result_window": '"${MAX_RESULT_WINDOW}"'
                }
            }
        }'
        echo ""
    fi
}

add_cve_map_pipeline () {
    echo "Adding cve map pipeline"

    cve_map_pipeline_code="$(curl -s -o /dev/null -w '%{http_code}' -XPUT "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_ingest/pipeline/cve_map_pipeline?pretty" -H 'Content-Type: application/json' -d '
    {
      "description" : "cve_map_pipeline",
      "processors" : [
        {
          "set" : {
            "field": "cve_id_cve_severity_cve_container_image",
            "value": "{{cve_id}}|{{cve_severity}}|{{cve_container_image}}"
          }
        }
      ]
    }
    ')"

    echo $cve_map_pipeline_code
    if [ "$cve_map_pipeline_code" != "200" ]; then
        add_cve_map_pipeline
    fi
    echo ""
}

add_cve_scan_map_pipeline () {
    echo "Adding cve scan map pipeline"

    cve_scan_map_pipeline_code="$(curl -s -o /dev/null -w '%{http_code}' -XPUT "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_ingest/pipeline/cve_scan_map_pipeline?pretty" -H 'Content-Type: application/json' -d '
    {
      "description" : "cve_scan_map_pipeline",
      "processors" : []
    }
    ')"

    echo $cve_scan_map_pipeline_code
    if [ "$cve_scan_map_pipeline_code" != "200" ]; then
        add_cve_scan_map_pipeline
    fi
    echo ""
}

add_indexed_default_upsert_script() {
    echo "Adding default_upsert indexed script"

    curl -X POST "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_scripts/default_upsert" -H 'Content-Type: application/json' -d'
    {
      "script": {
        "lang": "painless",
        "source": "if (ctx.op == \"create\") { ctx._source.count = 1;  for (entry in params.event.entrySet()) { ctx._source[entry.getKey()] = entry.getValue(); } } else  { ctx._source.count += 1;  for (entry in params.event.entrySet()) { if (entry.getKey() != \"masked\") { ctx._source[entry.getKey()] = entry.getValue(); } } }"
      }
    }'
    echo ""
}

add_index() {
  echo "Adding deepfence indices"
  curl -X PUT "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/cve" -H 'Content-Type: application/json' -d'
  {
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "cve_description": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "cve_overall_score" : {
          "type" : "float"
        },
        "cve_cvss_score" : {
          "type" : "float"
        },
        "scan_id": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "node_id": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "time_stamp": {
          "type": "long"
        }
      }
    }
  }'
  echo ""
  curl -X PUT "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/cve-scan" -H 'Content-Type: application/json' -d'
  {
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "scan_id": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "node_id": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "time_stamp": {
          "type": "long"
        },
        "cve_scan_message": {
          "type": "text"
        }
      }
    }
  }'
  echo ""

   curl -X PUT "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/sbom-cve-scan" -H 'Content-Type: application/json' -d'
    {
      "mappings": {
        "properties": {
          "@timestamp": {
            "type": "date"
          },
          "artifacts": {
            "enabled": false
          },
          "scan_id": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256
              }
            }
          },
          "node_id": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256
              }
            }
          },
          "time_stamp": {
            "type": "long"
          }
        }
      }
    }'
    echo ""
    curl -X PUT "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/sbom-cve-scan/_settings" -H 'Content-Type: application/json' -d'
      "index.mapping.total_fields.limit": 40000
    }'
    echo ""

  curl -X PUT "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/sbom-artifact" -H 'Content-Type: application/json' -d'
  {
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "name": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "version": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "language": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "licenses": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "locations" : {
          "properties" : {
            "path": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword",
                  "ignore_above": 256
                }
              }
            }
          }
        },
        "scan_id": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "node_id": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "node_type": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "time_stamp": {
          "type": "long"
        }
      }
    }
  }'
  echo ""

  declare -a index_arr=("report")
  for index_name in "${index_arr[@]}"
  do
      curl -X PUT "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/${index_name}" -H 'Content-Type: application/json' -d'
      {
        "mappings": {
          "properties": {
            "@timestamp": {
              "type": "date"
            },
            "dt": {
              "type": "date"
            },
            "date": {
              "type": "date"
            },
            "value" : {
              "type" : "float"
            }
          }
        }
      }'
      echo ""
  done

  declare -a index_arr=("secret-scan" "secret-scan-logs")
  for index_name in "${index_arr[@]}"
  do
      curl -X PUT "http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/${index_name}" -H 'Content-Type: application/json' -d'
      {
        "mappings": {
          "properties": {
            "@timestamp": {
              "type": "date"
            },
            "scan_id": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword",
                  "ignore_above": 256
                }
              }
            },
            "node_id": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword",
                  "ignore_above": 256
                }
              }
            },
            "time_stamp": {
              "type": "long"
            }
          }
        }
      }'
      echo ""
  done
}


reindex_sbom_artifacts_python_script () {
    python /app/code/init_scripts/reindex_sbom_artifacts.py
}

add_template
add_index
add_cve_map_pipeline
add_cve_scan_map_pipeline
add_indexed_default_upsert_script
reindex_sbom_artifacts_python_script
echo ""
echo "custom configuration added successfully"

#! /bin/bash

set -e

echo "Adding elasticsearch custom configuration"

set_es_user_creds() {
  basicAuth=""
    if [ -n "$ELASTICSEARCH_USER" ] && [ -n "$ELASTICSEARCH_PASSWORD" ]; then
      basicAuth="$ELASTICSEARCH_USER:$ELASTICSEARCH_PASSWORD@"
    fi
}

create_index() {
    local index_str="$1"
    if [ -n "$CUSTOMER_UNIQUE_ID" ]; then
        index_str="$index_str-$CUSTOMER_UNIQUE_ID"
    fi
    echo "$index_str"
}

create_index_pattern() {
    local index_pattern_str=$"["
    declare -a index_arr="$1"

    for index in "${!index_arr[@]}"; do
        index_pattern_str+="\"$(create_index "${index_arr[$index]}")\""
        if [ $((index + 1)) != "${#index_arr[@]}" ]; then
            index_pattern_str+=", "
        fi
    done
    index_pattern_str+="]"
    echo "$index_pattern_str"
}

add_template () {
    template_code=`curl -s -o /dev/null -w "%{http_code}" "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_template/df_template_1?pretty"`
    if [ "$template_code" != "200" ]; then
        curl -XPUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_template/df_template_1" -H 'Content-Type: application/json' -d '{
            "index_patterns": '"$(create_index_pattern '("alert" "cve" "cve-scan" "compliance" "compliance-scan-logs" "cloud-compliance-scan-logs" "cloud-compliance-scan" "cloudtrail-alert")')"',
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

    cve_map_pipeline_code="$(curl -s -o /dev/null -w '%{http_code}' -XPUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_ingest/pipeline/cve_map_pipeline?pretty" -H 'Content-Type: application/json' -d '
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

    cve_scan_map_pipeline_code="$(curl -s -o /dev/null -w '%{http_code}' -XPUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_ingest/pipeline/cve_scan_map_pipeline?pretty" -H 'Content-Type: application/json' -d '
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

add_compliance_pipeline () {
    echo "Adding compliance_pipeline"

    compliance_pipeline="$(curl -s -o /dev/null -w '%{http_code}' -XPUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_ingest/pipeline/compliance_pipeline?pretty" -H 'Content-Type: application/json' -d '
    {
      "description" : "compliance_pipeline",
      "processors" : []
    }
    ')"

    echo "$compliance_pipeline"
    if [ "$compliance_pipeline" != "200" ]; then
        add_compliance_pipeline
    fi
    echo ""
}

add_compliance_scan_logs_pipeline () {
    echo "Adding compliance_scan_logs_pipeline"

    compliance_scan_logs_pipeline="$(curl -s -o /dev/null -w '%{http_code}' -XPUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_ingest/pipeline/compliance_scan_logs_pipeline?pretty" -H 'Content-Type: application/json' -d '
    {
      "description" : "compliance_scan_logs_pipeline",
      "processors" : []
    }
    ')"

    echo "$compliance_scan_logs_pipeline"
    if [ "$compliance_scan_logs_pipeline" != "200" ]; then
        add_compliance_scan_logs_pipeline
    fi
    echo ""
}

add_indexed_default_upsert_script() {
    echo "Adding default_upsert indexed script"

    curl -X POST "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_scripts/default_upsert" -H 'Content-Type: application/json' -d'
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
  curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "cve")" -H 'Content-Type: application/json' -d'
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
  curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "cve-scan")" -H 'Content-Type: application/json' -d'
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

   curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "sbom-cve-scan")" -H 'Content-Type: application/json' -d'
    {
      "mappings": {
        "properties": {
          "@timestamp": {
            "type": "date"
          },
          "sbom": {
            "type": "object",
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
    curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "sbom-cve-scan")/_settings" -H 'Content-Type: application/json' -d'
      "index.mapping.total_fields.limit": 40000
    }'
    echo ""

  curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "sbom-artifact")" -H 'Content-Type: application/json' -d'
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
      curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "${index_name}")" -H 'Content-Type: application/json' -d'
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
      curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "${index_name}")" -H 'Content-Type: application/json' -d'
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
            "Severity": {
              "properties": {
                "level": {
                  "type": "text",
                  "fields": {
                    "keyword": {
                      "type": "keyword",
                      "ignore_above": 256
                    }
                  }
                },
                "score": {
                  "type": "float"
                }
              }
            }
          }
        }
      }'
      echo ""
  done

  declare -a index_arr=("malware-scan" "malware-scan-logs")
  for index_name in "${index_arr[@]}"
  do
      curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "${index_name}")" -H 'Content-Type: application/json' -d'
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
            "Severity": {
              "properties": {
                "level": {
                  "type": "text",
                  "fields": {
                    "keyword": {
                      "type": "keyword",
                      "ignore_above": 256
                    }
                  }
                },
                "score": {
                  "type": "float"
                }
              }
            }
          }
        }
      }'
      echo ""
  done

  curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "compliance")" -H 'Content-Type: application/json' -d'
  {
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "test_rationale": {
          "type": "text"
        },
        "test_desc": {
          "type": "text"
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
        "test_number": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 512
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
  curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "cloud-compliance-scan")" -H 'Content-Type: application/json' -d'
  {
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "test_rationale": {
          "type": "text"
        },
        "test_desc": {
          "type": "text"
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
        "test_number": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 512
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
  curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "compliance-scan-logs")" -H 'Content-Type: application/json' -d'
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
        "scan_message": {
          "type": "text"
        }
      }
    }
  }'
  echo ""
  curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "cloud-compliance-scan-logs")" -H 'Content-Type: application/json' -d'
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
        "scan_message": {
          "type": "text"
        }
      }
    }
  }'
  echo ""
  curl -X PUT "${ELASTICSEARCH_SCHEME}://${basicAuth}${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/$(create_index "cloudtrail-alert")" -H 'Content-Type: application/json' -d'
  {
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "eventType": {
          "type": "text"
        },
        "eventCategory": {
          "type": "text"
        },
        "eventID": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "eventSource": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "eventName": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 512
            }
          }
        },
        "awsRegion": {
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
}


reindex_sbom_artifacts_python_script () {
    python /app/code/init_scripts/reindex_sbom_artifacts.py
}

set_es_user_creds
add_template
add_index
add_cve_map_pipeline
add_cve_scan_map_pipeline
add_compliance_pipeline
add_compliance_scan_logs_pipeline
add_indexed_default_upsert_script
reindex_sbom_artifacts_python_script
echo ""
echo "custom configuration added successfully"

---
title: Elasticsearch
---

# Elasticsearch

*Forward Notifications to Elasticsearch*

![Elasticsearch Integration Page](../img/integrations-elasticsearch.png)

### Configuration
1. Enter Elasticsearch endpoint url. (Example: http://10.108.0.2:9200)
2. Enter Elasticsearch index name.
3. Enter Elasticsearch doc type if version is 5.x. If version is 6 and above, enter `_doc` as doc type.
4. If authentication is enabled for the Elasticsearch instance, set the auth header. If username is `demo` and password is `p@55w0rd`, then enter auth header value as `Basic ZGVtbzpwQDU1dzByZA==`. If authentication is not enabled, leave it empty.
5. Choose the resource that has to be sent to Elasticsearch and click Subscribe button to save.

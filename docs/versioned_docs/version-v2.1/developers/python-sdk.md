---
title: How to Use Python Sdk
---

# threatmapper
A client library for accessing Deepfence ThreatMapper

## How to Install

```shell
pip install git+https://github.com/deepfence/threatmapper-python-client.git
```

## Usage
First, create a client:

```python
from threatmapper import Client

client = Client(base_url="YOUR_CONSOLE_URL")
```

If the endpoints you're going to hit require authentication, use `AuthenticatedClient` instead:
### Api Key
After Login Go to Settings -> User Management -> Api key

```python
from threatmapper import AuthenticatedClient

client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="Api Key")
```

By default, when you're calling an HTTPS API it will attempt to verify that SSL is working correctly. Using certificate verification is highly recommended most of the time, but sometimes you may need to authenticate to a server (especially an internal server) using a custom certificate bundle.

```python
from threatmapper import AuthenticatedClient

client = AuthenticatedClient(
    base_url="YOUR_CONSOLE_URL", 
    token="Api Key",
    verify_ssl="/path/to/certificate_bundle.pem",
)
```

You can also disable certificate validation altogether, but beware that **this is a security risk**.

```python

from threatmapper import AuthenticatedClient

client = AuthenticatedClient(
    base_url="YOUR_CONSOLE_URL", 
    token="Api Key", 
    verify_ssl=False
)
```

Things to know:
1. Every path/method combo becomes a Python module with four functions:
    1. `sync`: Blocking request that returns parsed data (if successful) or `None`
    2. `sync_detailed`: Blocking request that always returns a `Request`, optionally with `parsed` set if the request was successful.
    3. `asyncio`: Like `sync` but async instead of blocking
    4. `asyncio_detailed`: Like `sync_detailed` but async instead of blocking

2. All path/query params, and bodies become method arguments.
3. If your endpoint had any tags on it, the first tag will be used as a module name for the function (my_tag above)
4. Any endpoint which did not have a tag will be in `threatmapper.api.default`

## Advanced customizations

There are more settings on the generated `Client` class which let you control more runtime behavior, check out the docstring on that class for more info. You can also customize the underlying `httpx.Client` or `httpx.AsyncClient` (depending on your use-case):

```python
from threatmapper import Client

def log_request(request):
    print(f"Request event hook: {request.method} {request.url} - Waiting for response")

def log_response(response):
    request = response.request
    print(f"Response event hook: {request.method} {request.url} - Status {response.status_code}")

client = Client(
    base_url="YOUR_CONSOLE_URL",
    httpx_args={"event_hooks": {"request": [log_request], "response": [log_response]}},
)

# Or get the underlying httpx client to modify directly with client.get_httpx_client() or client.get_async_httpx_client()
```

You can even set the httpx client directly, but beware that this will override any existing settings (e.g., base_url):

```python
import httpx
from threatmapper import Client

client = Client(
    base_url="YOUR_CONSOLE_URL",
)
# Note that base_url needs to be re-set, as would any shared cookies, headers, etc.
client.set_httpx_client(httpx.Client(base_url="YOUR_CONSOLE_URL", proxies="YOUR_PROXY_URL"))
```

### Get Access & Refresh Token With Regular Client

```python
import json
from threatmapper import Client
from threatmapper.models import ModelApiAuthRequest
from threatmapper.api.authentication import auth_token
from threatmapper.errors import UnexpectedStatus

# Regular Client SSL Disabled
client = Client(base_url="YOUR_CONSOLE_URL", verify_ssl=False)
#OR
# Regular Client SSL Enabled
client = Client(base_url="YOUR_CONSOLE_URL", verify_ssl="/path/to/certificate_bundle.pem")

def get_access_refresh_token_sync():
    try:
        json_body = ModelApiAuthRequest(
            api_token="YOUR_API_KEY"
        )
        #  If we want minified response
        api_response = auth_token.sync(client=client, json_body=json_body)
        print(api_response.access_token, api_response.refresh_token)
        #  If we want detailed response
        api_response = auth_token.sync_detailed(client=client, json_body=json_body)
        if api_response.status_code == 200:
           json_response =  json.loads(api_response.content.decode("utf-8"))
           print(json_response["access_token"], json_response["refresh_token"])
        else:
           raise Exception("")
    except UnexpectedStatus as e:
        print("Exception when calling get_access_refresh_token_sync->: %s\n" % e)
```

Or do the same thing with an async version:

```python
import json
from threatmapper import Client
from threatmapper.models import ModelApiAuthRequest
from threatmapper.api.authentication import auth_token
from threatmapper.errors import UnexpectedStatus


# SSL Disabled
client = Client(base_url="YOUR_CONSOLE_URL", verify_ssl=False)
# OR
# SSL Enabled
client = Client(base_url="YOUR_CONSOLE_URL", verify_ssl="/path/to/certificate_bundle.pem")

async def get_access_refresh_token_async():
    try:
        json_body = ModelApiAuthRequest(
            api_token="YOUR_API_KEY"
        )
        #  If we want minified response
        api_response = await auth_token.asyncio(client=client, json_body=json_body)
        print(api_response.access_token, api_response.refresh_token)
        #  If we want detailed response
        api_response = await auth_token.asyncio_detailed(client=client, json_body=json_body)
        if api_response.status_code == 200:
           json_response = json.loads(api_response.content.decode("utf-8"))
           print(json_response["access_token"], json_response["refresh_token"])
        else:
           raise Exception("")
    except UnexpectedStatus as e:
        print("Exception when calling get_access_refresh_token_async-> %s\n" % e)
```

### Get Token Refresh With Authenticated Client SYNC

```python
import json
from threatmapper import AuthenticatedClient
from threatmapper.api.authentication import auth_token_refresh
from threatmapper.errors import UnexpectedStatus

#  Authenticated Client SSL Disabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN", verify_ssl=False)
# OR
# Authenticated Client SSL Enabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN",
                             verify_ssl="/path/to/certificate_bundle.pem")


def refresh_token_sync():
   try:
      #  If we want minified response
      res = auth_token_refresh.sync(client=client)
      print(res.access_token, res.refresh_token)
      #  If we want Detailed response
      res = auth_token_refresh.sync_detailed(client=client)
      if res.status_code == 200:
         json_response = json.loads(res.content.decode("utf-8"))
         print(json_response["access-token"], json_response["refresh-token"])
      else:
         raise Exception("")
   except UnexpectedStatus as e:
      print("Exception when calling refresh_token_sync-> %s\n" % e)
```

Or do the same thing with an async version:

```python
from threatmapper import AuthenticatedClient
from threatmapper.api.authentication import auth_token_refresh
from threatmapper.errors import UnexpectedStatus
import json

#  Authenticated Client SSL Disabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN", verify_ssl=False)
#OR
# Authenticated Client SSL Enabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN", verify_ssl="/path/to/certificate_bundle.pem")

async def refresh_token_async():
    try:
        #  If we want minified response
        res = await auth_token_refresh.asyncio(client=client)
        print(res.access_token, res.refresh_token)
        #  If we want Detailed response
        res = await auth_token_refresh.asyncio_detailed(client=client)
        if res.status_code == 200:
           json_response = json.loads(res.content.decode("utf-8"))
           print(json_response["access-token"], json_response["refresh-token"])
        else:
            raise Exception("")
    except UnexpectedStatus as e:
        print("Exception when calling refresh_token_async-> %s\n" % e)
```

### Add Gcr Registry

```python
from threatmapper.types import File
from threatmapper.api.registry import add_registry_gcr
from threatmapper.models import FormDataModelRegistryGCRAddReq
from threatmapper import AuthenticatedClient
from threatmapper.errors import UnexpectedStatus

#  Authenticated Client SSL Disabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN", verify_ssl=False)
#OR
# Authenticated Client SSL Enabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN", verify_ssl="/path/to/certificate_bundle.pem")

def add_gcr_registry():
    try:
       name = 'Google Registry'
       registry_url = 'YOUR_REGISTRY_URL'
       service_account_json = File(payload=open('/path/to/json','rb'), mime_type="application/json", file_name="service.json")
       multipart_data=FormDataModelRegistryGCRAddReq(name=name, registry_url=registry_url, service_account_json=service_account_json)
       response = add_registry_gcr.sync(client=client, multipart_data=multipart_data)
       print(response.message)
    except UnexpectedStatus as e:
        print("Exception when calling refresh_token_async-> %s\n" % e)
      
```

### List Hosts

```python
from threatmapper.api.search import search_hosts
from threatmapper.models import SearchSearchNodeReq
from threatmapper import AuthenticatedClient
from threatmapper.errors import UnexpectedStatus

#  Authenticated Client SSL Disabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN", verify_ssl=False)
#OR
# Authenticated Client SSL Enabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN", verify_ssl="/path/to/certificate_bundle.pem")

def list_hosts():
    try:
       payload_dict = {
                       "node_filter": {
                         "filters": {
                           "compare_filter": None,
                           "contains_filter": {
                             "filter_in": {
                               "active": [
                                 True
                               ]
                             }
                           },
                           "match_filter": {
                             "filter_in": None
                           },
                           "not_contains_filter": {
                             "filter_in": {}
                           },
                           "order_filter": {
                             "order_fields": []
                           }
                         },
                         "in_field_filter": None,
                         "window": {
                           "offset": 0,
                           "size": 0
                         }
                       },
                       "window": {
                         "offset": 0,
                         "size": 100
                       }
                     }
       json_body = SearchSearchNodeReq.from_dict(payload_dict)
       hosts = search_hosts.sync(client=client,json_body=json_body)
       agent_host_list = []
       discovered_host_list = []
       for host in hosts:
           # If agent is running inside hosts
           if host.agent_running:
               agent_host_list.append(host.node_id)
           else:
              discovered_host_list.append(host.node_id)
       print(agent_host_list, discovered_host_list)
    except UnexpectedStatus as e:
        print("Exception when calling list_hosts-> %s\n" % e)
      
```
### List Containers ASYNC

```python
from threatmapper.api.search import search_containers
from threatmapper.models import SearchSearchNodeReq
from threatmapper import AuthenticatedClient
from threatmapper.errors import UnexpectedStatus

#  Authenticated Client SSL Disabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN", verify_ssl=False)
#OR
# Authenticated Client SSL Enabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN", verify_ssl="/path/to/certificate_bundle.pem")

async def list_containers():
    try:
       payload_dict = {
                       "node_filter": {
                         "filters": {
                           "compare_filter": None,
                           "contains_filter": {
                             "filter_in": {
                               "active": [
                                 True
                               ]
                             }
                           },
                           "match_filter": {
                             "filter_in": None
                           },
                           "not_contains_filter": {
                             "filter_in": {}
                           },
                           "order_filter": {
                             "order_fields": []
                           }
                         },
                         "in_field_filter": None,
                         "window": {
                           "offset": 0,
                           "size": 0
                         }
                       },
                       "window": {
                         "offset": 0,
                         "size": 100
                       }
                     }
       json_body = SearchSearchNodeReq.from_dict(payload_dict)
       containers = await search_containers.asyncio(client=client,json_body=json_body)
       for container in containers:
          print(container.node_id, container.node_name)
    except UnexpectedStatus as e:
        print("Exception when calling list_containers-> %s\n" % e)
```

### Start Vulnerability Scan ASYNC

```python
from threatmapper.api.vulnerability import start_vulnerability_scan
from threatmapper.api.search import search_hosts
from threatmapper.models import ModelVulnerabilityScanTriggerReq, SearchSearchNodeReq, ModelScanTriggerResp
from threatmapper import AuthenticatedClient
from threatmapper.errors import UnexpectedStatus
from typing import List

#  Authenticated Client SSL Disabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN", verify_ssl=False)
#OR
# Authenticated Client SSL Enabled
client = AuthenticatedClient(base_url="YOUR_CONSOLE_URL", token="YOUR_REFRESH_TOKEN", verify_ssl="/path/to/certificate_bundle.pem")


def node_config() -> List:
    try:
       payload_dict = {
                       "node_filter": {
                         "filters": {
                           "compare_filter": None,
                           "contains_filter": {
                             "filter_in": {
                               "active": [
                                 True
                               ]
                             }
                           },
                           "match_filter": {
                             "filter_in": None
                           },
                           "not_contains_filter": {
                             "filter_in": {}
                           },
                           "order_filter": {
                             "order_fields": []
                           }
                         },
                         "in_field_filter": None,
                         "window": {
                           "offset": 0,
                           "size": 0
                         }
                       },
                       "window": {
                         "offset": 0,
                         "size": 100
                       }
                     }
       json_body = SearchSearchNodeReq.from_dict(payload_dict)
       hosts = search_hosts.sync(client=client,json_body=json_body)
       host_list = []
       for host in hosts:
          host_list.append({"node_id":host.node_id, "node_type": "host"})
       return host_list
    except UnexpectedStatus as e:
        print("Exception when calling node_config-> %s\n" % e)

async def start_vulnerability_scan_on_hosts():
    try:
       node_ids = node_config()
       payload_dict = {
                       "filters": {
                         "cloud_account_scan_filter": {
                           "filter_in": None
                         },
                         "container_scan_filter": {
                           "filter_in": None
                         },
                         "host_scan_filter": {
                           "filter_in": None
                         },
                         "image_scan_filter": {
                           "filter_in": None
                         },
                         "kubernetes_cluster_scan_filter": {
                           "filter_in": None
                         }
                       },
                       "node_ids": node_ids,
                       "scan_config": [
                         {
                           "language": "base"
                         },
                         {
                           "language": "java"
                         },
                         {
                           "language": "javascript"
                         },
                         {
                           "language": "rust"
                         },
                         {
                           "language": "golang"
                         },
                         {
                           "language": "ruby"
                         },
                         {
                           "language": "python"
                         },
                         {
                           "language": "php"
                         },
                         {
                           "language": "dotnet"
                         }
                       ]
                     }
       json_body = ModelVulnerabilityScanTriggerReq.from_dict(payload_dict)
       response: ModelScanTriggerResp = await start_vulnerability_scan.asyncio(client=client,json_body=json_body)
       print(response.scan_ids, response.bulk_scan_id)
    except UnexpectedStatus as e:
        print("Exception when calling start_vulnerability_scan_on_hosts-> %s\n" % e)
```



## Building / publishing this package
This project uses [Poetry](https://python-poetry.org/) to manage dependencies  and packaging.  Here are the basics:
1. Update the metadata in pyproject.toml (e.g. authors, version)
2. If you're using a private repository, configure it with Poetry
    1. `poetry config repositories.<your-repository-name> <url-to-your-repository>`
    2. `poetry config http-basic.<your-repository-name> <username> <password>`
3. Publish the client with `poetry publish --build -r <your-repository-name>` or, if for public PyPI, just `poetry publish --build`

If you want to install this client into another project without publishing it (e.g. for development) then:
1. If that project **is using Poetry**, you can simply do `poetry add <path-to-this-client>` from that project
2. If that project is not using Poetry:
    1. Build a wheel with `poetry build -f wheel`
    2. Install that wheel from the other project `pip install <path-to-wheel>`
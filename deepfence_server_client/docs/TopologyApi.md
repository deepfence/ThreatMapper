# \TopologyApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetContainersTopologyGraph**](TopologyApi.md#GetContainersTopologyGraph) | **Post** /deepfence/graph/topology/containers | Get Containers Topology Graph
[**GetHostsTopologyGraph**](TopologyApi.md#GetHostsTopologyGraph) | **Post** /deepfence/graph/topology/hosts | Get Hosts Topology Graph
[**GetKubernetesTopologyGraph**](TopologyApi.md#GetKubernetesTopologyGraph) | **Post** /deepfence/graph/topology/kubernetes | Get Kubernetes Topology Graph
[**GetPodsTopologyGraph**](TopologyApi.md#GetPodsTopologyGraph) | **Post** /deepfence/graph/topology/pods | Get Pods Topology Graph
[**GetTopologyGraph**](TopologyApi.md#GetTopologyGraph) | **Post** /deepfence/graph/topology/ | Get Topology Graph
[**IngestAgentReport**](TopologyApi.md#IngestAgentReport) | **Post** /deepfence/ingest/report | Ingest Topology Data



## GetContainersTopologyGraph

> ApiDocsGraphResult GetContainersTopologyGraph(ctx).ReportersTopologyFilters(reportersTopologyFilters).Execute()

Get Containers Topology Graph



### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "./openapi"
)

func main() {
    reportersTopologyFilters := *openapiclient.NewReportersTopologyFilters([]string{"CloudFilter_example"}, *openapiclient.NewReportersFieldsFilters(*openapiclient.NewReportersContainsFilter(map[string][]interface{}{"key": []interface{}{nil}})), []string{"HostFilter_example"}, []string{"KubernetesFilter_example"}, []string{"PodFilter_example"}, []string{"RegionFilter_example"}) // ReportersTopologyFilters |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TopologyApi.GetContainersTopologyGraph(context.Background()).ReportersTopologyFilters(reportersTopologyFilters).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TopologyApi.GetContainersTopologyGraph``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetContainersTopologyGraph`: ApiDocsGraphResult
    fmt.Fprintf(os.Stdout, "Response from `TopologyApi.GetContainersTopologyGraph`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetContainersTopologyGraphRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reportersTopologyFilters** | [**ReportersTopologyFilters**](ReportersTopologyFilters.md) |  | 

### Return type

[**ApiDocsGraphResult**](ApiDocsGraphResult.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetHostsTopologyGraph

> ApiDocsGraphResult GetHostsTopologyGraph(ctx).ReportersTopologyFilters(reportersTopologyFilters).Execute()

Get Hosts Topology Graph



### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "./openapi"
)

func main() {
    reportersTopologyFilters := *openapiclient.NewReportersTopologyFilters([]string{"CloudFilter_example"}, *openapiclient.NewReportersFieldsFilters(*openapiclient.NewReportersContainsFilter(map[string][]interface{}{"key": []interface{}{nil}})), []string{"HostFilter_example"}, []string{"KubernetesFilter_example"}, []string{"PodFilter_example"}, []string{"RegionFilter_example"}) // ReportersTopologyFilters |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TopologyApi.GetHostsTopologyGraph(context.Background()).ReportersTopologyFilters(reportersTopologyFilters).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TopologyApi.GetHostsTopologyGraph``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetHostsTopologyGraph`: ApiDocsGraphResult
    fmt.Fprintf(os.Stdout, "Response from `TopologyApi.GetHostsTopologyGraph`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetHostsTopologyGraphRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reportersTopologyFilters** | [**ReportersTopologyFilters**](ReportersTopologyFilters.md) |  | 

### Return type

[**ApiDocsGraphResult**](ApiDocsGraphResult.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetKubernetesTopologyGraph

> ApiDocsGraphResult GetKubernetesTopologyGraph(ctx).ReportersTopologyFilters(reportersTopologyFilters).Execute()

Get Kubernetes Topology Graph



### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "./openapi"
)

func main() {
    reportersTopologyFilters := *openapiclient.NewReportersTopologyFilters([]string{"CloudFilter_example"}, *openapiclient.NewReportersFieldsFilters(*openapiclient.NewReportersContainsFilter(map[string][]interface{}{"key": []interface{}{nil}})), []string{"HostFilter_example"}, []string{"KubernetesFilter_example"}, []string{"PodFilter_example"}, []string{"RegionFilter_example"}) // ReportersTopologyFilters |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TopologyApi.GetKubernetesTopologyGraph(context.Background()).ReportersTopologyFilters(reportersTopologyFilters).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TopologyApi.GetKubernetesTopologyGraph``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetKubernetesTopologyGraph`: ApiDocsGraphResult
    fmt.Fprintf(os.Stdout, "Response from `TopologyApi.GetKubernetesTopologyGraph`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetKubernetesTopologyGraphRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reportersTopologyFilters** | [**ReportersTopologyFilters**](ReportersTopologyFilters.md) |  | 

### Return type

[**ApiDocsGraphResult**](ApiDocsGraphResult.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetPodsTopologyGraph

> ApiDocsGraphResult GetPodsTopologyGraph(ctx).ReportersTopologyFilters(reportersTopologyFilters).Execute()

Get Pods Topology Graph



### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "./openapi"
)

func main() {
    reportersTopologyFilters := *openapiclient.NewReportersTopologyFilters([]string{"CloudFilter_example"}, *openapiclient.NewReportersFieldsFilters(*openapiclient.NewReportersContainsFilter(map[string][]interface{}{"key": []interface{}{nil}})), []string{"HostFilter_example"}, []string{"KubernetesFilter_example"}, []string{"PodFilter_example"}, []string{"RegionFilter_example"}) // ReportersTopologyFilters |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TopologyApi.GetPodsTopologyGraph(context.Background()).ReportersTopologyFilters(reportersTopologyFilters).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TopologyApi.GetPodsTopologyGraph``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetPodsTopologyGraph`: ApiDocsGraphResult
    fmt.Fprintf(os.Stdout, "Response from `TopologyApi.GetPodsTopologyGraph`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetPodsTopologyGraphRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reportersTopologyFilters** | [**ReportersTopologyFilters**](ReportersTopologyFilters.md) |  | 

### Return type

[**ApiDocsGraphResult**](ApiDocsGraphResult.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetTopologyGraph

> ApiDocsGraphResult GetTopologyGraph(ctx).ReportersTopologyFilters(reportersTopologyFilters).Execute()

Get Topology Graph



### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "./openapi"
)

func main() {
    reportersTopologyFilters := *openapiclient.NewReportersTopologyFilters([]string{"CloudFilter_example"}, *openapiclient.NewReportersFieldsFilters(*openapiclient.NewReportersContainsFilter(map[string][]interface{}{"key": []interface{}{nil}})), []string{"HostFilter_example"}, []string{"KubernetesFilter_example"}, []string{"PodFilter_example"}, []string{"RegionFilter_example"}) // ReportersTopologyFilters |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TopologyApi.GetTopologyGraph(context.Background()).ReportersTopologyFilters(reportersTopologyFilters).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TopologyApi.GetTopologyGraph``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetTopologyGraph`: ApiDocsGraphResult
    fmt.Fprintf(os.Stdout, "Response from `TopologyApi.GetTopologyGraph`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetTopologyGraphRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reportersTopologyFilters** | [**ReportersTopologyFilters**](ReportersTopologyFilters.md) |  | 

### Return type

[**ApiDocsGraphResult**](ApiDocsGraphResult.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## IngestAgentReport

> IngestAgentReport(ctx).RequestBody(requestBody).Execute()

Ingest Topology Data



### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "./openapi"
)

func main() {
    requestBody := []int32{int32(123)} // []int32 |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TopologyApi.IngestAgentReport(context.Background()).RequestBody(requestBody).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TopologyApi.IngestAgentReport``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiIngestAgentReportRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **requestBody** | **[]int32** |  | 

### Return type

 (empty response body)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


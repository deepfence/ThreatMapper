# \TopologyApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetTopologyGraph**](TopologyApi.md#GetTopologyGraph) | **Post** /deepfence/graph/topology | Get Topology Graph
[**IngestAgentReport**](TopologyApi.md#IngestAgentReport) | **Post** /deepfence/ingest/report | Ingest Topology Data



## GetTopologyGraph

> ReportersRenderedGraph GetTopologyGraph(ctx).ReportersTopologyFilters(reportersTopologyFilters).Execute()

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
    reportersTopologyFilters := *openapiclient.NewReportersTopologyFilters() // ReportersTopologyFilters |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TopologyApi.GetTopologyGraph(context.Background()).ReportersTopologyFilters(reportersTopologyFilters).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TopologyApi.GetTopologyGraph``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetTopologyGraph`: ReportersRenderedGraph
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

[**ReportersRenderedGraph**](ReportersRenderedGraph.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## IngestAgentReport

> IngestAgentReport(ctx).ModelRawReport(modelRawReport).Execute()

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
    modelRawReport := *openapiclient.NewModelRawReport("Payload_example") // ModelRawReport |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TopologyApi.IngestAgentReport(context.Background()).ModelRawReport(modelRawReport).Execute()
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
 **modelRawReport** | [**ModelRawReport**](ModelRawReport.md) |  | 

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


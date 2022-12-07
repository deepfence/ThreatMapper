# \TopologyApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetTopologyGraph**](TopologyApi.md#GetTopologyGraph) | **Get** /deepfence/graph/topology | Get Topology Graph
[**IngestAgentReport**](TopologyApi.md#IngestAgentReport) | **Post** /deepfence/ingest/report | Ingest Topology Data



## GetTopologyGraph

> ReportersRenderedGraph GetTopologyGraph(ctx).Execute()

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

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TopologyApi.GetTopologyGraph(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TopologyApi.GetTopologyGraph``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetTopologyGraph`: ReportersRenderedGraph
    fmt.Fprintf(os.Stdout, "Response from `TopologyApi.GetTopologyGraph`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetTopologyGraphRequest struct via the builder pattern


### Return type

[**ReportersRenderedGraph**](ReportersRenderedGraph.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## IngestAgentReport

> ControlsAgentControls IngestAgentReport(ctx).Execute()

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

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.TopologyApi.IngestAgentReport(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `TopologyApi.IngestAgentReport``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `IngestAgentReport`: ControlsAgentControls
    fmt.Fprintf(os.Stdout, "Response from `TopologyApi.IngestAgentReport`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiIngestAgentReportRequest struct via the builder pattern


### Return type

[**ControlsAgentControls**](ControlsAgentControls.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


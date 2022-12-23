# \ThreatApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetThreatGraph**](ThreatApi.md#GetThreatGraph) | **Post** /deepfence/graph/threat | Get Threat Graph



## GetThreatGraph

> map[string]ReportersProviderThreatGraph GetThreatGraph(ctx).Execute()

Get Threat Graph



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
    resp, r, err := apiClient.ThreatApi.GetThreatGraph(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ThreatApi.GetThreatGraph``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetThreatGraph`: map[string]ReportersProviderThreatGraph
    fmt.Fprintf(os.Stdout, "Response from `ThreatApi.GetThreatGraph`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetThreatGraphRequest struct via the builder pattern


### Return type

[**map[string]ReportersProviderThreatGraph**](ReportersProviderThreatGraph.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


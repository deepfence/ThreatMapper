# \ControlsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetAgentControls**](ControlsApi.md#GetAgentControls) | **Post** /deepfence/controls/agent | Fetch Agent Actions
[**GetAgentInitControls**](ControlsApi.md#GetAgentInitControls) | **Post** /deepfence/controls/agent-init | Fetch Agent Init Actions



## GetAgentControls

> ControlsAgentControls GetAgentControls(ctx).ModelAgentId(modelAgentId).Execute()

Fetch Agent Actions



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
    modelAgentId := *openapiclient.NewModelAgentId("NodeId_example") // ModelAgentId |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.ControlsApi.GetAgentControls(context.Background()).ModelAgentId(modelAgentId).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ControlsApi.GetAgentControls``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetAgentControls`: ControlsAgentControls
    fmt.Fprintf(os.Stdout, "Response from `ControlsApi.GetAgentControls`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetAgentControlsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelAgentId** | [**ModelAgentId**](ModelAgentId.md) |  | 

### Return type

[**ControlsAgentControls**](ControlsAgentControls.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetAgentInitControls

> ControlsAgentControls GetAgentInitControls(ctx).ModelAgentId(modelAgentId).Execute()

Fetch Agent Init Actions



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
    modelAgentId := *openapiclient.NewModelAgentId("NodeId_example") // ModelAgentId |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.ControlsApi.GetAgentInitControls(context.Background()).ModelAgentId(modelAgentId).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ControlsApi.GetAgentInitControls``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetAgentInitControls`: ControlsAgentControls
    fmt.Fprintf(os.Stdout, "Response from `ControlsApi.GetAgentInitControls`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetAgentInitControlsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelAgentId** | [**ModelAgentId**](ModelAgentId.md) |  | 

### Return type

[**ControlsAgentControls**](ControlsAgentControls.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


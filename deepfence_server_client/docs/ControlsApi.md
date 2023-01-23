# \ControlsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AddAgentVersion**](ControlsApi.md#AddAgentVersion) | **Post** /deepfence/controls/agent-version | Push new agent version
[**GetAgentControls**](ControlsApi.md#GetAgentControls) | **Post** /deepfence/controls/agent | Fetch Agent Actions
[**GetAgentInitControls**](ControlsApi.md#GetAgentInitControls) | **Post** /deepfence/controls/agent-init | Fetch Agent Init Actions
[**GetLatestAgentVersion**](ControlsApi.md#GetLatestAgentVersion) | **Get** /deepfence/controls/get-agent-version | Fetch latest agent version



## AddAgentVersion

> AddAgentVersion(ctx).ModelAgentImageMetadata(modelAgentImageMetadata).Execute()

Push new agent version



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
    modelAgentImageMetadata := *openapiclient.NewModelAgentImageMetadata("ImageName_example", "ImageTag_example", "Version_example") // ModelAgentImageMetadata |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.ControlsApi.AddAgentVersion(context.Background()).ModelAgentImageMetadata(modelAgentImageMetadata).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ControlsApi.AddAgentVersion``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiAddAgentVersionRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelAgentImageMetadata** | [**ModelAgentImageMetadata**](ModelAgentImageMetadata.md) |  | 

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


## GetLatestAgentVersion

> ModelAgentImageMetadata GetLatestAgentVersion(ctx).Execute()

Fetch latest agent version



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
    resp, r, err := apiClient.ControlsApi.GetLatestAgentVersion(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ControlsApi.GetLatestAgentVersion``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetLatestAgentVersion`: ModelAgentImageMetadata
    fmt.Fprintf(os.Stdout, "Response from `ControlsApi.GetLatestAgentVersion`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetLatestAgentVersionRequest struct via the builder pattern


### Return type

[**ModelAgentImageMetadata**](ModelAgentImageMetadata.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


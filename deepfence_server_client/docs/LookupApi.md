# \LookupApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetContainerImages**](LookupApi.md#GetContainerImages) | **Post** /deepfence/lookup/containerimages | Retrieve Container Images data
[**GetContainers**](LookupApi.md#GetContainers) | **Post** /deepfence/lookup/containers | Retrieve Containers data
[**GetHosts**](LookupApi.md#GetHosts) | **Post** /deepfence/lookup/hosts | Retrieve Hosts data
[**GetKubernetesClusters**](LookupApi.md#GetKubernetesClusters) | **Post** /deepfence/lookup/kubernetesclusters | Retrieve K8S data
[**GetPods**](LookupApi.md#GetPods) | **Post** /deepfence/lookup/pods | Retrieve Pods data
[**GetProcesses**](LookupApi.md#GetProcesses) | **Post** /deepfence/lookup/processes | Retrieve Processes data



## GetContainerImages

> []ModelContainerImage GetContainerImages(ctx).ReportersLookupFilter(reportersLookupFilter).Execute()

Retrieve Container Images data



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
    reportersLookupFilter := *openapiclient.NewReportersLookupFilter([]string{"InFieldFilter_example"}, []string{"NodeIds_example"}) // ReportersLookupFilter |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.LookupApi.GetContainerImages(context.Background()).ReportersLookupFilter(reportersLookupFilter).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `LookupApi.GetContainerImages``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetContainerImages`: []ModelContainerImage
    fmt.Fprintf(os.Stdout, "Response from `LookupApi.GetContainerImages`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetContainerImagesRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reportersLookupFilter** | [**ReportersLookupFilter**](ReportersLookupFilter.md) |  | 

### Return type

[**[]ModelContainerImage**](ModelContainerImage.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetContainers

> []ModelContainer GetContainers(ctx).ReportersLookupFilter(reportersLookupFilter).Execute()

Retrieve Containers data



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
    reportersLookupFilter := *openapiclient.NewReportersLookupFilter([]string{"InFieldFilter_example"}, []string{"NodeIds_example"}) // ReportersLookupFilter |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.LookupApi.GetContainers(context.Background()).ReportersLookupFilter(reportersLookupFilter).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `LookupApi.GetContainers``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetContainers`: []ModelContainer
    fmt.Fprintf(os.Stdout, "Response from `LookupApi.GetContainers`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetContainersRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reportersLookupFilter** | [**ReportersLookupFilter**](ReportersLookupFilter.md) |  | 

### Return type

[**[]ModelContainer**](ModelContainer.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetHosts

> []ModelHost GetHosts(ctx).ReportersLookupFilter(reportersLookupFilter).Execute()

Retrieve Hosts data



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
    reportersLookupFilter := *openapiclient.NewReportersLookupFilter([]string{"InFieldFilter_example"}, []string{"NodeIds_example"}) // ReportersLookupFilter |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.LookupApi.GetHosts(context.Background()).ReportersLookupFilter(reportersLookupFilter).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `LookupApi.GetHosts``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetHosts`: []ModelHost
    fmt.Fprintf(os.Stdout, "Response from `LookupApi.GetHosts`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetHostsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reportersLookupFilter** | [**ReportersLookupFilter**](ReportersLookupFilter.md) |  | 

### Return type

[**[]ModelHost**](ModelHost.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetKubernetesClusters

> []ModelKubernetesCluster GetKubernetesClusters(ctx).ReportersLookupFilter(reportersLookupFilter).Execute()

Retrieve K8S data



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
    reportersLookupFilter := *openapiclient.NewReportersLookupFilter([]string{"InFieldFilter_example"}, []string{"NodeIds_example"}) // ReportersLookupFilter |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.LookupApi.GetKubernetesClusters(context.Background()).ReportersLookupFilter(reportersLookupFilter).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `LookupApi.GetKubernetesClusters``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetKubernetesClusters`: []ModelKubernetesCluster
    fmt.Fprintf(os.Stdout, "Response from `LookupApi.GetKubernetesClusters`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetKubernetesClustersRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reportersLookupFilter** | [**ReportersLookupFilter**](ReportersLookupFilter.md) |  | 

### Return type

[**[]ModelKubernetesCluster**](ModelKubernetesCluster.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetPods

> []ModelPod GetPods(ctx).ReportersLookupFilter(reportersLookupFilter).Execute()

Retrieve Pods data



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
    reportersLookupFilter := *openapiclient.NewReportersLookupFilter([]string{"InFieldFilter_example"}, []string{"NodeIds_example"}) // ReportersLookupFilter |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.LookupApi.GetPods(context.Background()).ReportersLookupFilter(reportersLookupFilter).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `LookupApi.GetPods``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetPods`: []ModelPod
    fmt.Fprintf(os.Stdout, "Response from `LookupApi.GetPods`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetPodsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reportersLookupFilter** | [**ReportersLookupFilter**](ReportersLookupFilter.md) |  | 

### Return type

[**[]ModelPod**](ModelPod.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetProcesses

> []ModelProcess GetProcesses(ctx).ReportersLookupFilter(reportersLookupFilter).Execute()

Retrieve Processes data



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
    reportersLookupFilter := *openapiclient.NewReportersLookupFilter([]string{"InFieldFilter_example"}, []string{"NodeIds_example"}) // ReportersLookupFilter |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.LookupApi.GetProcesses(context.Background()).ReportersLookupFilter(reportersLookupFilter).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `LookupApi.GetProcesses``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetProcesses`: []ModelProcess
    fmt.Fprintf(os.Stdout, "Response from `LookupApi.GetProcesses`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetProcessesRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **reportersLookupFilter** | [**ReportersLookupFilter**](ReportersLookupFilter.md) |  | 

### Return type

[**[]ModelProcess**](ModelProcess.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


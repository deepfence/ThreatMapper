# \ComplianceApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**IngestCompliances**](ComplianceApi.md#IngestCompliances) | **Post** /deepfence/ingest/compliance | Ingest Compliances
[**StartComplianceScan**](ComplianceApi.md#StartComplianceScan) | **Post** /deepfence/scan/start/compliance | Start Compliance Scan
[**StatusComplianceScan**](ComplianceApi.md#StatusComplianceScan) | **Get** /deepfence/scan/status/compliance | Get Compliance Scan Status
[**StopComplianceScan**](ComplianceApi.md#StopComplianceScan) | **Get** /deepfence/scan/stop/compliance | Stop Compliance Scan



## IngestCompliances

> IngestCompliances(ctx).IngestersCompliance(ingestersCompliance).Execute()

Ingest Compliances



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
    ingestersCompliance := []openapiclient.IngestersCompliance{*openapiclient.NewIngestersCompliance()} // []IngestersCompliance |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.ComplianceApi.IngestCompliances(context.Background()).IngestersCompliance(ingestersCompliance).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ComplianceApi.IngestCompliances``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiIngestCompliancesRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **ingestersCompliance** | [**[]IngestersCompliance**](IngestersCompliance.md) |  | 

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


## StartComplianceScan

> ModelScanTriggerResp StartComplianceScan(ctx).ModelScanTrigger(modelScanTrigger).Execute()

Start Compliance Scan



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
    modelScanTrigger := *openapiclient.NewModelScanTrigger("NodeId_example", "ResourceId_example", int32(123)) // ModelScanTrigger |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.ComplianceApi.StartComplianceScan(context.Background()).ModelScanTrigger(modelScanTrigger).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ComplianceApi.StartComplianceScan``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `StartComplianceScan`: ModelScanTriggerResp
    fmt.Fprintf(os.Stdout, "Response from `ComplianceApi.StartComplianceScan`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiStartComplianceScanRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelScanTrigger** | [**ModelScanTrigger**](ModelScanTrigger.md) |  | 

### Return type

[**ModelScanTriggerResp**](ModelScanTriggerResp.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## StatusComplianceScan

> ModelScanStatus StatusComplianceScan(ctx).Execute()

Get Compliance Scan Status



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
    resp, r, err := apiClient.ComplianceApi.StatusComplianceScan(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ComplianceApi.StatusComplianceScan``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `StatusComplianceScan`: ModelScanStatus
    fmt.Fprintf(os.Stdout, "Response from `ComplianceApi.StatusComplianceScan`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiStatusComplianceScanRequest struct via the builder pattern


### Return type

[**ModelScanStatus**](ModelScanStatus.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## StopComplianceScan

> StopComplianceScan(ctx).Execute()

Stop Compliance Scan



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
    resp, r, err := apiClient.ComplianceApi.StopComplianceScan(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ComplianceApi.StopComplianceScan``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiStopComplianceScanRequest struct via the builder pattern


### Return type

 (empty response body)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


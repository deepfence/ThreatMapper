# \ComplianceApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**IngestCompliances**](ComplianceApi.md#IngestCompliances) | **Post** /deepfence/ingest/compliance | Ingest Compliances
[**ListComplianceScan**](ComplianceApi.md#ListComplianceScan) | **Post** /deepfence/scan/list/compliance | Get Compliance Scans List
[**ResultsComplianceScan**](ComplianceApi.md#ResultsComplianceScan) | **Post** /deepfence/scan/results/compliance | Get Compliance Scans Results
[**StartComplianceScan**](ComplianceApi.md#StartComplianceScan) | **Post** /deepfence/scan/start/compliance | Start Compliance Scan
[**StatusComplianceScan**](ComplianceApi.md#StatusComplianceScan) | **Get** /deepfence/scan/status/compliance | Get Compliance Scan Status
[**StopComplianceScan**](ComplianceApi.md#StopComplianceScan) | **Post** /deepfence/scan/stop/compliance | Stop Compliance Scan



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


## ListComplianceScan

> ModelScanListResp ListComplianceScan(ctx).ModelScanListReq(modelScanListReq).Execute()

Get Compliance Scans List



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
    modelScanListReq := *openapiclient.NewModelScanListReq("NodeId_example", "NodeType_example", *openapiclient.NewModelFetchWindow(int32(123), int32(123))) // ModelScanListReq |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.ComplianceApi.ListComplianceScan(context.Background()).ModelScanListReq(modelScanListReq).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ComplianceApi.ListComplianceScan``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `ListComplianceScan`: ModelScanListResp
    fmt.Fprintf(os.Stdout, "Response from `ComplianceApi.ListComplianceScan`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiListComplianceScanRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelScanListReq** | [**ModelScanListReq**](ModelScanListReq.md) |  | 

### Return type

[**ModelScanListResp**](ModelScanListResp.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ResultsComplianceScan

> ModelScanResultsResp ResultsComplianceScan(ctx).ModelScanResultsReq(modelScanResultsReq).Execute()

Get Compliance Scans Results



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
    modelScanResultsReq := *openapiclient.NewModelScanResultsReq("ScanId_example", *openapiclient.NewModelFetchWindow(int32(123), int32(123))) // ModelScanResultsReq |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.ComplianceApi.ResultsComplianceScan(context.Background()).ModelScanResultsReq(modelScanResultsReq).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ComplianceApi.ResultsComplianceScan``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `ResultsComplianceScan`: ModelScanResultsResp
    fmt.Fprintf(os.Stdout, "Response from `ComplianceApi.ResultsComplianceScan`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiResultsComplianceScanRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelScanResultsReq** | [**ModelScanResultsReq**](ModelScanResultsReq.md) |  | 

### Return type

[**ModelScanResultsResp**](ModelScanResultsResp.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## StartComplianceScan

> ModelScanTriggerResp StartComplianceScan(ctx).ModelScanTriggerReq(modelScanTriggerReq).Execute()

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
    modelScanTriggerReq := *openapiclient.NewModelScanTriggerReq("NodeId_example", "NodeType_example") // ModelScanTriggerReq |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.ComplianceApi.StartComplianceScan(context.Background()).ModelScanTriggerReq(modelScanTriggerReq).Execute()
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
 **modelScanTriggerReq** | [**ModelScanTriggerReq**](ModelScanTriggerReq.md) |  | 

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

> ModelScanStatusResp StatusComplianceScan(ctx).ScanId(scanId).Execute()

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
    scanId := "scanId_example" // string | 

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.ComplianceApi.StatusComplianceScan(context.Background()).ScanId(scanId).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ComplianceApi.StatusComplianceScan``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `StatusComplianceScan`: ModelScanStatusResp
    fmt.Fprintf(os.Stdout, "Response from `ComplianceApi.StatusComplianceScan`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiStatusComplianceScanRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **scanId** | **string** |  | 

### Return type

[**ModelScanStatusResp**](ModelScanStatusResp.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## StopComplianceScan

> StopComplianceScan(ctx).ModelScanTriggerReq(modelScanTriggerReq).Execute()

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
    modelScanTriggerReq := *openapiclient.NewModelScanTriggerReq("NodeId_example", "NodeType_example") // ModelScanTriggerReq |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.ComplianceApi.StopComplianceScan(context.Background()).ModelScanTriggerReq(modelScanTriggerReq).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `ComplianceApi.StopComplianceScan``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiStopComplianceScanRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelScanTriggerReq** | [**ModelScanTriggerReq**](ModelScanTriggerReq.md) |  | 

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


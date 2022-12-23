# \SecretScanApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**IngestSecretScanStatus**](SecretScanApi.md#IngestSecretScanStatus) | **Post** /deepfence/ingest/secret-scan-logs | Ingest Secrets Scan Status
[**IngestSecrets**](SecretScanApi.md#IngestSecrets) | **Post** /deepfence/ingest/secrets | Ingest Secrets
[**StartSecretScan**](SecretScanApi.md#StartSecretScan) | **Post** /deepfence/scan/start/secret | Start Secret Scan
[**StatusSecretScan**](SecretScanApi.md#StatusSecretScan) | **Get** /deepfence/scan/status/secret | Get Secret Scan Status
[**StopSecretScan**](SecretScanApi.md#StopSecretScan) | **Post** /deepfence/scan/stop/secret | Stop Secret Scan



## IngestSecretScanStatus

> IngestSecretScanStatus(ctx).IngestersSecretScanStatus(ingestersSecretScanStatus).Execute()

Ingest Secrets Scan Status



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
    ingestersSecretScanStatus := []openapiclient.IngestersSecretScanStatus{*openapiclient.NewIngestersSecretScanStatus()} // []IngestersSecretScanStatus |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.SecretScanApi.IngestSecretScanStatus(context.Background()).IngestersSecretScanStatus(ingestersSecretScanStatus).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `SecretScanApi.IngestSecretScanStatus``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiIngestSecretScanStatusRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **ingestersSecretScanStatus** | [**[]IngestersSecretScanStatus**](IngestersSecretScanStatus.md) |  | 

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


## IngestSecrets

> IngestSecrets(ctx).IngestersSecret(ingestersSecret).Execute()

Ingest Secrets



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
    ingestersSecret := []openapiclient.IngestersSecret{*openapiclient.NewIngestersSecret()} // []IngestersSecret |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.SecretScanApi.IngestSecrets(context.Background()).IngestersSecret(ingestersSecret).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `SecretScanApi.IngestSecrets``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiIngestSecretsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **ingestersSecret** | [**[]IngestersSecret**](IngestersSecret.md) |  | 

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


## StartSecretScan

> ModelScanTriggerResp StartSecretScan(ctx).ModelScanTriggerReq(modelScanTriggerReq).Execute()

Start Secret Scan



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
    modelScanTriggerReq := *openapiclient.NewModelScanTriggerReq("NodeId_example", "ResourceId_example", "ResourceType_example") // ModelScanTriggerReq |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.SecretScanApi.StartSecretScan(context.Background()).ModelScanTriggerReq(modelScanTriggerReq).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `SecretScanApi.StartSecretScan``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `StartSecretScan`: ModelScanTriggerResp
    fmt.Fprintf(os.Stdout, "Response from `SecretScanApi.StartSecretScan`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiStartSecretScanRequest struct via the builder pattern


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


## StatusSecretScan

> ModelScanStatusResp StatusSecretScan(ctx).ScanId(scanId).Execute()

Get Secret Scan Status



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
    resp, r, err := apiClient.SecretScanApi.StatusSecretScan(context.Background()).ScanId(scanId).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `SecretScanApi.StatusSecretScan``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `StatusSecretScan`: ModelScanStatusResp
    fmt.Fprintf(os.Stdout, "Response from `SecretScanApi.StatusSecretScan`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiStatusSecretScanRequest struct via the builder pattern


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


## StopSecretScan

> StopSecretScan(ctx).ModelScanTriggerReq(modelScanTriggerReq).Execute()

Stop Secret Scan



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
    modelScanTriggerReq := *openapiclient.NewModelScanTriggerReq("NodeId_example", "ResourceId_example", "ResourceType_example") // ModelScanTriggerReq |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.SecretScanApi.StopSecretScan(context.Background()).ModelScanTriggerReq(modelScanTriggerReq).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `SecretScanApi.StopSecretScan``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiStopSecretScanRequest struct via the builder pattern


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


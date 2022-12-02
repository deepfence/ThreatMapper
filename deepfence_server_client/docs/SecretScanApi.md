# \SecretScanApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**IngestSecrets**](SecretScanApi.md#IngestSecrets) | **Post** /deepfence/ingest/secrets | Ingest Secrets
[**StartSecretScan**](SecretScanApi.md#StartSecretScan) | **Get** /deepfence/scan/start/secrets | Start Secret Scan



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

> StartSecretScan(ctx).Execute()

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

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.SecretScanApi.StartSecretScan(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `SecretScanApi.StartSecretScan``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiStartSecretScanRequest struct via the builder pattern


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


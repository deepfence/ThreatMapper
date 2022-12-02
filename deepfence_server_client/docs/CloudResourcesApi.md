# \CloudResourcesApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**IngestCloudResources**](CloudResourcesApi.md#IngestCloudResources) | **Post** /deepfence/ingest/cloud-resources | Ingest Cloud resources



## IngestCloudResources

> IngestCloudResources(ctx).IngestersCloudResource(ingestersCloudResource).Execute()

Ingest Cloud resources



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
    ingestersCloudResource := []openapiclient.IngestersCloudResource{*openapiclient.NewIngestersCloudResource()} // []IngestersCloudResource |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.CloudResourcesApi.IngestCloudResources(context.Background()).IngestersCloudResource(ingestersCloudResource).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `CloudResourcesApi.IngestCloudResources``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiIngestCloudResourcesRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **ingestersCloudResource** | [**[]IngestersCloudResource**](IngestersCloudResource.md) |  | 

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


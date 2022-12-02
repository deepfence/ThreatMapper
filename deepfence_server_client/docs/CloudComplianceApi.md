# \CloudComplianceApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**IngestCloudCompliances**](CloudComplianceApi.md#IngestCloudCompliances) | **Post** /deepfence/ingest/cloud-compliance | Ingest Cloud Compliances



## IngestCloudCompliances

> IngestCloudCompliances(ctx).IngestersCloudComplianceDoc(ingestersCloudComplianceDoc).Execute()

Ingest Cloud Compliances



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
    ingestersCloudComplianceDoc := []openapiclient.IngestersCloudComplianceDoc{*openapiclient.NewIngestersCloudComplianceDoc()} // []IngestersCloudComplianceDoc |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.CloudComplianceApi.IngestCloudCompliances(context.Background()).IngestersCloudComplianceDoc(ingestersCloudComplianceDoc).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `CloudComplianceApi.IngestCloudCompliances``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiIngestCloudCompliancesRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **ingestersCloudComplianceDoc** | [**[]IngestersCloudComplianceDoc**](IngestersCloudComplianceDoc.md) |  | 

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


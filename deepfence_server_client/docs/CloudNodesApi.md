# \CloudNodesApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**ListCloudNodeAccount**](CloudNodesApi.md#ListCloudNodeAccount) | **Post** /deepfence/cloud-node/accounts/list | List Cloud Node Accounts
[**RegisterCloudNodeAccount**](CloudNodesApi.md#RegisterCloudNodeAccount) | **Post** /deepfence/cloud-node/account | Register Cloud Node Account



## ListCloudNodeAccount

> ModelCloudNodeAccountsListResp ListCloudNodeAccount(ctx).ModelCloudNodeAccountsListReq(modelCloudNodeAccountsListReq).Execute()

List Cloud Node Accounts



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
    modelCloudNodeAccountsListReq := *openapiclient.NewModelCloudNodeAccountsListReq(*openapiclient.NewModelFetchWindow(int32(123), int32(123))) // ModelCloudNodeAccountsListReq |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.CloudNodesApi.ListCloudNodeAccount(context.Background()).ModelCloudNodeAccountsListReq(modelCloudNodeAccountsListReq).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `CloudNodesApi.ListCloudNodeAccount``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `ListCloudNodeAccount`: ModelCloudNodeAccountsListResp
    fmt.Fprintf(os.Stdout, "Response from `CloudNodesApi.ListCloudNodeAccount`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiListCloudNodeAccountRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelCloudNodeAccountsListReq** | [**ModelCloudNodeAccountsListReq**](ModelCloudNodeAccountsListReq.md) |  | 

### Return type

[**ModelCloudNodeAccountsListResp**](ModelCloudNodeAccountsListResp.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## RegisterCloudNodeAccount

> ModelCloudNodeAccountRegisterResp RegisterCloudNodeAccount(ctx).ModelCloudNodeAccountRegisterReq(modelCloudNodeAccountRegisterReq).Execute()

Register Cloud Node Account



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
    modelCloudNodeAccountRegisterReq := *openapiclient.NewModelCloudNodeAccountRegisterReq("CloudAccount_example", "CloudProvider_example", "NodeId_example") // ModelCloudNodeAccountRegisterReq |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.CloudNodesApi.RegisterCloudNodeAccount(context.Background()).ModelCloudNodeAccountRegisterReq(modelCloudNodeAccountRegisterReq).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `CloudNodesApi.RegisterCloudNodeAccount``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `RegisterCloudNodeAccount`: ModelCloudNodeAccountRegisterResp
    fmt.Fprintf(os.Stdout, "Response from `CloudNodesApi.RegisterCloudNodeAccount`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiRegisterCloudNodeAccountRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelCloudNodeAccountRegisterReq** | [**ModelCloudNodeAccountRegisterReq**](ModelCloudNodeAccountRegisterReq.md) |  | 

### Return type

[**ModelCloudNodeAccountRegisterResp**](ModelCloudNodeAccountRegisterResp.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


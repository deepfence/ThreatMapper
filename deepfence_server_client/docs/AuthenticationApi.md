# \AuthenticationApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**RegisterUser**](AuthenticationApi.md#RegisterUser) | **Post** /deepfence/user/register | Register User



## RegisterUser

> ModelResponseAccessToken RegisterUser(ctx).ModelUser(modelUser).Execute()

Register User



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
    modelUser := *openapiclient.NewModelUser() // ModelUser |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.AuthenticationApi.RegisterUser(context.Background()).ModelUser(modelUser).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AuthenticationApi.RegisterUser``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `RegisterUser`: ModelResponseAccessToken
    fmt.Fprintf(os.Stdout, "Response from `AuthenticationApi.RegisterUser`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiRegisterUserRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelUser** | [**ModelUser**](ModelUser.md) |  | 

### Return type

[**ModelResponseAccessToken**](ModelResponseAccessToken.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


# \DiagnosisApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AgentDiagnosticLogs**](DiagnosisApi.md#AgentDiagnosticLogs) | **Get** /deepfence/diagnosis/agent-logs | Agent Diagnostic Logs
[**ConsoleDiagnosticLogs**](DiagnosisApi.md#ConsoleDiagnosticLogs) | **Get** /deepfence/diagnosis/console-logs | Console Diagnostic Logs
[**DiagnosticNotification**](DiagnosisApi.md#DiagnosticNotification) | **Get** /deepfence/diagnosis/notification | Get Diagnostic Notification
[**GenerateAgentDiagnosticLogs**](DiagnosisApi.md#GenerateAgentDiagnosticLogs) | **Post** /deepfence/diagnosis/agent-logs | Generate Agent Diagnostic Logs
[**GenerateConsoleDiagnosticLogs**](DiagnosisApi.md#GenerateConsoleDiagnosticLogs) | **Post** /deepfence/diagnosis/console-logs | Generate Console Diagnostic Logs



## AgentDiagnosticLogs

> string AgentDiagnosticLogs(ctx).Execute()

Agent Diagnostic Logs



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
    resp, r, err := apiClient.DiagnosisApi.AgentDiagnosticLogs(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DiagnosisApi.AgentDiagnosticLogs``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `AgentDiagnosticLogs`: string
    fmt.Fprintf(os.Stdout, "Response from `DiagnosisApi.AgentDiagnosticLogs`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiAgentDiagnosticLogsRequest struct via the builder pattern


### Return type

**string**

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/tgz, application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ConsoleDiagnosticLogs

> string ConsoleDiagnosticLogs(ctx).Execute()

Console Diagnostic Logs



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
    resp, r, err := apiClient.DiagnosisApi.ConsoleDiagnosticLogs(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DiagnosisApi.ConsoleDiagnosticLogs``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `ConsoleDiagnosticLogs`: string
    fmt.Fprintf(os.Stdout, "Response from `DiagnosisApi.ConsoleDiagnosticLogs`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiConsoleDiagnosticLogsRequest struct via the builder pattern


### Return type

**string**

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/tgz, application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## DiagnosticNotification

> ModelResponse DiagnosticNotification(ctx).Execute()

Get Diagnostic Notification



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
    resp, r, err := apiClient.DiagnosisApi.DiagnosticNotification(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DiagnosisApi.DiagnosticNotification``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `DiagnosticNotification`: ModelResponse
    fmt.Fprintf(os.Stdout, "Response from `DiagnosisApi.DiagnosticNotification`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiDiagnosticNotificationRequest struct via the builder pattern


### Return type

[**ModelResponse**](ModelResponse.md)

### Authorization

[bearer_token](../README.md#bearer_token)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GenerateAgentDiagnosticLogs

> GenerateAgentDiagnosticLogs(ctx).Execute()

Generate Agent Diagnostic Logs



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
    resp, r, err := apiClient.DiagnosisApi.GenerateAgentDiagnosticLogs(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DiagnosisApi.GenerateAgentDiagnosticLogs``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGenerateAgentDiagnosticLogsRequest struct via the builder pattern


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


## GenerateConsoleDiagnosticLogs

> GenerateConsoleDiagnosticLogs(ctx).Execute()

Generate Console Diagnostic Logs



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
    resp, r, err := apiClient.DiagnosisApi.GenerateConsoleDiagnosticLogs(context.Background()).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DiagnosisApi.GenerateConsoleDiagnosticLogs``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGenerateConsoleDiagnosticLogsRequest struct via the builder pattern


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


# ModelCloudNodeAccountsListReq

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CloudProvider** | Pointer to **string** |  | [optional] 
**Window** | [**ModelFetchWindow**](ModelFetchWindow.md) |  | 

## Methods

### NewModelCloudNodeAccountsListReq

`func NewModelCloudNodeAccountsListReq(window ModelFetchWindow, ) *ModelCloudNodeAccountsListReq`

NewModelCloudNodeAccountsListReq instantiates a new ModelCloudNodeAccountsListReq object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelCloudNodeAccountsListReqWithDefaults

`func NewModelCloudNodeAccountsListReqWithDefaults() *ModelCloudNodeAccountsListReq`

NewModelCloudNodeAccountsListReqWithDefaults instantiates a new ModelCloudNodeAccountsListReq object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCloudProvider

`func (o *ModelCloudNodeAccountsListReq) GetCloudProvider() string`

GetCloudProvider returns the CloudProvider field if non-nil, zero value otherwise.

### GetCloudProviderOk

`func (o *ModelCloudNodeAccountsListReq) GetCloudProviderOk() (*string, bool)`

GetCloudProviderOk returns a tuple with the CloudProvider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCloudProvider

`func (o *ModelCloudNodeAccountsListReq) SetCloudProvider(v string)`

SetCloudProvider sets CloudProvider field to given value.

### HasCloudProvider

`func (o *ModelCloudNodeAccountsListReq) HasCloudProvider() bool`

HasCloudProvider returns a boolean if a field has been set.

### GetWindow

`func (o *ModelCloudNodeAccountsListReq) GetWindow() ModelFetchWindow`

GetWindow returns the Window field if non-nil, zero value otherwise.

### GetWindowOk

`func (o *ModelCloudNodeAccountsListReq) GetWindowOk() (*ModelFetchWindow, bool)`

GetWindowOk returns a tuple with the Window field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWindow

`func (o *ModelCloudNodeAccountsListReq) SetWindow(v ModelFetchWindow)`

SetWindow sets Window field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



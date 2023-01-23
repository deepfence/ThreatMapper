# ModelCloudNodeAccountsListResp

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CloudNodeAccountsInfo** | [**[]ModelCloudNodeAccountInfo**](ModelCloudNodeAccountInfo.md) |  | 
**Total** | **int32** |  | 

## Methods

### NewModelCloudNodeAccountsListResp

`func NewModelCloudNodeAccountsListResp(cloudNodeAccountsInfo []ModelCloudNodeAccountInfo, total int32, ) *ModelCloudNodeAccountsListResp`

NewModelCloudNodeAccountsListResp instantiates a new ModelCloudNodeAccountsListResp object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelCloudNodeAccountsListRespWithDefaults

`func NewModelCloudNodeAccountsListRespWithDefaults() *ModelCloudNodeAccountsListResp`

NewModelCloudNodeAccountsListRespWithDefaults instantiates a new ModelCloudNodeAccountsListResp object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCloudNodeAccountsInfo

`func (o *ModelCloudNodeAccountsListResp) GetCloudNodeAccountsInfo() []ModelCloudNodeAccountInfo`

GetCloudNodeAccountsInfo returns the CloudNodeAccountsInfo field if non-nil, zero value otherwise.

### GetCloudNodeAccountsInfoOk

`func (o *ModelCloudNodeAccountsListResp) GetCloudNodeAccountsInfoOk() (*[]ModelCloudNodeAccountInfo, bool)`

GetCloudNodeAccountsInfoOk returns a tuple with the CloudNodeAccountsInfo field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCloudNodeAccountsInfo

`func (o *ModelCloudNodeAccountsListResp) SetCloudNodeAccountsInfo(v []ModelCloudNodeAccountInfo)`

SetCloudNodeAccountsInfo sets CloudNodeAccountsInfo field to given value.


### SetCloudNodeAccountsInfoNil

`func (o *ModelCloudNodeAccountsListResp) SetCloudNodeAccountsInfoNil(b bool)`

 SetCloudNodeAccountsInfoNil sets the value for CloudNodeAccountsInfo to be an explicit nil

### UnsetCloudNodeAccountsInfo
`func (o *ModelCloudNodeAccountsListResp) UnsetCloudNodeAccountsInfo()`

UnsetCloudNodeAccountsInfo ensures that no value is present for CloudNodeAccountsInfo, not even an explicit nil
### GetTotal

`func (o *ModelCloudNodeAccountsListResp) GetTotal() int32`

GetTotal returns the Total field if non-nil, zero value otherwise.

### GetTotalOk

`func (o *ModelCloudNodeAccountsListResp) GetTotalOk() (*int32, bool)`

GetTotalOk returns a tuple with the Total field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTotal

`func (o *ModelCloudNodeAccountsListResp) SetTotal(v int32)`

SetTotal sets Total field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



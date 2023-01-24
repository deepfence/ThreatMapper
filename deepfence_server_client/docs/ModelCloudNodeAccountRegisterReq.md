# ModelCloudNodeAccountRegisterReq

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CloudAccount** | **string** |  | 
**CloudProvider** | **string** |  | 
**MonitoredAccountIds** | Pointer to **map[string]string** |  | [optional] 
**NodeId** | **string** |  | 
**OrgAccId** | Pointer to **string** |  | [optional] 

## Methods

### NewModelCloudNodeAccountRegisterReq

`func NewModelCloudNodeAccountRegisterReq(cloudAccount string, cloudProvider string, nodeId string, ) *ModelCloudNodeAccountRegisterReq`

NewModelCloudNodeAccountRegisterReq instantiates a new ModelCloudNodeAccountRegisterReq object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelCloudNodeAccountRegisterReqWithDefaults

`func NewModelCloudNodeAccountRegisterReqWithDefaults() *ModelCloudNodeAccountRegisterReq`

NewModelCloudNodeAccountRegisterReqWithDefaults instantiates a new ModelCloudNodeAccountRegisterReq object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCloudAccount

`func (o *ModelCloudNodeAccountRegisterReq) GetCloudAccount() string`

GetCloudAccount returns the CloudAccount field if non-nil, zero value otherwise.

### GetCloudAccountOk

`func (o *ModelCloudNodeAccountRegisterReq) GetCloudAccountOk() (*string, bool)`

GetCloudAccountOk returns a tuple with the CloudAccount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCloudAccount

`func (o *ModelCloudNodeAccountRegisterReq) SetCloudAccount(v string)`

SetCloudAccount sets CloudAccount field to given value.


### GetCloudProvider

`func (o *ModelCloudNodeAccountRegisterReq) GetCloudProvider() string`

GetCloudProvider returns the CloudProvider field if non-nil, zero value otherwise.

### GetCloudProviderOk

`func (o *ModelCloudNodeAccountRegisterReq) GetCloudProviderOk() (*string, bool)`

GetCloudProviderOk returns a tuple with the CloudProvider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCloudProvider

`func (o *ModelCloudNodeAccountRegisterReq) SetCloudProvider(v string)`

SetCloudProvider sets CloudProvider field to given value.


### GetMonitoredAccountIds

`func (o *ModelCloudNodeAccountRegisterReq) GetMonitoredAccountIds() map[string]string`

GetMonitoredAccountIds returns the MonitoredAccountIds field if non-nil, zero value otherwise.

### GetMonitoredAccountIdsOk

`func (o *ModelCloudNodeAccountRegisterReq) GetMonitoredAccountIdsOk() (*map[string]string, bool)`

GetMonitoredAccountIdsOk returns a tuple with the MonitoredAccountIds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMonitoredAccountIds

`func (o *ModelCloudNodeAccountRegisterReq) SetMonitoredAccountIds(v map[string]string)`

SetMonitoredAccountIds sets MonitoredAccountIds field to given value.

### HasMonitoredAccountIds

`func (o *ModelCloudNodeAccountRegisterReq) HasMonitoredAccountIds() bool`

HasMonitoredAccountIds returns a boolean if a field has been set.

### SetMonitoredAccountIdsNil

`func (o *ModelCloudNodeAccountRegisterReq) SetMonitoredAccountIdsNil(b bool)`

 SetMonitoredAccountIdsNil sets the value for MonitoredAccountIds to be an explicit nil

### UnsetMonitoredAccountIds
`func (o *ModelCloudNodeAccountRegisterReq) UnsetMonitoredAccountIds()`

UnsetMonitoredAccountIds ensures that no value is present for MonitoredAccountIds, not even an explicit nil
### GetNodeId

`func (o *ModelCloudNodeAccountRegisterReq) GetNodeId() string`

GetNodeId returns the NodeId field if non-nil, zero value otherwise.

### GetNodeIdOk

`func (o *ModelCloudNodeAccountRegisterReq) GetNodeIdOk() (*string, bool)`

GetNodeIdOk returns a tuple with the NodeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeId

`func (o *ModelCloudNodeAccountRegisterReq) SetNodeId(v string)`

SetNodeId sets NodeId field to given value.


### GetOrgAccId

`func (o *ModelCloudNodeAccountRegisterReq) GetOrgAccId() string`

GetOrgAccId returns the OrgAccId field if non-nil, zero value otherwise.

### GetOrgAccIdOk

`func (o *ModelCloudNodeAccountRegisterReq) GetOrgAccIdOk() (*string, bool)`

GetOrgAccIdOk returns a tuple with the OrgAccId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOrgAccId

`func (o *ModelCloudNodeAccountRegisterReq) SetOrgAccId(v string)`

SetOrgAccId sets OrgAccId field to given value.

### HasOrgAccId

`func (o *ModelCloudNodeAccountRegisterReq) HasOrgAccId() bool`

HasOrgAccId returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



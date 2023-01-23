# ModelCloudNodeAccountRegisterRespData

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CloudtrailTrails** | Pointer to [**[]ModelCloudNodeCloudtrailTrail**](ModelCloudNodeCloudtrailTrail.md) |  | [optional] 
**Refresh** | Pointer to **string** |  | [optional] 
**Scans** | Pointer to [**map[string]ModelCloudComplianceScanDetails**](ModelCloudComplianceScanDetails.md) |  | [optional] 

## Methods

### NewModelCloudNodeAccountRegisterRespData

`func NewModelCloudNodeAccountRegisterRespData() *ModelCloudNodeAccountRegisterRespData`

NewModelCloudNodeAccountRegisterRespData instantiates a new ModelCloudNodeAccountRegisterRespData object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelCloudNodeAccountRegisterRespDataWithDefaults

`func NewModelCloudNodeAccountRegisterRespDataWithDefaults() *ModelCloudNodeAccountRegisterRespData`

NewModelCloudNodeAccountRegisterRespDataWithDefaults instantiates a new ModelCloudNodeAccountRegisterRespData object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCloudtrailTrails

`func (o *ModelCloudNodeAccountRegisterRespData) GetCloudtrailTrails() []ModelCloudNodeCloudtrailTrail`

GetCloudtrailTrails returns the CloudtrailTrails field if non-nil, zero value otherwise.

### GetCloudtrailTrailsOk

`func (o *ModelCloudNodeAccountRegisterRespData) GetCloudtrailTrailsOk() (*[]ModelCloudNodeCloudtrailTrail, bool)`

GetCloudtrailTrailsOk returns a tuple with the CloudtrailTrails field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCloudtrailTrails

`func (o *ModelCloudNodeAccountRegisterRespData) SetCloudtrailTrails(v []ModelCloudNodeCloudtrailTrail)`

SetCloudtrailTrails sets CloudtrailTrails field to given value.

### HasCloudtrailTrails

`func (o *ModelCloudNodeAccountRegisterRespData) HasCloudtrailTrails() bool`

HasCloudtrailTrails returns a boolean if a field has been set.

### SetCloudtrailTrailsNil

`func (o *ModelCloudNodeAccountRegisterRespData) SetCloudtrailTrailsNil(b bool)`

 SetCloudtrailTrailsNil sets the value for CloudtrailTrails to be an explicit nil

### UnsetCloudtrailTrails
`func (o *ModelCloudNodeAccountRegisterRespData) UnsetCloudtrailTrails()`

UnsetCloudtrailTrails ensures that no value is present for CloudtrailTrails, not even an explicit nil
### GetRefresh

`func (o *ModelCloudNodeAccountRegisterRespData) GetRefresh() string`

GetRefresh returns the Refresh field if non-nil, zero value otherwise.

### GetRefreshOk

`func (o *ModelCloudNodeAccountRegisterRespData) GetRefreshOk() (*string, bool)`

GetRefreshOk returns a tuple with the Refresh field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRefresh

`func (o *ModelCloudNodeAccountRegisterRespData) SetRefresh(v string)`

SetRefresh sets Refresh field to given value.

### HasRefresh

`func (o *ModelCloudNodeAccountRegisterRespData) HasRefresh() bool`

HasRefresh returns a boolean if a field has been set.

### GetScans

`func (o *ModelCloudNodeAccountRegisterRespData) GetScans() map[string]ModelCloudComplianceScanDetails`

GetScans returns the Scans field if non-nil, zero value otherwise.

### GetScansOk

`func (o *ModelCloudNodeAccountRegisterRespData) GetScansOk() (*map[string]ModelCloudComplianceScanDetails, bool)`

GetScansOk returns a tuple with the Scans field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScans

`func (o *ModelCloudNodeAccountRegisterRespData) SetScans(v map[string]ModelCloudComplianceScanDetails)`

SetScans sets Scans field to given value.

### HasScans

`func (o *ModelCloudNodeAccountRegisterRespData) HasScans() bool`

HasScans returns a boolean if a field has been set.

### SetScansNil

`func (o *ModelCloudNodeAccountRegisterRespData) SetScansNil(b bool)`

 SetScansNil sets the value for Scans to be an explicit nil

### UnsetScans
`func (o *ModelCloudNodeAccountRegisterRespData) UnsetScans()`

UnsetScans ensures that no value is present for Scans, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



# ModelImage

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Metadata** | **map[string]interface{}** |  | 
**Metrics** | [**ModelComputeMetrics**](ModelComputeMetrics.md) |  | 
**Name** | **string** |  | 
**SizeMb** | **string** |  | 
**Tag** | **string** |  | 
**VirtualMb** | **string** |  | 

## Methods

### NewModelImage

`func NewModelImage(id string, metadata map[string]interface{}, metrics ModelComputeMetrics, name string, sizeMb string, tag string, virtualMb string, ) *ModelImage`

NewModelImage instantiates a new ModelImage object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelImageWithDefaults

`func NewModelImageWithDefaults() *ModelImage`

NewModelImageWithDefaults instantiates a new ModelImage object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *ModelImage) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *ModelImage) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *ModelImage) SetId(v string)`

SetId sets Id field to given value.


### GetMetadata

`func (o *ModelImage) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *ModelImage) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *ModelImage) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.


### GetMetrics

`func (o *ModelImage) GetMetrics() ModelComputeMetrics`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *ModelImage) GetMetricsOk() (*ModelComputeMetrics, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *ModelImage) SetMetrics(v ModelComputeMetrics)`

SetMetrics sets Metrics field to given value.


### GetName

`func (o *ModelImage) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *ModelImage) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *ModelImage) SetName(v string)`

SetName sets Name field to given value.


### GetSizeMb

`func (o *ModelImage) GetSizeMb() string`

GetSizeMb returns the SizeMb field if non-nil, zero value otherwise.

### GetSizeMbOk

`func (o *ModelImage) GetSizeMbOk() (*string, bool)`

GetSizeMbOk returns a tuple with the SizeMb field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSizeMb

`func (o *ModelImage) SetSizeMb(v string)`

SetSizeMb sets SizeMb field to given value.


### GetTag

`func (o *ModelImage) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *ModelImage) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *ModelImage) SetTag(v string)`

SetTag sets Tag field to given value.


### GetVirtualMb

`func (o *ModelImage) GetVirtualMb() string`

GetVirtualMb returns the VirtualMb field if non-nil, zero value otherwise.

### GetVirtualMbOk

`func (o *ModelImage) GetVirtualMbOk() (*string, bool)`

GetVirtualMbOk returns a tuple with the VirtualMb field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVirtualMb

`func (o *ModelImage) SetVirtualMb(v string)`

SetVirtualMb sets VirtualMb field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



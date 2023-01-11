# ModelScanTrigger

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**NodeId** | **string** |  | 
**ResourceId** | **string** |  | 
**ResourceType** | [**ControlsScanResource**](ControlsScanResource.md) |  | 

## Methods

### NewModelScanTrigger

`func NewModelScanTrigger(nodeId string, resourceId string, resourceType ControlsScanResource, ) *ModelScanTrigger`

NewModelScanTrigger instantiates a new ModelScanTrigger object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelScanTriggerWithDefaults

`func NewModelScanTriggerWithDefaults() *ModelScanTrigger`

NewModelScanTriggerWithDefaults instantiates a new ModelScanTrigger object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetNodeId

`func (o *ModelScanTrigger) GetNodeId() string`

GetNodeId returns the NodeId field if non-nil, zero value otherwise.

### GetNodeIdOk

`func (o *ModelScanTrigger) GetNodeIdOk() (*string, bool)`

GetNodeIdOk returns a tuple with the NodeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeId

`func (o *ModelScanTrigger) SetNodeId(v string)`

SetNodeId sets NodeId field to given value.


### GetResourceId

`func (o *ModelScanTrigger) GetResourceId() string`

GetResourceId returns the ResourceId field if non-nil, zero value otherwise.

### GetResourceIdOk

`func (o *ModelScanTrigger) GetResourceIdOk() (*string, bool)`

GetResourceIdOk returns a tuple with the ResourceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResourceId

`func (o *ModelScanTrigger) SetResourceId(v string)`

SetResourceId sets ResourceId field to given value.


### GetResourceType

`func (o *ModelScanTrigger) GetResourceType() ControlsScanResource`

GetResourceType returns the ResourceType field if non-nil, zero value otherwise.

### GetResourceTypeOk

`func (o *ModelScanTrigger) GetResourceTypeOk() (*ControlsScanResource, bool)`

GetResourceTypeOk returns a tuple with the ResourceType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResourceType

`func (o *ModelScanTrigger) SetResourceType(v ControlsScanResource)`

SetResourceType sets ResourceType field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



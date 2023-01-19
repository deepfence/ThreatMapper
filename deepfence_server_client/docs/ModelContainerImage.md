# ModelContainerImage

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**DockerImageName** | **string** |  | 
**DockerImageSize** | **string** |  | 
**DockerImageTag** | **string** |  | 
**Metadata** | **map[string]interface{}** |  | 
**Metrics** | [**ModelComputeMetrics**](ModelComputeMetrics.md) |  | 
**NodeId** | **string** |  | 

## Methods

### NewModelContainerImage

`func NewModelContainerImage(dockerImageName string, dockerImageSize string, dockerImageTag string, metadata map[string]interface{}, metrics ModelComputeMetrics, nodeId string, ) *ModelContainerImage`

NewModelContainerImage instantiates a new ModelContainerImage object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelContainerImageWithDefaults

`func NewModelContainerImageWithDefaults() *ModelContainerImage`

NewModelContainerImageWithDefaults instantiates a new ModelContainerImage object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetDockerImageName

`func (o *ModelContainerImage) GetDockerImageName() string`

GetDockerImageName returns the DockerImageName field if non-nil, zero value otherwise.

### GetDockerImageNameOk

`func (o *ModelContainerImage) GetDockerImageNameOk() (*string, bool)`

GetDockerImageNameOk returns a tuple with the DockerImageName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDockerImageName

`func (o *ModelContainerImage) SetDockerImageName(v string)`

SetDockerImageName sets DockerImageName field to given value.


### GetDockerImageSize

`func (o *ModelContainerImage) GetDockerImageSize() string`

GetDockerImageSize returns the DockerImageSize field if non-nil, zero value otherwise.

### GetDockerImageSizeOk

`func (o *ModelContainerImage) GetDockerImageSizeOk() (*string, bool)`

GetDockerImageSizeOk returns a tuple with the DockerImageSize field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDockerImageSize

`func (o *ModelContainerImage) SetDockerImageSize(v string)`

SetDockerImageSize sets DockerImageSize field to given value.


### GetDockerImageTag

`func (o *ModelContainerImage) GetDockerImageTag() string`

GetDockerImageTag returns the DockerImageTag field if non-nil, zero value otherwise.

### GetDockerImageTagOk

`func (o *ModelContainerImage) GetDockerImageTagOk() (*string, bool)`

GetDockerImageTagOk returns a tuple with the DockerImageTag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDockerImageTag

`func (o *ModelContainerImage) SetDockerImageTag(v string)`

SetDockerImageTag sets DockerImageTag field to given value.


### GetMetadata

`func (o *ModelContainerImage) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *ModelContainerImage) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *ModelContainerImage) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.


### GetMetrics

`func (o *ModelContainerImage) GetMetrics() ModelComputeMetrics`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *ModelContainerImage) GetMetricsOk() (*ModelComputeMetrics, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *ModelContainerImage) SetMetrics(v ModelComputeMetrics)`

SetMetrics sets Metrics field to given value.


### GetNodeId

`func (o *ModelContainerImage) GetNodeId() string`

GetNodeId returns the NodeId field if non-nil, zero value otherwise.

### GetNodeIdOk

`func (o *ModelContainerImage) GetNodeIdOk() (*string, bool)`

GetNodeIdOk returns a tuple with the NodeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeId

`func (o *ModelContainerImage) SetNodeId(v string)`

SetNodeId sets NodeId field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



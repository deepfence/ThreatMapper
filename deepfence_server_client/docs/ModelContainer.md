# ModelContainer

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**DockerLabels** | **map[string]interface{}** |  | 
**HostName** | **string** |  | 
**Image** | [**ModelContainerImage**](ModelContainerImage.md) |  | 
**Metadata** | **map[string]interface{}** |  | 
**Metrics** | [**ModelComputeMetrics**](ModelComputeMetrics.md) |  | 
**Name** | **string** |  | 
**NodeId** | **string** |  | 
**Processes** | [**[]ModelProcess**](ModelProcess.md) |  | 

## Methods

### NewModelContainer

`func NewModelContainer(dockerLabels map[string]interface{}, hostName string, image ModelContainerImage, metadata map[string]interface{}, metrics ModelComputeMetrics, name string, nodeId string, processes []ModelProcess, ) *ModelContainer`

NewModelContainer instantiates a new ModelContainer object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelContainerWithDefaults

`func NewModelContainerWithDefaults() *ModelContainer`

NewModelContainerWithDefaults instantiates a new ModelContainer object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetDockerLabels

`func (o *ModelContainer) GetDockerLabels() map[string]interface{}`

GetDockerLabels returns the DockerLabels field if non-nil, zero value otherwise.

### GetDockerLabelsOk

`func (o *ModelContainer) GetDockerLabelsOk() (*map[string]interface{}, bool)`

GetDockerLabelsOk returns a tuple with the DockerLabels field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDockerLabels

`func (o *ModelContainer) SetDockerLabels(v map[string]interface{})`

SetDockerLabels sets DockerLabels field to given value.


### GetHostName

`func (o *ModelContainer) GetHostName() string`

GetHostName returns the HostName field if non-nil, zero value otherwise.

### GetHostNameOk

`func (o *ModelContainer) GetHostNameOk() (*string, bool)`

GetHostNameOk returns a tuple with the HostName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHostName

`func (o *ModelContainer) SetHostName(v string)`

SetHostName sets HostName field to given value.


### GetImage

`func (o *ModelContainer) GetImage() ModelContainerImage`

GetImage returns the Image field if non-nil, zero value otherwise.

### GetImageOk

`func (o *ModelContainer) GetImageOk() (*ModelContainerImage, bool)`

GetImageOk returns a tuple with the Image field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetImage

`func (o *ModelContainer) SetImage(v ModelContainerImage)`

SetImage sets Image field to given value.


### GetMetadata

`func (o *ModelContainer) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *ModelContainer) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *ModelContainer) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.


### GetMetrics

`func (o *ModelContainer) GetMetrics() ModelComputeMetrics`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *ModelContainer) GetMetricsOk() (*ModelComputeMetrics, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *ModelContainer) SetMetrics(v ModelComputeMetrics)`

SetMetrics sets Metrics field to given value.


### GetName

`func (o *ModelContainer) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *ModelContainer) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *ModelContainer) SetName(v string)`

SetName sets Name field to given value.


### GetNodeId

`func (o *ModelContainer) GetNodeId() string`

GetNodeId returns the NodeId field if non-nil, zero value otherwise.

### GetNodeIdOk

`func (o *ModelContainer) GetNodeIdOk() (*string, bool)`

GetNodeIdOk returns a tuple with the NodeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeId

`func (o *ModelContainer) SetNodeId(v string)`

SetNodeId sets NodeId field to given value.


### GetProcesses

`func (o *ModelContainer) GetProcesses() []ModelProcess`

GetProcesses returns the Processes field if non-nil, zero value otherwise.

### GetProcessesOk

`func (o *ModelContainer) GetProcessesOk() (*[]ModelProcess, bool)`

GetProcessesOk returns a tuple with the Processes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProcesses

`func (o *ModelContainer) SetProcesses(v []ModelProcess)`

SetProcesses sets Processes field to given value.


### SetProcessesNil

`func (o *ModelContainer) SetProcessesNil(b bool)`

 SetProcessesNil sets the value for Processes to be an explicit nil

### UnsetProcesses
`func (o *ModelContainer) UnsetProcesses()`

UnsetProcesses ensures that no value is present for Processes, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



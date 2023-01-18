# ModelHost

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CloudMetadata** | **map[string]interface{}** |  | 
**ContainerImages** | [**[]ModelContainerImage**](ModelContainerImage.md) |  | 
**Containers** | [**[]ModelContainer**](ModelContainer.md) |  | 
**HostName** | **string** |  | 
**Metrics** | [**ModelComputeMetrics**](ModelComputeMetrics.md) |  | 
**NodeId** | **string** |  | 
**Pods** | [**[]ModelPod**](ModelPod.md) |  | 
**Processes** | [**[]ModelProcess**](ModelProcess.md) |  | 

## Methods

### NewModelHost

`func NewModelHost(cloudMetadata map[string]interface{}, containerImages []ModelContainerImage, containers []ModelContainer, hostName string, metrics ModelComputeMetrics, nodeId string, pods []ModelPod, processes []ModelProcess, ) *ModelHost`

NewModelHost instantiates a new ModelHost object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelHostWithDefaults

`func NewModelHostWithDefaults() *ModelHost`

NewModelHostWithDefaults instantiates a new ModelHost object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCloudMetadata

`func (o *ModelHost) GetCloudMetadata() map[string]interface{}`

GetCloudMetadata returns the CloudMetadata field if non-nil, zero value otherwise.

### GetCloudMetadataOk

`func (o *ModelHost) GetCloudMetadataOk() (*map[string]interface{}, bool)`

GetCloudMetadataOk returns a tuple with the CloudMetadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCloudMetadata

`func (o *ModelHost) SetCloudMetadata(v map[string]interface{})`

SetCloudMetadata sets CloudMetadata field to given value.


### GetContainerImages

`func (o *ModelHost) GetContainerImages() []ModelContainerImage`

GetContainerImages returns the ContainerImages field if non-nil, zero value otherwise.

### GetContainerImagesOk

`func (o *ModelHost) GetContainerImagesOk() (*[]ModelContainerImage, bool)`

GetContainerImagesOk returns a tuple with the ContainerImages field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContainerImages

`func (o *ModelHost) SetContainerImages(v []ModelContainerImage)`

SetContainerImages sets ContainerImages field to given value.


### SetContainerImagesNil

`func (o *ModelHost) SetContainerImagesNil(b bool)`

 SetContainerImagesNil sets the value for ContainerImages to be an explicit nil

### UnsetContainerImages
`func (o *ModelHost) UnsetContainerImages()`

UnsetContainerImages ensures that no value is present for ContainerImages, not even an explicit nil
### GetContainers

`func (o *ModelHost) GetContainers() []ModelContainer`

GetContainers returns the Containers field if non-nil, zero value otherwise.

### GetContainersOk

`func (o *ModelHost) GetContainersOk() (*[]ModelContainer, bool)`

GetContainersOk returns a tuple with the Containers field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContainers

`func (o *ModelHost) SetContainers(v []ModelContainer)`

SetContainers sets Containers field to given value.


### SetContainersNil

`func (o *ModelHost) SetContainersNil(b bool)`

 SetContainersNil sets the value for Containers to be an explicit nil

### UnsetContainers
`func (o *ModelHost) UnsetContainers()`

UnsetContainers ensures that no value is present for Containers, not even an explicit nil
### GetHostName

`func (o *ModelHost) GetHostName() string`

GetHostName returns the HostName field if non-nil, zero value otherwise.

### GetHostNameOk

`func (o *ModelHost) GetHostNameOk() (*string, bool)`

GetHostNameOk returns a tuple with the HostName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHostName

`func (o *ModelHost) SetHostName(v string)`

SetHostName sets HostName field to given value.


### GetMetrics

`func (o *ModelHost) GetMetrics() ModelComputeMetrics`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *ModelHost) GetMetricsOk() (*ModelComputeMetrics, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *ModelHost) SetMetrics(v ModelComputeMetrics)`

SetMetrics sets Metrics field to given value.


### GetNodeId

`func (o *ModelHost) GetNodeId() string`

GetNodeId returns the NodeId field if non-nil, zero value otherwise.

### GetNodeIdOk

`func (o *ModelHost) GetNodeIdOk() (*string, bool)`

GetNodeIdOk returns a tuple with the NodeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeId

`func (o *ModelHost) SetNodeId(v string)`

SetNodeId sets NodeId field to given value.


### GetPods

`func (o *ModelHost) GetPods() []ModelPod`

GetPods returns the Pods field if non-nil, zero value otherwise.

### GetPodsOk

`func (o *ModelHost) GetPodsOk() (*[]ModelPod, bool)`

GetPodsOk returns a tuple with the Pods field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPods

`func (o *ModelHost) SetPods(v []ModelPod)`

SetPods sets Pods field to given value.


### SetPodsNil

`func (o *ModelHost) SetPodsNil(b bool)`

 SetPodsNil sets the value for Pods to be an explicit nil

### UnsetPods
`func (o *ModelHost) UnsetPods()`

UnsetPods ensures that no value is present for Pods, not even an explicit nil
### GetProcesses

`func (o *ModelHost) GetProcesses() []ModelProcess`

GetProcesses returns the Processes field if non-nil, zero value otherwise.

### GetProcessesOk

`func (o *ModelHost) GetProcessesOk() (*[]ModelProcess, bool)`

GetProcessesOk returns a tuple with the Processes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProcesses

`func (o *ModelHost) SetProcesses(v []ModelProcess)`

SetProcesses sets Processes field to given value.


### SetProcessesNil

`func (o *ModelHost) SetProcessesNil(b bool)`

 SetProcessesNil sets the value for Processes to be an explicit nil

### UnsetProcesses
`func (o *ModelHost) UnsetProcesses()`

UnsetProcesses ensures that no value is present for Processes, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



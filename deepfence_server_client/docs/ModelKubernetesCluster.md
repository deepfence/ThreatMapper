# ModelKubernetesCluster

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CloudMetadata** | **map[string]interface{}** |  | 
**Containers** | [**[]ModelHost**](ModelHost.md) |  | 
**HostName** | **string** |  | 
**Metrics** | [**ModelComputeMetrics**](ModelComputeMetrics.md) |  | 
**NodeId** | **string** |  | 

## Methods

### NewModelKubernetesCluster

`func NewModelKubernetesCluster(cloudMetadata map[string]interface{}, containers []ModelHost, hostName string, metrics ModelComputeMetrics, nodeId string, ) *ModelKubernetesCluster`

NewModelKubernetesCluster instantiates a new ModelKubernetesCluster object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelKubernetesClusterWithDefaults

`func NewModelKubernetesClusterWithDefaults() *ModelKubernetesCluster`

NewModelKubernetesClusterWithDefaults instantiates a new ModelKubernetesCluster object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCloudMetadata

`func (o *ModelKubernetesCluster) GetCloudMetadata() map[string]interface{}`

GetCloudMetadata returns the CloudMetadata field if non-nil, zero value otherwise.

### GetCloudMetadataOk

`func (o *ModelKubernetesCluster) GetCloudMetadataOk() (*map[string]interface{}, bool)`

GetCloudMetadataOk returns a tuple with the CloudMetadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCloudMetadata

`func (o *ModelKubernetesCluster) SetCloudMetadata(v map[string]interface{})`

SetCloudMetadata sets CloudMetadata field to given value.


### GetContainers

`func (o *ModelKubernetesCluster) GetContainers() []ModelHost`

GetContainers returns the Containers field if non-nil, zero value otherwise.

### GetContainersOk

`func (o *ModelKubernetesCluster) GetContainersOk() (*[]ModelHost, bool)`

GetContainersOk returns a tuple with the Containers field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContainers

`func (o *ModelKubernetesCluster) SetContainers(v []ModelHost)`

SetContainers sets Containers field to given value.


### SetContainersNil

`func (o *ModelKubernetesCluster) SetContainersNil(b bool)`

 SetContainersNil sets the value for Containers to be an explicit nil

### UnsetContainers
`func (o *ModelKubernetesCluster) UnsetContainers()`

UnsetContainers ensures that no value is present for Containers, not even an explicit nil
### GetHostName

`func (o *ModelKubernetesCluster) GetHostName() string`

GetHostName returns the HostName field if non-nil, zero value otherwise.

### GetHostNameOk

`func (o *ModelKubernetesCluster) GetHostNameOk() (*string, bool)`

GetHostNameOk returns a tuple with the HostName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHostName

`func (o *ModelKubernetesCluster) SetHostName(v string)`

SetHostName sets HostName field to given value.


### GetMetrics

`func (o *ModelKubernetesCluster) GetMetrics() ModelComputeMetrics`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *ModelKubernetesCluster) GetMetricsOk() (*ModelComputeMetrics, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *ModelKubernetesCluster) SetMetrics(v ModelComputeMetrics)`

SetMetrics sets Metrics field to given value.


### GetNodeId

`func (o *ModelKubernetesCluster) GetNodeId() string`

GetNodeId returns the NodeId field if non-nil, zero value otherwise.

### GetNodeIdOk

`func (o *ModelKubernetesCluster) GetNodeIdOk() (*string, bool)`

GetNodeIdOk returns a tuple with the NodeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeId

`func (o *ModelKubernetesCluster) SetNodeId(v string)`

SetNodeId sets NodeId field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



# ModelProcess

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Cmdline** | **string** |  | 
**Metadata** | **map[string]interface{}** |  | 
**Metrics** | [**ModelComputeMetrics**](ModelComputeMetrics.md) |  | 
**Name** | **string** |  | 
**NodeId** | **string** |  | 
**Pid** | **string** |  | 
**Ppid** | **string** |  | 
**Threads** | **int32** |  | 

## Methods

### NewModelProcess

`func NewModelProcess(cmdline string, metadata map[string]interface{}, metrics ModelComputeMetrics, name string, nodeId string, pid string, ppid string, threads int32, ) *ModelProcess`

NewModelProcess instantiates a new ModelProcess object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelProcessWithDefaults

`func NewModelProcessWithDefaults() *ModelProcess`

NewModelProcessWithDefaults instantiates a new ModelProcess object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCmdline

`func (o *ModelProcess) GetCmdline() string`

GetCmdline returns the Cmdline field if non-nil, zero value otherwise.

### GetCmdlineOk

`func (o *ModelProcess) GetCmdlineOk() (*string, bool)`

GetCmdlineOk returns a tuple with the Cmdline field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCmdline

`func (o *ModelProcess) SetCmdline(v string)`

SetCmdline sets Cmdline field to given value.


### GetMetadata

`func (o *ModelProcess) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *ModelProcess) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *ModelProcess) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.


### GetMetrics

`func (o *ModelProcess) GetMetrics() ModelComputeMetrics`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *ModelProcess) GetMetricsOk() (*ModelComputeMetrics, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *ModelProcess) SetMetrics(v ModelComputeMetrics)`

SetMetrics sets Metrics field to given value.


### GetName

`func (o *ModelProcess) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *ModelProcess) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *ModelProcess) SetName(v string)`

SetName sets Name field to given value.


### GetNodeId

`func (o *ModelProcess) GetNodeId() string`

GetNodeId returns the NodeId field if non-nil, zero value otherwise.

### GetNodeIdOk

`func (o *ModelProcess) GetNodeIdOk() (*string, bool)`

GetNodeIdOk returns a tuple with the NodeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeId

`func (o *ModelProcess) SetNodeId(v string)`

SetNodeId sets NodeId field to given value.


### GetPid

`func (o *ModelProcess) GetPid() string`

GetPid returns the Pid field if non-nil, zero value otherwise.

### GetPidOk

`func (o *ModelProcess) GetPidOk() (*string, bool)`

GetPidOk returns a tuple with the Pid field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPid

`func (o *ModelProcess) SetPid(v string)`

SetPid sets Pid field to given value.


### GetPpid

`func (o *ModelProcess) GetPpid() string`

GetPpid returns the Ppid field if non-nil, zero value otherwise.

### GetPpidOk

`func (o *ModelProcess) GetPpidOk() (*string, bool)`

GetPpidOk returns a tuple with the Ppid field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPpid

`func (o *ModelProcess) SetPpid(v string)`

SetPpid sets Ppid field to given value.


### GetThreads

`func (o *ModelProcess) GetThreads() int32`

GetThreads returns the Threads field if non-nil, zero value otherwise.

### GetThreadsOk

`func (o *ModelProcess) GetThreadsOk() (*int32, bool)`

GetThreadsOk returns a tuple with the Threads field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetThreads

`func (o *ModelProcess) SetThreads(v int32)`

SetThreads sets Threads field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



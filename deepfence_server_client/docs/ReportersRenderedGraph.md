# ReportersRenderedGraph

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Connections** | Pointer to [**[]ReportersConnectionSummary**](ReportersConnectionSummary.md) |  | [optional] 
**Containers** | Pointer to **map[string][]string** |  | [optional] 
**Hosts** | Pointer to [**map[string]map[string][]string**](map.md) |  | [optional] 
**Pods** | Pointer to **map[string][]string** |  | [optional] 
**Processes** | Pointer to **map[string][]string** |  | [optional] 
**Providers** | Pointer to **[]string** |  | [optional] 
**Regions** | Pointer to **map[string][]string** |  | [optional] 

## Methods

### NewReportersRenderedGraph

`func NewReportersRenderedGraph() *ReportersRenderedGraph`

NewReportersRenderedGraph instantiates a new ReportersRenderedGraph object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewReportersRenderedGraphWithDefaults

`func NewReportersRenderedGraphWithDefaults() *ReportersRenderedGraph`

NewReportersRenderedGraphWithDefaults instantiates a new ReportersRenderedGraph object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetConnections

`func (o *ReportersRenderedGraph) GetConnections() []ReportersConnectionSummary`

GetConnections returns the Connections field if non-nil, zero value otherwise.

### GetConnectionsOk

`func (o *ReportersRenderedGraph) GetConnectionsOk() (*[]ReportersConnectionSummary, bool)`

GetConnectionsOk returns a tuple with the Connections field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConnections

`func (o *ReportersRenderedGraph) SetConnections(v []ReportersConnectionSummary)`

SetConnections sets Connections field to given value.

### HasConnections

`func (o *ReportersRenderedGraph) HasConnections() bool`

HasConnections returns a boolean if a field has been set.

### SetConnectionsNil

`func (o *ReportersRenderedGraph) SetConnectionsNil(b bool)`

 SetConnectionsNil sets the value for Connections to be an explicit nil

### UnsetConnections
`func (o *ReportersRenderedGraph) UnsetConnections()`

UnsetConnections ensures that no value is present for Connections, not even an explicit nil
### GetContainers

`func (o *ReportersRenderedGraph) GetContainers() map[string][]string`

GetContainers returns the Containers field if non-nil, zero value otherwise.

### GetContainersOk

`func (o *ReportersRenderedGraph) GetContainersOk() (*map[string][]string, bool)`

GetContainersOk returns a tuple with the Containers field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContainers

`func (o *ReportersRenderedGraph) SetContainers(v map[string][]string)`

SetContainers sets Containers field to given value.

### HasContainers

`func (o *ReportersRenderedGraph) HasContainers() bool`

HasContainers returns a boolean if a field has been set.

### SetContainersNil

`func (o *ReportersRenderedGraph) SetContainersNil(b bool)`

 SetContainersNil sets the value for Containers to be an explicit nil

### UnsetContainers
`func (o *ReportersRenderedGraph) UnsetContainers()`

UnsetContainers ensures that no value is present for Containers, not even an explicit nil
### GetHosts

`func (o *ReportersRenderedGraph) GetHosts() map[string]map[string][]string`

GetHosts returns the Hosts field if non-nil, zero value otherwise.

### GetHostsOk

`func (o *ReportersRenderedGraph) GetHostsOk() (*map[string]map[string][]string, bool)`

GetHostsOk returns a tuple with the Hosts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHosts

`func (o *ReportersRenderedGraph) SetHosts(v map[string]map[string][]string)`

SetHosts sets Hosts field to given value.

### HasHosts

`func (o *ReportersRenderedGraph) HasHosts() bool`

HasHosts returns a boolean if a field has been set.

### SetHostsNil

`func (o *ReportersRenderedGraph) SetHostsNil(b bool)`

 SetHostsNil sets the value for Hosts to be an explicit nil

### UnsetHosts
`func (o *ReportersRenderedGraph) UnsetHosts()`

UnsetHosts ensures that no value is present for Hosts, not even an explicit nil
### GetPods

`func (o *ReportersRenderedGraph) GetPods() map[string][]string`

GetPods returns the Pods field if non-nil, zero value otherwise.

### GetPodsOk

`func (o *ReportersRenderedGraph) GetPodsOk() (*map[string][]string, bool)`

GetPodsOk returns a tuple with the Pods field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPods

`func (o *ReportersRenderedGraph) SetPods(v map[string][]string)`

SetPods sets Pods field to given value.

### HasPods

`func (o *ReportersRenderedGraph) HasPods() bool`

HasPods returns a boolean if a field has been set.

### SetPodsNil

`func (o *ReportersRenderedGraph) SetPodsNil(b bool)`

 SetPodsNil sets the value for Pods to be an explicit nil

### UnsetPods
`func (o *ReportersRenderedGraph) UnsetPods()`

UnsetPods ensures that no value is present for Pods, not even an explicit nil
### GetProcesses

`func (o *ReportersRenderedGraph) GetProcesses() map[string][]string`

GetProcesses returns the Processes field if non-nil, zero value otherwise.

### GetProcessesOk

`func (o *ReportersRenderedGraph) GetProcessesOk() (*map[string][]string, bool)`

GetProcessesOk returns a tuple with the Processes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProcesses

`func (o *ReportersRenderedGraph) SetProcesses(v map[string][]string)`

SetProcesses sets Processes field to given value.

### HasProcesses

`func (o *ReportersRenderedGraph) HasProcesses() bool`

HasProcesses returns a boolean if a field has been set.

### SetProcessesNil

`func (o *ReportersRenderedGraph) SetProcessesNil(b bool)`

 SetProcessesNil sets the value for Processes to be an explicit nil

### UnsetProcesses
`func (o *ReportersRenderedGraph) UnsetProcesses()`

UnsetProcesses ensures that no value is present for Processes, not even an explicit nil
### GetProviders

`func (o *ReportersRenderedGraph) GetProviders() []string`

GetProviders returns the Providers field if non-nil, zero value otherwise.

### GetProvidersOk

`func (o *ReportersRenderedGraph) GetProvidersOk() (*[]string, bool)`

GetProvidersOk returns a tuple with the Providers field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProviders

`func (o *ReportersRenderedGraph) SetProviders(v []string)`

SetProviders sets Providers field to given value.

### HasProviders

`func (o *ReportersRenderedGraph) HasProviders() bool`

HasProviders returns a boolean if a field has been set.

### SetProvidersNil

`func (o *ReportersRenderedGraph) SetProvidersNil(b bool)`

 SetProvidersNil sets the value for Providers to be an explicit nil

### UnsetProviders
`func (o *ReportersRenderedGraph) UnsetProviders()`

UnsetProviders ensures that no value is present for Providers, not even an explicit nil
### GetRegions

`func (o *ReportersRenderedGraph) GetRegions() map[string][]string`

GetRegions returns the Regions field if non-nil, zero value otherwise.

### GetRegionsOk

`func (o *ReportersRenderedGraph) GetRegionsOk() (*map[string][]string, bool)`

GetRegionsOk returns a tuple with the Regions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRegions

`func (o *ReportersRenderedGraph) SetRegions(v map[string][]string)`

SetRegions sets Regions field to given value.

### HasRegions

`func (o *ReportersRenderedGraph) HasRegions() bool`

HasRegions returns a boolean if a field has been set.

### SetRegionsNil

`func (o *ReportersRenderedGraph) SetRegionsNil(b bool)`

 SetRegionsNil sets the value for Regions to be an explicit nil

### UnsetRegions
`func (o *ReportersRenderedGraph) UnsetRegions()`

UnsetRegions ensures that no value is present for Regions, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



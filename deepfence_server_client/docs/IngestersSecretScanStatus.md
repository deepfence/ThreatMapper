# IngestersSecretScanStatus

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Timestamp** | Pointer to **time.Time** |  | [optional] 
**ContainerName** | Pointer to **string** |  | [optional] 
**HostName** | Pointer to **string** |  | [optional] 
**KubernetesClusterName** | Pointer to **string** |  | [optional] 
**Masked** | Pointer to **string** |  | [optional] 
**NodeId** | Pointer to **string** |  | [optional] 
**NodeName** | Pointer to **string** |  | [optional] 
**NodeType** | Pointer to **string** |  | [optional] 
**ScanId** | Pointer to **string** |  | [optional] 
**ScanStatus** | Pointer to **string** |  | [optional] 

## Methods

### NewIngestersSecretScanStatus

`func NewIngestersSecretScanStatus() *IngestersSecretScanStatus`

NewIngestersSecretScanStatus instantiates a new IngestersSecretScanStatus object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewIngestersSecretScanStatusWithDefaults

`func NewIngestersSecretScanStatusWithDefaults() *IngestersSecretScanStatus`

NewIngestersSecretScanStatusWithDefaults instantiates a new IngestersSecretScanStatus object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTimestamp

`func (o *IngestersSecretScanStatus) GetTimestamp() time.Time`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *IngestersSecretScanStatus) GetTimestampOk() (*time.Time, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *IngestersSecretScanStatus) SetTimestamp(v time.Time)`

SetTimestamp sets Timestamp field to given value.

### HasTimestamp

`func (o *IngestersSecretScanStatus) HasTimestamp() bool`

HasTimestamp returns a boolean if a field has been set.

### GetContainerName

`func (o *IngestersSecretScanStatus) GetContainerName() string`

GetContainerName returns the ContainerName field if non-nil, zero value otherwise.

### GetContainerNameOk

`func (o *IngestersSecretScanStatus) GetContainerNameOk() (*string, bool)`

GetContainerNameOk returns a tuple with the ContainerName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContainerName

`func (o *IngestersSecretScanStatus) SetContainerName(v string)`

SetContainerName sets ContainerName field to given value.

### HasContainerName

`func (o *IngestersSecretScanStatus) HasContainerName() bool`

HasContainerName returns a boolean if a field has been set.

### GetHostName

`func (o *IngestersSecretScanStatus) GetHostName() string`

GetHostName returns the HostName field if non-nil, zero value otherwise.

### GetHostNameOk

`func (o *IngestersSecretScanStatus) GetHostNameOk() (*string, bool)`

GetHostNameOk returns a tuple with the HostName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHostName

`func (o *IngestersSecretScanStatus) SetHostName(v string)`

SetHostName sets HostName field to given value.

### HasHostName

`func (o *IngestersSecretScanStatus) HasHostName() bool`

HasHostName returns a boolean if a field has been set.

### GetKubernetesClusterName

`func (o *IngestersSecretScanStatus) GetKubernetesClusterName() string`

GetKubernetesClusterName returns the KubernetesClusterName field if non-nil, zero value otherwise.

### GetKubernetesClusterNameOk

`func (o *IngestersSecretScanStatus) GetKubernetesClusterNameOk() (*string, bool)`

GetKubernetesClusterNameOk returns a tuple with the KubernetesClusterName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKubernetesClusterName

`func (o *IngestersSecretScanStatus) SetKubernetesClusterName(v string)`

SetKubernetesClusterName sets KubernetesClusterName field to given value.

### HasKubernetesClusterName

`func (o *IngestersSecretScanStatus) HasKubernetesClusterName() bool`

HasKubernetesClusterName returns a boolean if a field has been set.

### GetMasked

`func (o *IngestersSecretScanStatus) GetMasked() string`

GetMasked returns the Masked field if non-nil, zero value otherwise.

### GetMaskedOk

`func (o *IngestersSecretScanStatus) GetMaskedOk() (*string, bool)`

GetMaskedOk returns a tuple with the Masked field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMasked

`func (o *IngestersSecretScanStatus) SetMasked(v string)`

SetMasked sets Masked field to given value.

### HasMasked

`func (o *IngestersSecretScanStatus) HasMasked() bool`

HasMasked returns a boolean if a field has been set.

### GetNodeId

`func (o *IngestersSecretScanStatus) GetNodeId() string`

GetNodeId returns the NodeId field if non-nil, zero value otherwise.

### GetNodeIdOk

`func (o *IngestersSecretScanStatus) GetNodeIdOk() (*string, bool)`

GetNodeIdOk returns a tuple with the NodeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeId

`func (o *IngestersSecretScanStatus) SetNodeId(v string)`

SetNodeId sets NodeId field to given value.

### HasNodeId

`func (o *IngestersSecretScanStatus) HasNodeId() bool`

HasNodeId returns a boolean if a field has been set.

### GetNodeName

`func (o *IngestersSecretScanStatus) GetNodeName() string`

GetNodeName returns the NodeName field if non-nil, zero value otherwise.

### GetNodeNameOk

`func (o *IngestersSecretScanStatus) GetNodeNameOk() (*string, bool)`

GetNodeNameOk returns a tuple with the NodeName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeName

`func (o *IngestersSecretScanStatus) SetNodeName(v string)`

SetNodeName sets NodeName field to given value.

### HasNodeName

`func (o *IngestersSecretScanStatus) HasNodeName() bool`

HasNodeName returns a boolean if a field has been set.

### GetNodeType

`func (o *IngestersSecretScanStatus) GetNodeType() string`

GetNodeType returns the NodeType field if non-nil, zero value otherwise.

### GetNodeTypeOk

`func (o *IngestersSecretScanStatus) GetNodeTypeOk() (*string, bool)`

GetNodeTypeOk returns a tuple with the NodeType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeType

`func (o *IngestersSecretScanStatus) SetNodeType(v string)`

SetNodeType sets NodeType field to given value.

### HasNodeType

`func (o *IngestersSecretScanStatus) HasNodeType() bool`

HasNodeType returns a boolean if a field has been set.

### GetScanId

`func (o *IngestersSecretScanStatus) GetScanId() string`

GetScanId returns the ScanId field if non-nil, zero value otherwise.

### GetScanIdOk

`func (o *IngestersSecretScanStatus) GetScanIdOk() (*string, bool)`

GetScanIdOk returns a tuple with the ScanId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScanId

`func (o *IngestersSecretScanStatus) SetScanId(v string)`

SetScanId sets ScanId field to given value.

### HasScanId

`func (o *IngestersSecretScanStatus) HasScanId() bool`

HasScanId returns a boolean if a field has been set.

### GetScanStatus

`func (o *IngestersSecretScanStatus) GetScanStatus() string`

GetScanStatus returns the ScanStatus field if non-nil, zero value otherwise.

### GetScanStatusOk

`func (o *IngestersSecretScanStatus) GetScanStatusOk() (*string, bool)`

GetScanStatusOk returns a tuple with the ScanStatus field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScanStatus

`func (o *IngestersSecretScanStatus) SetScanStatus(v string)`

SetScanStatus sets ScanStatus field to given value.

### HasScanStatus

`func (o *IngestersSecretScanStatus) HasScanStatus() bool`

HasScanStatus returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



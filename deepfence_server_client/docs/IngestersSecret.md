# IngestersSecret

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Timestamp** | Pointer to **time.Time** |  | [optional] 
**ImageLayerId** | Pointer to **string** |  | [optional] 
**Match** | Pointer to [**IngestersSecretMatch**](IngestersSecretMatch.md) |  | [optional] 
**Rule** | Pointer to [**IngestersSecretRule**](IngestersSecretRule.md) |  | [optional] 
**Severity** | Pointer to [**IngestersSecretSeverity**](IngestersSecretSeverity.md) |  | [optional] 
**ContainerName** | Pointer to **string** |  | [optional] 
**HostName** | Pointer to **string** |  | [optional] 
**KubernetesClusterName** | Pointer to **string** |  | [optional] 
**Masked** | Pointer to **string** |  | [optional] 
**NodeId** | Pointer to **string** |  | [optional] 
**NodeName** | Pointer to **string** |  | [optional] 
**NodeType** | Pointer to **string** |  | [optional] 
**ScanId** | Pointer to **string** |  | [optional] 

## Methods

### NewIngestersSecret

`func NewIngestersSecret() *IngestersSecret`

NewIngestersSecret instantiates a new IngestersSecret object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewIngestersSecretWithDefaults

`func NewIngestersSecretWithDefaults() *IngestersSecret`

NewIngestersSecretWithDefaults instantiates a new IngestersSecret object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTimestamp

`func (o *IngestersSecret) GetTimestamp() time.Time`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *IngestersSecret) GetTimestampOk() (*time.Time, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *IngestersSecret) SetTimestamp(v time.Time)`

SetTimestamp sets Timestamp field to given value.

### HasTimestamp

`func (o *IngestersSecret) HasTimestamp() bool`

HasTimestamp returns a boolean if a field has been set.

### GetImageLayerId

`func (o *IngestersSecret) GetImageLayerId() string`

GetImageLayerId returns the ImageLayerId field if non-nil, zero value otherwise.

### GetImageLayerIdOk

`func (o *IngestersSecret) GetImageLayerIdOk() (*string, bool)`

GetImageLayerIdOk returns a tuple with the ImageLayerId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetImageLayerId

`func (o *IngestersSecret) SetImageLayerId(v string)`

SetImageLayerId sets ImageLayerId field to given value.

### HasImageLayerId

`func (o *IngestersSecret) HasImageLayerId() bool`

HasImageLayerId returns a boolean if a field has been set.

### GetMatch

`func (o *IngestersSecret) GetMatch() IngestersSecretMatch`

GetMatch returns the Match field if non-nil, zero value otherwise.

### GetMatchOk

`func (o *IngestersSecret) GetMatchOk() (*IngestersSecretMatch, bool)`

GetMatchOk returns a tuple with the Match field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMatch

`func (o *IngestersSecret) SetMatch(v IngestersSecretMatch)`

SetMatch sets Match field to given value.

### HasMatch

`func (o *IngestersSecret) HasMatch() bool`

HasMatch returns a boolean if a field has been set.

### GetRule

`func (o *IngestersSecret) GetRule() IngestersSecretRule`

GetRule returns the Rule field if non-nil, zero value otherwise.

### GetRuleOk

`func (o *IngestersSecret) GetRuleOk() (*IngestersSecretRule, bool)`

GetRuleOk returns a tuple with the Rule field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRule

`func (o *IngestersSecret) SetRule(v IngestersSecretRule)`

SetRule sets Rule field to given value.

### HasRule

`func (o *IngestersSecret) HasRule() bool`

HasRule returns a boolean if a field has been set.

### GetSeverity

`func (o *IngestersSecret) GetSeverity() IngestersSecretSeverity`

GetSeverity returns the Severity field if non-nil, zero value otherwise.

### GetSeverityOk

`func (o *IngestersSecret) GetSeverityOk() (*IngestersSecretSeverity, bool)`

GetSeverityOk returns a tuple with the Severity field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeverity

`func (o *IngestersSecret) SetSeverity(v IngestersSecretSeverity)`

SetSeverity sets Severity field to given value.

### HasSeverity

`func (o *IngestersSecret) HasSeverity() bool`

HasSeverity returns a boolean if a field has been set.

### GetContainerName

`func (o *IngestersSecret) GetContainerName() string`

GetContainerName returns the ContainerName field if non-nil, zero value otherwise.

### GetContainerNameOk

`func (o *IngestersSecret) GetContainerNameOk() (*string, bool)`

GetContainerNameOk returns a tuple with the ContainerName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContainerName

`func (o *IngestersSecret) SetContainerName(v string)`

SetContainerName sets ContainerName field to given value.

### HasContainerName

`func (o *IngestersSecret) HasContainerName() bool`

HasContainerName returns a boolean if a field has been set.

### GetHostName

`func (o *IngestersSecret) GetHostName() string`

GetHostName returns the HostName field if non-nil, zero value otherwise.

### GetHostNameOk

`func (o *IngestersSecret) GetHostNameOk() (*string, bool)`

GetHostNameOk returns a tuple with the HostName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHostName

`func (o *IngestersSecret) SetHostName(v string)`

SetHostName sets HostName field to given value.

### HasHostName

`func (o *IngestersSecret) HasHostName() bool`

HasHostName returns a boolean if a field has been set.

### GetKubernetesClusterName

`func (o *IngestersSecret) GetKubernetesClusterName() string`

GetKubernetesClusterName returns the KubernetesClusterName field if non-nil, zero value otherwise.

### GetKubernetesClusterNameOk

`func (o *IngestersSecret) GetKubernetesClusterNameOk() (*string, bool)`

GetKubernetesClusterNameOk returns a tuple with the KubernetesClusterName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKubernetesClusterName

`func (o *IngestersSecret) SetKubernetesClusterName(v string)`

SetKubernetesClusterName sets KubernetesClusterName field to given value.

### HasKubernetesClusterName

`func (o *IngestersSecret) HasKubernetesClusterName() bool`

HasKubernetesClusterName returns a boolean if a field has been set.

### GetMasked

`func (o *IngestersSecret) GetMasked() string`

GetMasked returns the Masked field if non-nil, zero value otherwise.

### GetMaskedOk

`func (o *IngestersSecret) GetMaskedOk() (*string, bool)`

GetMaskedOk returns a tuple with the Masked field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMasked

`func (o *IngestersSecret) SetMasked(v string)`

SetMasked sets Masked field to given value.

### HasMasked

`func (o *IngestersSecret) HasMasked() bool`

HasMasked returns a boolean if a field has been set.

### GetNodeId

`func (o *IngestersSecret) GetNodeId() string`

GetNodeId returns the NodeId field if non-nil, zero value otherwise.

### GetNodeIdOk

`func (o *IngestersSecret) GetNodeIdOk() (*string, bool)`

GetNodeIdOk returns a tuple with the NodeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeId

`func (o *IngestersSecret) SetNodeId(v string)`

SetNodeId sets NodeId field to given value.

### HasNodeId

`func (o *IngestersSecret) HasNodeId() bool`

HasNodeId returns a boolean if a field has been set.

### GetNodeName

`func (o *IngestersSecret) GetNodeName() string`

GetNodeName returns the NodeName field if non-nil, zero value otherwise.

### GetNodeNameOk

`func (o *IngestersSecret) GetNodeNameOk() (*string, bool)`

GetNodeNameOk returns a tuple with the NodeName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeName

`func (o *IngestersSecret) SetNodeName(v string)`

SetNodeName sets NodeName field to given value.

### HasNodeName

`func (o *IngestersSecret) HasNodeName() bool`

HasNodeName returns a boolean if a field has been set.

### GetNodeType

`func (o *IngestersSecret) GetNodeType() string`

GetNodeType returns the NodeType field if non-nil, zero value otherwise.

### GetNodeTypeOk

`func (o *IngestersSecret) GetNodeTypeOk() (*string, bool)`

GetNodeTypeOk returns a tuple with the NodeType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeType

`func (o *IngestersSecret) SetNodeType(v string)`

SetNodeType sets NodeType field to given value.

### HasNodeType

`func (o *IngestersSecret) HasNodeType() bool`

HasNodeType returns a boolean if a field has been set.

### GetScanId

`func (o *IngestersSecret) GetScanId() string`

GetScanId returns the ScanId field if non-nil, zero value otherwise.

### GetScanIdOk

`func (o *IngestersSecret) GetScanIdOk() (*string, bool)`

GetScanIdOk returns a tuple with the ScanId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScanId

`func (o *IngestersSecret) SetScanId(v string)`

SetScanId sets ScanId field to given value.

### HasScanId

`func (o *IngestersSecret) HasScanId() bool`

HasScanId returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



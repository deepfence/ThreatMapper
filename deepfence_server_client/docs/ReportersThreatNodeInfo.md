# ReportersThreatNodeInfo

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AttackPath** | **[][]string** |  | 
**ComplianceCount** | **int32** |  | 
**Count** | **int32** |  | 
**Id** | **string** |  | 
**Label** | **string** |  | 
**NodeType** | **string** |  | 
**Nodes** | [**map[string]ReportersNodeInfo**](ReportersNodeInfo.md) |  | 
**SecretsCount** | **int32** |  | 
**VulnerabilityCount** | **int32** |  | 

## Methods

### NewReportersThreatNodeInfo

`func NewReportersThreatNodeInfo(attackPath [][]string, complianceCount int32, count int32, id string, label string, nodeType string, nodes map[string]ReportersNodeInfo, secretsCount int32, vulnerabilityCount int32, ) *ReportersThreatNodeInfo`

NewReportersThreatNodeInfo instantiates a new ReportersThreatNodeInfo object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewReportersThreatNodeInfoWithDefaults

`func NewReportersThreatNodeInfoWithDefaults() *ReportersThreatNodeInfo`

NewReportersThreatNodeInfoWithDefaults instantiates a new ReportersThreatNodeInfo object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAttackPath

`func (o *ReportersThreatNodeInfo) GetAttackPath() [][]string`

GetAttackPath returns the AttackPath field if non-nil, zero value otherwise.

### GetAttackPathOk

`func (o *ReportersThreatNodeInfo) GetAttackPathOk() (*[][]string, bool)`

GetAttackPathOk returns a tuple with the AttackPath field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttackPath

`func (o *ReportersThreatNodeInfo) SetAttackPath(v [][]string)`

SetAttackPath sets AttackPath field to given value.


### SetAttackPathNil

`func (o *ReportersThreatNodeInfo) SetAttackPathNil(b bool)`

 SetAttackPathNil sets the value for AttackPath to be an explicit nil

### UnsetAttackPath
`func (o *ReportersThreatNodeInfo) UnsetAttackPath()`

UnsetAttackPath ensures that no value is present for AttackPath, not even an explicit nil
### GetComplianceCount

`func (o *ReportersThreatNodeInfo) GetComplianceCount() int32`

GetComplianceCount returns the ComplianceCount field if non-nil, zero value otherwise.

### GetComplianceCountOk

`func (o *ReportersThreatNodeInfo) GetComplianceCountOk() (*int32, bool)`

GetComplianceCountOk returns a tuple with the ComplianceCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetComplianceCount

`func (o *ReportersThreatNodeInfo) SetComplianceCount(v int32)`

SetComplianceCount sets ComplianceCount field to given value.


### GetCount

`func (o *ReportersThreatNodeInfo) GetCount() int32`

GetCount returns the Count field if non-nil, zero value otherwise.

### GetCountOk

`func (o *ReportersThreatNodeInfo) GetCountOk() (*int32, bool)`

GetCountOk returns a tuple with the Count field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCount

`func (o *ReportersThreatNodeInfo) SetCount(v int32)`

SetCount sets Count field to given value.


### GetId

`func (o *ReportersThreatNodeInfo) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *ReportersThreatNodeInfo) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *ReportersThreatNodeInfo) SetId(v string)`

SetId sets Id field to given value.


### GetLabel

`func (o *ReportersThreatNodeInfo) GetLabel() string`

GetLabel returns the Label field if non-nil, zero value otherwise.

### GetLabelOk

`func (o *ReportersThreatNodeInfo) GetLabelOk() (*string, bool)`

GetLabelOk returns a tuple with the Label field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLabel

`func (o *ReportersThreatNodeInfo) SetLabel(v string)`

SetLabel sets Label field to given value.


### GetNodeType

`func (o *ReportersThreatNodeInfo) GetNodeType() string`

GetNodeType returns the NodeType field if non-nil, zero value otherwise.

### GetNodeTypeOk

`func (o *ReportersThreatNodeInfo) GetNodeTypeOk() (*string, bool)`

GetNodeTypeOk returns a tuple with the NodeType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeType

`func (o *ReportersThreatNodeInfo) SetNodeType(v string)`

SetNodeType sets NodeType field to given value.


### GetNodes

`func (o *ReportersThreatNodeInfo) GetNodes() map[string]ReportersNodeInfo`

GetNodes returns the Nodes field if non-nil, zero value otherwise.

### GetNodesOk

`func (o *ReportersThreatNodeInfo) GetNodesOk() (*map[string]ReportersNodeInfo, bool)`

GetNodesOk returns a tuple with the Nodes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodes

`func (o *ReportersThreatNodeInfo) SetNodes(v map[string]ReportersNodeInfo)`

SetNodes sets Nodes field to given value.


### SetNodesNil

`func (o *ReportersThreatNodeInfo) SetNodesNil(b bool)`

 SetNodesNil sets the value for Nodes to be an explicit nil

### UnsetNodes
`func (o *ReportersThreatNodeInfo) UnsetNodes()`

UnsetNodes ensures that no value is present for Nodes, not even an explicit nil
### GetSecretsCount

`func (o *ReportersThreatNodeInfo) GetSecretsCount() int32`

GetSecretsCount returns the SecretsCount field if non-nil, zero value otherwise.

### GetSecretsCountOk

`func (o *ReportersThreatNodeInfo) GetSecretsCountOk() (*int32, bool)`

GetSecretsCountOk returns a tuple with the SecretsCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSecretsCount

`func (o *ReportersThreatNodeInfo) SetSecretsCount(v int32)`

SetSecretsCount sets SecretsCount field to given value.


### GetVulnerabilityCount

`func (o *ReportersThreatNodeInfo) GetVulnerabilityCount() int32`

GetVulnerabilityCount returns the VulnerabilityCount field if non-nil, zero value otherwise.

### GetVulnerabilityCountOk

`func (o *ReportersThreatNodeInfo) GetVulnerabilityCountOk() (*int32, bool)`

GetVulnerabilityCountOk returns a tuple with the VulnerabilityCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVulnerabilityCount

`func (o *ReportersThreatNodeInfo) SetVulnerabilityCount(v int32)`

SetVulnerabilityCount sets VulnerabilityCount field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



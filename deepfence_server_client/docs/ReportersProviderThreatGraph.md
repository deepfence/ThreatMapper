# ReportersProviderThreatGraph

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ComplianceCount** | **int32** |  | 
**Resources** | [**[]ReportersThreatNodeInfo**](ReportersThreatNodeInfo.md) |  | 
**SecretsCount** | **int32** |  | 
**VulnerabilityCount** | **int32** |  | 

## Methods

### NewReportersProviderThreatGraph

`func NewReportersProviderThreatGraph(complianceCount int32, resources []ReportersThreatNodeInfo, secretsCount int32, vulnerabilityCount int32, ) *ReportersProviderThreatGraph`

NewReportersProviderThreatGraph instantiates a new ReportersProviderThreatGraph object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewReportersProviderThreatGraphWithDefaults

`func NewReportersProviderThreatGraphWithDefaults() *ReportersProviderThreatGraph`

NewReportersProviderThreatGraphWithDefaults instantiates a new ReportersProviderThreatGraph object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetComplianceCount

`func (o *ReportersProviderThreatGraph) GetComplianceCount() int32`

GetComplianceCount returns the ComplianceCount field if non-nil, zero value otherwise.

### GetComplianceCountOk

`func (o *ReportersProviderThreatGraph) GetComplianceCountOk() (*int32, bool)`

GetComplianceCountOk returns a tuple with the ComplianceCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetComplianceCount

`func (o *ReportersProviderThreatGraph) SetComplianceCount(v int32)`

SetComplianceCount sets ComplianceCount field to given value.


### GetResources

`func (o *ReportersProviderThreatGraph) GetResources() []ReportersThreatNodeInfo`

GetResources returns the Resources field if non-nil, zero value otherwise.

### GetResourcesOk

`func (o *ReportersProviderThreatGraph) GetResourcesOk() (*[]ReportersThreatNodeInfo, bool)`

GetResourcesOk returns a tuple with the Resources field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResources

`func (o *ReportersProviderThreatGraph) SetResources(v []ReportersThreatNodeInfo)`

SetResources sets Resources field to given value.


### SetResourcesNil

`func (o *ReportersProviderThreatGraph) SetResourcesNil(b bool)`

 SetResourcesNil sets the value for Resources to be an explicit nil

### UnsetResources
`func (o *ReportersProviderThreatGraph) UnsetResources()`

UnsetResources ensures that no value is present for Resources, not even an explicit nil
### GetSecretsCount

`func (o *ReportersProviderThreatGraph) GetSecretsCount() int32`

GetSecretsCount returns the SecretsCount field if non-nil, zero value otherwise.

### GetSecretsCountOk

`func (o *ReportersProviderThreatGraph) GetSecretsCountOk() (*int32, bool)`

GetSecretsCountOk returns a tuple with the SecretsCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSecretsCount

`func (o *ReportersProviderThreatGraph) SetSecretsCount(v int32)`

SetSecretsCount sets SecretsCount field to given value.


### GetVulnerabilityCount

`func (o *ReportersProviderThreatGraph) GetVulnerabilityCount() int32`

GetVulnerabilityCount returns the VulnerabilityCount field if non-nil, zero value otherwise.

### GetVulnerabilityCountOk

`func (o *ReportersProviderThreatGraph) GetVulnerabilityCountOk() (*int32, bool)`

GetVulnerabilityCountOk returns a tuple with the VulnerabilityCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVulnerabilityCount

`func (o *ReportersProviderThreatGraph) SetVulnerabilityCount(v int32)`

SetVulnerabilityCount sets VulnerabilityCount field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



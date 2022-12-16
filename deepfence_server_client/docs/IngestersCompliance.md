# IngestersCompliance

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Timestamp** | Pointer to **string** |  | [optional] 
**ComplianceCheckType** | Pointer to **string** |  | [optional] 
**ComplianceNodeType** | Pointer to **string** |  | [optional] 
**Description** | Pointer to **string** |  | [optional] 
**DocId** | Pointer to **string** |  | [optional] 
**KubernetesClusterId** | Pointer to **string** |  | [optional] 
**KubernetesClusterName** | Pointer to **string** |  | [optional] 
**Masked** | Pointer to **string** |  | [optional] 
**NodeId** | Pointer to **string** |  | [optional] 
**NodeName** | Pointer to **string** |  | [optional] 
**NodeType** | Pointer to **string** |  | [optional] 
**RemediationAnsible** | Pointer to **string** |  | [optional] 
**RemediationPuppet** | Pointer to **string** |  | [optional] 
**RemediationScript** | Pointer to **string** |  | [optional] 
**Resource** | Pointer to **string** |  | [optional] 
**ScanId** | Pointer to **string** |  | [optional] 
**Status** | Pointer to **string** |  | [optional] 
**TestCategory** | Pointer to **string** |  | [optional] 
**TestDesc** | Pointer to **string** |  | [optional] 
**TestNumber** | Pointer to **string** |  | [optional] 
**TestRationale** | Pointer to **string** |  | [optional] 
**TestSeverity** | Pointer to **string** |  | [optional] 
**TimeStamp** | Pointer to **int32** |  | [optional] 
**Type** | Pointer to **string** |  | [optional] 

## Methods

### NewIngestersCompliance

`func NewIngestersCompliance() *IngestersCompliance`

NewIngestersCompliance instantiates a new IngestersCompliance object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewIngestersComplianceWithDefaults

`func NewIngestersComplianceWithDefaults() *IngestersCompliance`

NewIngestersComplianceWithDefaults instantiates a new IngestersCompliance object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTimestamp

`func (o *IngestersCompliance) GetTimestamp() string`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *IngestersCompliance) GetTimestampOk() (*string, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *IngestersCompliance) SetTimestamp(v string)`

SetTimestamp sets Timestamp field to given value.

### HasTimestamp

`func (o *IngestersCompliance) HasTimestamp() bool`

HasTimestamp returns a boolean if a field has been set.

### GetComplianceCheckType

`func (o *IngestersCompliance) GetComplianceCheckType() string`

GetComplianceCheckType returns the ComplianceCheckType field if non-nil, zero value otherwise.

### GetComplianceCheckTypeOk

`func (o *IngestersCompliance) GetComplianceCheckTypeOk() (*string, bool)`

GetComplianceCheckTypeOk returns a tuple with the ComplianceCheckType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetComplianceCheckType

`func (o *IngestersCompliance) SetComplianceCheckType(v string)`

SetComplianceCheckType sets ComplianceCheckType field to given value.

### HasComplianceCheckType

`func (o *IngestersCompliance) HasComplianceCheckType() bool`

HasComplianceCheckType returns a boolean if a field has been set.

### GetComplianceNodeType

`func (o *IngestersCompliance) GetComplianceNodeType() string`

GetComplianceNodeType returns the ComplianceNodeType field if non-nil, zero value otherwise.

### GetComplianceNodeTypeOk

`func (o *IngestersCompliance) GetComplianceNodeTypeOk() (*string, bool)`

GetComplianceNodeTypeOk returns a tuple with the ComplianceNodeType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetComplianceNodeType

`func (o *IngestersCompliance) SetComplianceNodeType(v string)`

SetComplianceNodeType sets ComplianceNodeType field to given value.

### HasComplianceNodeType

`func (o *IngestersCompliance) HasComplianceNodeType() bool`

HasComplianceNodeType returns a boolean if a field has been set.

### GetDescription

`func (o *IngestersCompliance) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *IngestersCompliance) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *IngestersCompliance) SetDescription(v string)`

SetDescription sets Description field to given value.

### HasDescription

`func (o *IngestersCompliance) HasDescription() bool`

HasDescription returns a boolean if a field has been set.

### GetDocId

`func (o *IngestersCompliance) GetDocId() string`

GetDocId returns the DocId field if non-nil, zero value otherwise.

### GetDocIdOk

`func (o *IngestersCompliance) GetDocIdOk() (*string, bool)`

GetDocIdOk returns a tuple with the DocId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDocId

`func (o *IngestersCompliance) SetDocId(v string)`

SetDocId sets DocId field to given value.

### HasDocId

`func (o *IngestersCompliance) HasDocId() bool`

HasDocId returns a boolean if a field has been set.

### GetKubernetesClusterId

`func (o *IngestersCompliance) GetKubernetesClusterId() string`

GetKubernetesClusterId returns the KubernetesClusterId field if non-nil, zero value otherwise.

### GetKubernetesClusterIdOk

`func (o *IngestersCompliance) GetKubernetesClusterIdOk() (*string, bool)`

GetKubernetesClusterIdOk returns a tuple with the KubernetesClusterId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKubernetesClusterId

`func (o *IngestersCompliance) SetKubernetesClusterId(v string)`

SetKubernetesClusterId sets KubernetesClusterId field to given value.

### HasKubernetesClusterId

`func (o *IngestersCompliance) HasKubernetesClusterId() bool`

HasKubernetesClusterId returns a boolean if a field has been set.

### GetKubernetesClusterName

`func (o *IngestersCompliance) GetKubernetesClusterName() string`

GetKubernetesClusterName returns the KubernetesClusterName field if non-nil, zero value otherwise.

### GetKubernetesClusterNameOk

`func (o *IngestersCompliance) GetKubernetesClusterNameOk() (*string, bool)`

GetKubernetesClusterNameOk returns a tuple with the KubernetesClusterName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKubernetesClusterName

`func (o *IngestersCompliance) SetKubernetesClusterName(v string)`

SetKubernetesClusterName sets KubernetesClusterName field to given value.

### HasKubernetesClusterName

`func (o *IngestersCompliance) HasKubernetesClusterName() bool`

HasKubernetesClusterName returns a boolean if a field has been set.

### GetMasked

`func (o *IngestersCompliance) GetMasked() string`

GetMasked returns the Masked field if non-nil, zero value otherwise.

### GetMaskedOk

`func (o *IngestersCompliance) GetMaskedOk() (*string, bool)`

GetMaskedOk returns a tuple with the Masked field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMasked

`func (o *IngestersCompliance) SetMasked(v string)`

SetMasked sets Masked field to given value.

### HasMasked

`func (o *IngestersCompliance) HasMasked() bool`

HasMasked returns a boolean if a field has been set.

### GetNodeId

`func (o *IngestersCompliance) GetNodeId() string`

GetNodeId returns the NodeId field if non-nil, zero value otherwise.

### GetNodeIdOk

`func (o *IngestersCompliance) GetNodeIdOk() (*string, bool)`

GetNodeIdOk returns a tuple with the NodeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeId

`func (o *IngestersCompliance) SetNodeId(v string)`

SetNodeId sets NodeId field to given value.

### HasNodeId

`func (o *IngestersCompliance) HasNodeId() bool`

HasNodeId returns a boolean if a field has been set.

### GetNodeName

`func (o *IngestersCompliance) GetNodeName() string`

GetNodeName returns the NodeName field if non-nil, zero value otherwise.

### GetNodeNameOk

`func (o *IngestersCompliance) GetNodeNameOk() (*string, bool)`

GetNodeNameOk returns a tuple with the NodeName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeName

`func (o *IngestersCompliance) SetNodeName(v string)`

SetNodeName sets NodeName field to given value.

### HasNodeName

`func (o *IngestersCompliance) HasNodeName() bool`

HasNodeName returns a boolean if a field has been set.

### GetNodeType

`func (o *IngestersCompliance) GetNodeType() string`

GetNodeType returns the NodeType field if non-nil, zero value otherwise.

### GetNodeTypeOk

`func (o *IngestersCompliance) GetNodeTypeOk() (*string, bool)`

GetNodeTypeOk returns a tuple with the NodeType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeType

`func (o *IngestersCompliance) SetNodeType(v string)`

SetNodeType sets NodeType field to given value.

### HasNodeType

`func (o *IngestersCompliance) HasNodeType() bool`

HasNodeType returns a boolean if a field has been set.

### GetRemediationAnsible

`func (o *IngestersCompliance) GetRemediationAnsible() string`

GetRemediationAnsible returns the RemediationAnsible field if non-nil, zero value otherwise.

### GetRemediationAnsibleOk

`func (o *IngestersCompliance) GetRemediationAnsibleOk() (*string, bool)`

GetRemediationAnsibleOk returns a tuple with the RemediationAnsible field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRemediationAnsible

`func (o *IngestersCompliance) SetRemediationAnsible(v string)`

SetRemediationAnsible sets RemediationAnsible field to given value.

### HasRemediationAnsible

`func (o *IngestersCompliance) HasRemediationAnsible() bool`

HasRemediationAnsible returns a boolean if a field has been set.

### GetRemediationPuppet

`func (o *IngestersCompliance) GetRemediationPuppet() string`

GetRemediationPuppet returns the RemediationPuppet field if non-nil, zero value otherwise.

### GetRemediationPuppetOk

`func (o *IngestersCompliance) GetRemediationPuppetOk() (*string, bool)`

GetRemediationPuppetOk returns a tuple with the RemediationPuppet field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRemediationPuppet

`func (o *IngestersCompliance) SetRemediationPuppet(v string)`

SetRemediationPuppet sets RemediationPuppet field to given value.

### HasRemediationPuppet

`func (o *IngestersCompliance) HasRemediationPuppet() bool`

HasRemediationPuppet returns a boolean if a field has been set.

### GetRemediationScript

`func (o *IngestersCompliance) GetRemediationScript() string`

GetRemediationScript returns the RemediationScript field if non-nil, zero value otherwise.

### GetRemediationScriptOk

`func (o *IngestersCompliance) GetRemediationScriptOk() (*string, bool)`

GetRemediationScriptOk returns a tuple with the RemediationScript field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRemediationScript

`func (o *IngestersCompliance) SetRemediationScript(v string)`

SetRemediationScript sets RemediationScript field to given value.

### HasRemediationScript

`func (o *IngestersCompliance) HasRemediationScript() bool`

HasRemediationScript returns a boolean if a field has been set.

### GetResource

`func (o *IngestersCompliance) GetResource() string`

GetResource returns the Resource field if non-nil, zero value otherwise.

### GetResourceOk

`func (o *IngestersCompliance) GetResourceOk() (*string, bool)`

GetResourceOk returns a tuple with the Resource field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResource

`func (o *IngestersCompliance) SetResource(v string)`

SetResource sets Resource field to given value.

### HasResource

`func (o *IngestersCompliance) HasResource() bool`

HasResource returns a boolean if a field has been set.

### GetScanId

`func (o *IngestersCompliance) GetScanId() string`

GetScanId returns the ScanId field if non-nil, zero value otherwise.

### GetScanIdOk

`func (o *IngestersCompliance) GetScanIdOk() (*string, bool)`

GetScanIdOk returns a tuple with the ScanId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScanId

`func (o *IngestersCompliance) SetScanId(v string)`

SetScanId sets ScanId field to given value.

### HasScanId

`func (o *IngestersCompliance) HasScanId() bool`

HasScanId returns a boolean if a field has been set.

### GetStatus

`func (o *IngestersCompliance) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *IngestersCompliance) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *IngestersCompliance) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *IngestersCompliance) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetTestCategory

`func (o *IngestersCompliance) GetTestCategory() string`

GetTestCategory returns the TestCategory field if non-nil, zero value otherwise.

### GetTestCategoryOk

`func (o *IngestersCompliance) GetTestCategoryOk() (*string, bool)`

GetTestCategoryOk returns a tuple with the TestCategory field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTestCategory

`func (o *IngestersCompliance) SetTestCategory(v string)`

SetTestCategory sets TestCategory field to given value.

### HasTestCategory

`func (o *IngestersCompliance) HasTestCategory() bool`

HasTestCategory returns a boolean if a field has been set.

### GetTestDesc

`func (o *IngestersCompliance) GetTestDesc() string`

GetTestDesc returns the TestDesc field if non-nil, zero value otherwise.

### GetTestDescOk

`func (o *IngestersCompliance) GetTestDescOk() (*string, bool)`

GetTestDescOk returns a tuple with the TestDesc field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTestDesc

`func (o *IngestersCompliance) SetTestDesc(v string)`

SetTestDesc sets TestDesc field to given value.

### HasTestDesc

`func (o *IngestersCompliance) HasTestDesc() bool`

HasTestDesc returns a boolean if a field has been set.

### GetTestNumber

`func (o *IngestersCompliance) GetTestNumber() string`

GetTestNumber returns the TestNumber field if non-nil, zero value otherwise.

### GetTestNumberOk

`func (o *IngestersCompliance) GetTestNumberOk() (*string, bool)`

GetTestNumberOk returns a tuple with the TestNumber field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTestNumber

`func (o *IngestersCompliance) SetTestNumber(v string)`

SetTestNumber sets TestNumber field to given value.

### HasTestNumber

`func (o *IngestersCompliance) HasTestNumber() bool`

HasTestNumber returns a boolean if a field has been set.

### GetTestRationale

`func (o *IngestersCompliance) GetTestRationale() string`

GetTestRationale returns the TestRationale field if non-nil, zero value otherwise.

### GetTestRationaleOk

`func (o *IngestersCompliance) GetTestRationaleOk() (*string, bool)`

GetTestRationaleOk returns a tuple with the TestRationale field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTestRationale

`func (o *IngestersCompliance) SetTestRationale(v string)`

SetTestRationale sets TestRationale field to given value.

### HasTestRationale

`func (o *IngestersCompliance) HasTestRationale() bool`

HasTestRationale returns a boolean if a field has been set.

### GetTestSeverity

`func (o *IngestersCompliance) GetTestSeverity() string`

GetTestSeverity returns the TestSeverity field if non-nil, zero value otherwise.

### GetTestSeverityOk

`func (o *IngestersCompliance) GetTestSeverityOk() (*string, bool)`

GetTestSeverityOk returns a tuple with the TestSeverity field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTestSeverity

`func (o *IngestersCompliance) SetTestSeverity(v string)`

SetTestSeverity sets TestSeverity field to given value.

### HasTestSeverity

`func (o *IngestersCompliance) HasTestSeverity() bool`

HasTestSeverity returns a boolean if a field has been set.

### GetTimeStamp

`func (o *IngestersCompliance) GetTimeStamp() int32`

GetTimeStamp returns the TimeStamp field if non-nil, zero value otherwise.

### GetTimeStampOk

`func (o *IngestersCompliance) GetTimeStampOk() (*int32, bool)`

GetTimeStampOk returns a tuple with the TimeStamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimeStamp

`func (o *IngestersCompliance) SetTimeStamp(v int32)`

SetTimeStamp sets TimeStamp field to given value.

### HasTimeStamp

`func (o *IngestersCompliance) HasTimeStamp() bool`

HasTimeStamp returns a boolean if a field has been set.

### GetType

`func (o *IngestersCompliance) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *IngestersCompliance) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *IngestersCompliance) SetType(v string)`

SetType sets Type field to given value.

### HasType

`func (o *IngestersCompliance) HasType() bool`

HasType returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



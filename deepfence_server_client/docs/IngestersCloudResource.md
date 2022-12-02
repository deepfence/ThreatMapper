# IngestersCloudResource

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AccountId** | Pointer to **string** |  | [optional] 
**AllowBlobPublicAccess** | Pointer to **string** |  | [optional] 
**Arn** | Pointer to **string** |  | [optional] 
**BlockPublicAcls** | Pointer to **bool** |  | [optional] 
**BlockPublicPolicy** | Pointer to **bool** |  | [optional] 
**BucketPolicyIsPublic** | Pointer to **bool** |  | [optional] 
**CidrIpv4** | Pointer to **string** |  | [optional] 
**ContainerDefinitions** | Pointer to **interface{}** |  | [optional] 
**DbClusterIdentifier** | Pointer to **string** |  | [optional] 
**EventNotificationConfiguration** | Pointer to **interface{}** |  | [optional] 
**GroupId** | Pointer to **string** |  | [optional] 
**IamPolicy** | Pointer to **interface{}** |  | [optional] 
**Id** | Pointer to **string** |  | [optional] 
**IgnorePublicAcls** | Pointer to **bool** |  | [optional] 
**IngressSettings** | Pointer to **interface{}** |  | [optional] 
**InstanceId** | Pointer to **string** |  | [optional] 
**IpConfiguration** | Pointer to **interface{}** |  | [optional] 
**Name** | Pointer to **string** |  | [optional] 
**NetworkInterfaces** | Pointer to **interface{}** |  | [optional] 
**NetworkMode** | Pointer to **string** |  | [optional] 
**Policy** | Pointer to **interface{}** |  | [optional] 
**PolicyStd** | Pointer to **string** |  | [optional] 
**PublicAccess** | Pointer to **string** |  | [optional] 
**PublicIps** | Pointer to **interface{}** |  | [optional] 
**Region** | Pointer to **string** |  | [optional] 
**ResourceId** | Pointer to **string** |  | [optional] 
**ResourceVpcConfig** | Pointer to **interface{}** |  | [optional] 
**RestrictPublicBuckets** | Pointer to **bool** |  | [optional] 
**Scheme** | Pointer to **string** |  | [optional] 
**SecurityGroups** | Pointer to **interface{}** |  | [optional] 
**ServiceName** | Pointer to **string** |  | [optional] 
**TaskDefinition** | Pointer to **interface{}** |  | [optional] 
**TaskDefinitionArn** | Pointer to **string** |  | [optional] 
**VpcId** | Pointer to **string** |  | [optional] 
**VpcOptions** | Pointer to **interface{}** |  | [optional] 
**VpcSecurityGroups** | Pointer to **interface{}** |  | [optional] 

## Methods

### NewIngestersCloudResource

`func NewIngestersCloudResource() *IngestersCloudResource`

NewIngestersCloudResource instantiates a new IngestersCloudResource object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewIngestersCloudResourceWithDefaults

`func NewIngestersCloudResourceWithDefaults() *IngestersCloudResource`

NewIngestersCloudResourceWithDefaults instantiates a new IngestersCloudResource object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAccountId

`func (o *IngestersCloudResource) GetAccountId() string`

GetAccountId returns the AccountId field if non-nil, zero value otherwise.

### GetAccountIdOk

`func (o *IngestersCloudResource) GetAccountIdOk() (*string, bool)`

GetAccountIdOk returns a tuple with the AccountId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAccountId

`func (o *IngestersCloudResource) SetAccountId(v string)`

SetAccountId sets AccountId field to given value.

### HasAccountId

`func (o *IngestersCloudResource) HasAccountId() bool`

HasAccountId returns a boolean if a field has been set.

### GetAllowBlobPublicAccess

`func (o *IngestersCloudResource) GetAllowBlobPublicAccess() string`

GetAllowBlobPublicAccess returns the AllowBlobPublicAccess field if non-nil, zero value otherwise.

### GetAllowBlobPublicAccessOk

`func (o *IngestersCloudResource) GetAllowBlobPublicAccessOk() (*string, bool)`

GetAllowBlobPublicAccessOk returns a tuple with the AllowBlobPublicAccess field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAllowBlobPublicAccess

`func (o *IngestersCloudResource) SetAllowBlobPublicAccess(v string)`

SetAllowBlobPublicAccess sets AllowBlobPublicAccess field to given value.

### HasAllowBlobPublicAccess

`func (o *IngestersCloudResource) HasAllowBlobPublicAccess() bool`

HasAllowBlobPublicAccess returns a boolean if a field has been set.

### GetArn

`func (o *IngestersCloudResource) GetArn() string`

GetArn returns the Arn field if non-nil, zero value otherwise.

### GetArnOk

`func (o *IngestersCloudResource) GetArnOk() (*string, bool)`

GetArnOk returns a tuple with the Arn field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetArn

`func (o *IngestersCloudResource) SetArn(v string)`

SetArn sets Arn field to given value.

### HasArn

`func (o *IngestersCloudResource) HasArn() bool`

HasArn returns a boolean if a field has been set.

### GetBlockPublicAcls

`func (o *IngestersCloudResource) GetBlockPublicAcls() bool`

GetBlockPublicAcls returns the BlockPublicAcls field if non-nil, zero value otherwise.

### GetBlockPublicAclsOk

`func (o *IngestersCloudResource) GetBlockPublicAclsOk() (*bool, bool)`

GetBlockPublicAclsOk returns a tuple with the BlockPublicAcls field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBlockPublicAcls

`func (o *IngestersCloudResource) SetBlockPublicAcls(v bool)`

SetBlockPublicAcls sets BlockPublicAcls field to given value.

### HasBlockPublicAcls

`func (o *IngestersCloudResource) HasBlockPublicAcls() bool`

HasBlockPublicAcls returns a boolean if a field has been set.

### GetBlockPublicPolicy

`func (o *IngestersCloudResource) GetBlockPublicPolicy() bool`

GetBlockPublicPolicy returns the BlockPublicPolicy field if non-nil, zero value otherwise.

### GetBlockPublicPolicyOk

`func (o *IngestersCloudResource) GetBlockPublicPolicyOk() (*bool, bool)`

GetBlockPublicPolicyOk returns a tuple with the BlockPublicPolicy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBlockPublicPolicy

`func (o *IngestersCloudResource) SetBlockPublicPolicy(v bool)`

SetBlockPublicPolicy sets BlockPublicPolicy field to given value.

### HasBlockPublicPolicy

`func (o *IngestersCloudResource) HasBlockPublicPolicy() bool`

HasBlockPublicPolicy returns a boolean if a field has been set.

### GetBucketPolicyIsPublic

`func (o *IngestersCloudResource) GetBucketPolicyIsPublic() bool`

GetBucketPolicyIsPublic returns the BucketPolicyIsPublic field if non-nil, zero value otherwise.

### GetBucketPolicyIsPublicOk

`func (o *IngestersCloudResource) GetBucketPolicyIsPublicOk() (*bool, bool)`

GetBucketPolicyIsPublicOk returns a tuple with the BucketPolicyIsPublic field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBucketPolicyIsPublic

`func (o *IngestersCloudResource) SetBucketPolicyIsPublic(v bool)`

SetBucketPolicyIsPublic sets BucketPolicyIsPublic field to given value.

### HasBucketPolicyIsPublic

`func (o *IngestersCloudResource) HasBucketPolicyIsPublic() bool`

HasBucketPolicyIsPublic returns a boolean if a field has been set.

### GetCidrIpv4

`func (o *IngestersCloudResource) GetCidrIpv4() string`

GetCidrIpv4 returns the CidrIpv4 field if non-nil, zero value otherwise.

### GetCidrIpv4Ok

`func (o *IngestersCloudResource) GetCidrIpv4Ok() (*string, bool)`

GetCidrIpv4Ok returns a tuple with the CidrIpv4 field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCidrIpv4

`func (o *IngestersCloudResource) SetCidrIpv4(v string)`

SetCidrIpv4 sets CidrIpv4 field to given value.

### HasCidrIpv4

`func (o *IngestersCloudResource) HasCidrIpv4() bool`

HasCidrIpv4 returns a boolean if a field has been set.

### GetContainerDefinitions

`func (o *IngestersCloudResource) GetContainerDefinitions() interface{}`

GetContainerDefinitions returns the ContainerDefinitions field if non-nil, zero value otherwise.

### GetContainerDefinitionsOk

`func (o *IngestersCloudResource) GetContainerDefinitionsOk() (*interface{}, bool)`

GetContainerDefinitionsOk returns a tuple with the ContainerDefinitions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContainerDefinitions

`func (o *IngestersCloudResource) SetContainerDefinitions(v interface{})`

SetContainerDefinitions sets ContainerDefinitions field to given value.

### HasContainerDefinitions

`func (o *IngestersCloudResource) HasContainerDefinitions() bool`

HasContainerDefinitions returns a boolean if a field has been set.

### SetContainerDefinitionsNil

`func (o *IngestersCloudResource) SetContainerDefinitionsNil(b bool)`

 SetContainerDefinitionsNil sets the value for ContainerDefinitions to be an explicit nil

### UnsetContainerDefinitions
`func (o *IngestersCloudResource) UnsetContainerDefinitions()`

UnsetContainerDefinitions ensures that no value is present for ContainerDefinitions, not even an explicit nil
### GetDbClusterIdentifier

`func (o *IngestersCloudResource) GetDbClusterIdentifier() string`

GetDbClusterIdentifier returns the DbClusterIdentifier field if non-nil, zero value otherwise.

### GetDbClusterIdentifierOk

`func (o *IngestersCloudResource) GetDbClusterIdentifierOk() (*string, bool)`

GetDbClusterIdentifierOk returns a tuple with the DbClusterIdentifier field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDbClusterIdentifier

`func (o *IngestersCloudResource) SetDbClusterIdentifier(v string)`

SetDbClusterIdentifier sets DbClusterIdentifier field to given value.

### HasDbClusterIdentifier

`func (o *IngestersCloudResource) HasDbClusterIdentifier() bool`

HasDbClusterIdentifier returns a boolean if a field has been set.

### GetEventNotificationConfiguration

`func (o *IngestersCloudResource) GetEventNotificationConfiguration() interface{}`

GetEventNotificationConfiguration returns the EventNotificationConfiguration field if non-nil, zero value otherwise.

### GetEventNotificationConfigurationOk

`func (o *IngestersCloudResource) GetEventNotificationConfigurationOk() (*interface{}, bool)`

GetEventNotificationConfigurationOk returns a tuple with the EventNotificationConfiguration field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventNotificationConfiguration

`func (o *IngestersCloudResource) SetEventNotificationConfiguration(v interface{})`

SetEventNotificationConfiguration sets EventNotificationConfiguration field to given value.

### HasEventNotificationConfiguration

`func (o *IngestersCloudResource) HasEventNotificationConfiguration() bool`

HasEventNotificationConfiguration returns a boolean if a field has been set.

### SetEventNotificationConfigurationNil

`func (o *IngestersCloudResource) SetEventNotificationConfigurationNil(b bool)`

 SetEventNotificationConfigurationNil sets the value for EventNotificationConfiguration to be an explicit nil

### UnsetEventNotificationConfiguration
`func (o *IngestersCloudResource) UnsetEventNotificationConfiguration()`

UnsetEventNotificationConfiguration ensures that no value is present for EventNotificationConfiguration, not even an explicit nil
### GetGroupId

`func (o *IngestersCloudResource) GetGroupId() string`

GetGroupId returns the GroupId field if non-nil, zero value otherwise.

### GetGroupIdOk

`func (o *IngestersCloudResource) GetGroupIdOk() (*string, bool)`

GetGroupIdOk returns a tuple with the GroupId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroupId

`func (o *IngestersCloudResource) SetGroupId(v string)`

SetGroupId sets GroupId field to given value.

### HasGroupId

`func (o *IngestersCloudResource) HasGroupId() bool`

HasGroupId returns a boolean if a field has been set.

### GetIamPolicy

`func (o *IngestersCloudResource) GetIamPolicy() interface{}`

GetIamPolicy returns the IamPolicy field if non-nil, zero value otherwise.

### GetIamPolicyOk

`func (o *IngestersCloudResource) GetIamPolicyOk() (*interface{}, bool)`

GetIamPolicyOk returns a tuple with the IamPolicy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIamPolicy

`func (o *IngestersCloudResource) SetIamPolicy(v interface{})`

SetIamPolicy sets IamPolicy field to given value.

### HasIamPolicy

`func (o *IngestersCloudResource) HasIamPolicy() bool`

HasIamPolicy returns a boolean if a field has been set.

### SetIamPolicyNil

`func (o *IngestersCloudResource) SetIamPolicyNil(b bool)`

 SetIamPolicyNil sets the value for IamPolicy to be an explicit nil

### UnsetIamPolicy
`func (o *IngestersCloudResource) UnsetIamPolicy()`

UnsetIamPolicy ensures that no value is present for IamPolicy, not even an explicit nil
### GetId

`func (o *IngestersCloudResource) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *IngestersCloudResource) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *IngestersCloudResource) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *IngestersCloudResource) HasId() bool`

HasId returns a boolean if a field has been set.

### GetIgnorePublicAcls

`func (o *IngestersCloudResource) GetIgnorePublicAcls() bool`

GetIgnorePublicAcls returns the IgnorePublicAcls field if non-nil, zero value otherwise.

### GetIgnorePublicAclsOk

`func (o *IngestersCloudResource) GetIgnorePublicAclsOk() (*bool, bool)`

GetIgnorePublicAclsOk returns a tuple with the IgnorePublicAcls field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIgnorePublicAcls

`func (o *IngestersCloudResource) SetIgnorePublicAcls(v bool)`

SetIgnorePublicAcls sets IgnorePublicAcls field to given value.

### HasIgnorePublicAcls

`func (o *IngestersCloudResource) HasIgnorePublicAcls() bool`

HasIgnorePublicAcls returns a boolean if a field has been set.

### GetIngressSettings

`func (o *IngestersCloudResource) GetIngressSettings() interface{}`

GetIngressSettings returns the IngressSettings field if non-nil, zero value otherwise.

### GetIngressSettingsOk

`func (o *IngestersCloudResource) GetIngressSettingsOk() (*interface{}, bool)`

GetIngressSettingsOk returns a tuple with the IngressSettings field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIngressSettings

`func (o *IngestersCloudResource) SetIngressSettings(v interface{})`

SetIngressSettings sets IngressSettings field to given value.

### HasIngressSettings

`func (o *IngestersCloudResource) HasIngressSettings() bool`

HasIngressSettings returns a boolean if a field has been set.

### SetIngressSettingsNil

`func (o *IngestersCloudResource) SetIngressSettingsNil(b bool)`

 SetIngressSettingsNil sets the value for IngressSettings to be an explicit nil

### UnsetIngressSettings
`func (o *IngestersCloudResource) UnsetIngressSettings()`

UnsetIngressSettings ensures that no value is present for IngressSettings, not even an explicit nil
### GetInstanceId

`func (o *IngestersCloudResource) GetInstanceId() string`

GetInstanceId returns the InstanceId field if non-nil, zero value otherwise.

### GetInstanceIdOk

`func (o *IngestersCloudResource) GetInstanceIdOk() (*string, bool)`

GetInstanceIdOk returns a tuple with the InstanceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInstanceId

`func (o *IngestersCloudResource) SetInstanceId(v string)`

SetInstanceId sets InstanceId field to given value.

### HasInstanceId

`func (o *IngestersCloudResource) HasInstanceId() bool`

HasInstanceId returns a boolean if a field has been set.

### GetIpConfiguration

`func (o *IngestersCloudResource) GetIpConfiguration() interface{}`

GetIpConfiguration returns the IpConfiguration field if non-nil, zero value otherwise.

### GetIpConfigurationOk

`func (o *IngestersCloudResource) GetIpConfigurationOk() (*interface{}, bool)`

GetIpConfigurationOk returns a tuple with the IpConfiguration field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIpConfiguration

`func (o *IngestersCloudResource) SetIpConfiguration(v interface{})`

SetIpConfiguration sets IpConfiguration field to given value.

### HasIpConfiguration

`func (o *IngestersCloudResource) HasIpConfiguration() bool`

HasIpConfiguration returns a boolean if a field has been set.

### SetIpConfigurationNil

`func (o *IngestersCloudResource) SetIpConfigurationNil(b bool)`

 SetIpConfigurationNil sets the value for IpConfiguration to be an explicit nil

### UnsetIpConfiguration
`func (o *IngestersCloudResource) UnsetIpConfiguration()`

UnsetIpConfiguration ensures that no value is present for IpConfiguration, not even an explicit nil
### GetName

`func (o *IngestersCloudResource) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *IngestersCloudResource) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *IngestersCloudResource) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *IngestersCloudResource) HasName() bool`

HasName returns a boolean if a field has been set.

### GetNetworkInterfaces

`func (o *IngestersCloudResource) GetNetworkInterfaces() interface{}`

GetNetworkInterfaces returns the NetworkInterfaces field if non-nil, zero value otherwise.

### GetNetworkInterfacesOk

`func (o *IngestersCloudResource) GetNetworkInterfacesOk() (*interface{}, bool)`

GetNetworkInterfacesOk returns a tuple with the NetworkInterfaces field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkInterfaces

`func (o *IngestersCloudResource) SetNetworkInterfaces(v interface{})`

SetNetworkInterfaces sets NetworkInterfaces field to given value.

### HasNetworkInterfaces

`func (o *IngestersCloudResource) HasNetworkInterfaces() bool`

HasNetworkInterfaces returns a boolean if a field has been set.

### SetNetworkInterfacesNil

`func (o *IngestersCloudResource) SetNetworkInterfacesNil(b bool)`

 SetNetworkInterfacesNil sets the value for NetworkInterfaces to be an explicit nil

### UnsetNetworkInterfaces
`func (o *IngestersCloudResource) UnsetNetworkInterfaces()`

UnsetNetworkInterfaces ensures that no value is present for NetworkInterfaces, not even an explicit nil
### GetNetworkMode

`func (o *IngestersCloudResource) GetNetworkMode() string`

GetNetworkMode returns the NetworkMode field if non-nil, zero value otherwise.

### GetNetworkModeOk

`func (o *IngestersCloudResource) GetNetworkModeOk() (*string, bool)`

GetNetworkModeOk returns a tuple with the NetworkMode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNetworkMode

`func (o *IngestersCloudResource) SetNetworkMode(v string)`

SetNetworkMode sets NetworkMode field to given value.

### HasNetworkMode

`func (o *IngestersCloudResource) HasNetworkMode() bool`

HasNetworkMode returns a boolean if a field has been set.

### GetPolicy

`func (o *IngestersCloudResource) GetPolicy() interface{}`

GetPolicy returns the Policy field if non-nil, zero value otherwise.

### GetPolicyOk

`func (o *IngestersCloudResource) GetPolicyOk() (*interface{}, bool)`

GetPolicyOk returns a tuple with the Policy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicy

`func (o *IngestersCloudResource) SetPolicy(v interface{})`

SetPolicy sets Policy field to given value.

### HasPolicy

`func (o *IngestersCloudResource) HasPolicy() bool`

HasPolicy returns a boolean if a field has been set.

### SetPolicyNil

`func (o *IngestersCloudResource) SetPolicyNil(b bool)`

 SetPolicyNil sets the value for Policy to be an explicit nil

### UnsetPolicy
`func (o *IngestersCloudResource) UnsetPolicy()`

UnsetPolicy ensures that no value is present for Policy, not even an explicit nil
### GetPolicyStd

`func (o *IngestersCloudResource) GetPolicyStd() string`

GetPolicyStd returns the PolicyStd field if non-nil, zero value otherwise.

### GetPolicyStdOk

`func (o *IngestersCloudResource) GetPolicyStdOk() (*string, bool)`

GetPolicyStdOk returns a tuple with the PolicyStd field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicyStd

`func (o *IngestersCloudResource) SetPolicyStd(v string)`

SetPolicyStd sets PolicyStd field to given value.

### HasPolicyStd

`func (o *IngestersCloudResource) HasPolicyStd() bool`

HasPolicyStd returns a boolean if a field has been set.

### GetPublicAccess

`func (o *IngestersCloudResource) GetPublicAccess() string`

GetPublicAccess returns the PublicAccess field if non-nil, zero value otherwise.

### GetPublicAccessOk

`func (o *IngestersCloudResource) GetPublicAccessOk() (*string, bool)`

GetPublicAccessOk returns a tuple with the PublicAccess field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPublicAccess

`func (o *IngestersCloudResource) SetPublicAccess(v string)`

SetPublicAccess sets PublicAccess field to given value.

### HasPublicAccess

`func (o *IngestersCloudResource) HasPublicAccess() bool`

HasPublicAccess returns a boolean if a field has been set.

### GetPublicIps

`func (o *IngestersCloudResource) GetPublicIps() interface{}`

GetPublicIps returns the PublicIps field if non-nil, zero value otherwise.

### GetPublicIpsOk

`func (o *IngestersCloudResource) GetPublicIpsOk() (*interface{}, bool)`

GetPublicIpsOk returns a tuple with the PublicIps field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPublicIps

`func (o *IngestersCloudResource) SetPublicIps(v interface{})`

SetPublicIps sets PublicIps field to given value.

### HasPublicIps

`func (o *IngestersCloudResource) HasPublicIps() bool`

HasPublicIps returns a boolean if a field has been set.

### SetPublicIpsNil

`func (o *IngestersCloudResource) SetPublicIpsNil(b bool)`

 SetPublicIpsNil sets the value for PublicIps to be an explicit nil

### UnsetPublicIps
`func (o *IngestersCloudResource) UnsetPublicIps()`

UnsetPublicIps ensures that no value is present for PublicIps, not even an explicit nil
### GetRegion

`func (o *IngestersCloudResource) GetRegion() string`

GetRegion returns the Region field if non-nil, zero value otherwise.

### GetRegionOk

`func (o *IngestersCloudResource) GetRegionOk() (*string, bool)`

GetRegionOk returns a tuple with the Region field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRegion

`func (o *IngestersCloudResource) SetRegion(v string)`

SetRegion sets Region field to given value.

### HasRegion

`func (o *IngestersCloudResource) HasRegion() bool`

HasRegion returns a boolean if a field has been set.

### GetResourceId

`func (o *IngestersCloudResource) GetResourceId() string`

GetResourceId returns the ResourceId field if non-nil, zero value otherwise.

### GetResourceIdOk

`func (o *IngestersCloudResource) GetResourceIdOk() (*string, bool)`

GetResourceIdOk returns a tuple with the ResourceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResourceId

`func (o *IngestersCloudResource) SetResourceId(v string)`

SetResourceId sets ResourceId field to given value.

### HasResourceId

`func (o *IngestersCloudResource) HasResourceId() bool`

HasResourceId returns a boolean if a field has been set.

### GetResourceVpcConfig

`func (o *IngestersCloudResource) GetResourceVpcConfig() interface{}`

GetResourceVpcConfig returns the ResourceVpcConfig field if non-nil, zero value otherwise.

### GetResourceVpcConfigOk

`func (o *IngestersCloudResource) GetResourceVpcConfigOk() (*interface{}, bool)`

GetResourceVpcConfigOk returns a tuple with the ResourceVpcConfig field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResourceVpcConfig

`func (o *IngestersCloudResource) SetResourceVpcConfig(v interface{})`

SetResourceVpcConfig sets ResourceVpcConfig field to given value.

### HasResourceVpcConfig

`func (o *IngestersCloudResource) HasResourceVpcConfig() bool`

HasResourceVpcConfig returns a boolean if a field has been set.

### SetResourceVpcConfigNil

`func (o *IngestersCloudResource) SetResourceVpcConfigNil(b bool)`

 SetResourceVpcConfigNil sets the value for ResourceVpcConfig to be an explicit nil

### UnsetResourceVpcConfig
`func (o *IngestersCloudResource) UnsetResourceVpcConfig()`

UnsetResourceVpcConfig ensures that no value is present for ResourceVpcConfig, not even an explicit nil
### GetRestrictPublicBuckets

`func (o *IngestersCloudResource) GetRestrictPublicBuckets() bool`

GetRestrictPublicBuckets returns the RestrictPublicBuckets field if non-nil, zero value otherwise.

### GetRestrictPublicBucketsOk

`func (o *IngestersCloudResource) GetRestrictPublicBucketsOk() (*bool, bool)`

GetRestrictPublicBucketsOk returns a tuple with the RestrictPublicBuckets field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRestrictPublicBuckets

`func (o *IngestersCloudResource) SetRestrictPublicBuckets(v bool)`

SetRestrictPublicBuckets sets RestrictPublicBuckets field to given value.

### HasRestrictPublicBuckets

`func (o *IngestersCloudResource) HasRestrictPublicBuckets() bool`

HasRestrictPublicBuckets returns a boolean if a field has been set.

### GetScheme

`func (o *IngestersCloudResource) GetScheme() string`

GetScheme returns the Scheme field if non-nil, zero value otherwise.

### GetSchemeOk

`func (o *IngestersCloudResource) GetSchemeOk() (*string, bool)`

GetSchemeOk returns a tuple with the Scheme field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScheme

`func (o *IngestersCloudResource) SetScheme(v string)`

SetScheme sets Scheme field to given value.

### HasScheme

`func (o *IngestersCloudResource) HasScheme() bool`

HasScheme returns a boolean if a field has been set.

### GetSecurityGroups

`func (o *IngestersCloudResource) GetSecurityGroups() interface{}`

GetSecurityGroups returns the SecurityGroups field if non-nil, zero value otherwise.

### GetSecurityGroupsOk

`func (o *IngestersCloudResource) GetSecurityGroupsOk() (*interface{}, bool)`

GetSecurityGroupsOk returns a tuple with the SecurityGroups field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSecurityGroups

`func (o *IngestersCloudResource) SetSecurityGroups(v interface{})`

SetSecurityGroups sets SecurityGroups field to given value.

### HasSecurityGroups

`func (o *IngestersCloudResource) HasSecurityGroups() bool`

HasSecurityGroups returns a boolean if a field has been set.

### SetSecurityGroupsNil

`func (o *IngestersCloudResource) SetSecurityGroupsNil(b bool)`

 SetSecurityGroupsNil sets the value for SecurityGroups to be an explicit nil

### UnsetSecurityGroups
`func (o *IngestersCloudResource) UnsetSecurityGroups()`

UnsetSecurityGroups ensures that no value is present for SecurityGroups, not even an explicit nil
### GetServiceName

`func (o *IngestersCloudResource) GetServiceName() string`

GetServiceName returns the ServiceName field if non-nil, zero value otherwise.

### GetServiceNameOk

`func (o *IngestersCloudResource) GetServiceNameOk() (*string, bool)`

GetServiceNameOk returns a tuple with the ServiceName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetServiceName

`func (o *IngestersCloudResource) SetServiceName(v string)`

SetServiceName sets ServiceName field to given value.

### HasServiceName

`func (o *IngestersCloudResource) HasServiceName() bool`

HasServiceName returns a boolean if a field has been set.

### GetTaskDefinition

`func (o *IngestersCloudResource) GetTaskDefinition() interface{}`

GetTaskDefinition returns the TaskDefinition field if non-nil, zero value otherwise.

### GetTaskDefinitionOk

`func (o *IngestersCloudResource) GetTaskDefinitionOk() (*interface{}, bool)`

GetTaskDefinitionOk returns a tuple with the TaskDefinition field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskDefinition

`func (o *IngestersCloudResource) SetTaskDefinition(v interface{})`

SetTaskDefinition sets TaskDefinition field to given value.

### HasTaskDefinition

`func (o *IngestersCloudResource) HasTaskDefinition() bool`

HasTaskDefinition returns a boolean if a field has been set.

### SetTaskDefinitionNil

`func (o *IngestersCloudResource) SetTaskDefinitionNil(b bool)`

 SetTaskDefinitionNil sets the value for TaskDefinition to be an explicit nil

### UnsetTaskDefinition
`func (o *IngestersCloudResource) UnsetTaskDefinition()`

UnsetTaskDefinition ensures that no value is present for TaskDefinition, not even an explicit nil
### GetTaskDefinitionArn

`func (o *IngestersCloudResource) GetTaskDefinitionArn() string`

GetTaskDefinitionArn returns the TaskDefinitionArn field if non-nil, zero value otherwise.

### GetTaskDefinitionArnOk

`func (o *IngestersCloudResource) GetTaskDefinitionArnOk() (*string, bool)`

GetTaskDefinitionArnOk returns a tuple with the TaskDefinitionArn field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTaskDefinitionArn

`func (o *IngestersCloudResource) SetTaskDefinitionArn(v string)`

SetTaskDefinitionArn sets TaskDefinitionArn field to given value.

### HasTaskDefinitionArn

`func (o *IngestersCloudResource) HasTaskDefinitionArn() bool`

HasTaskDefinitionArn returns a boolean if a field has been set.

### GetVpcId

`func (o *IngestersCloudResource) GetVpcId() string`

GetVpcId returns the VpcId field if non-nil, zero value otherwise.

### GetVpcIdOk

`func (o *IngestersCloudResource) GetVpcIdOk() (*string, bool)`

GetVpcIdOk returns a tuple with the VpcId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVpcId

`func (o *IngestersCloudResource) SetVpcId(v string)`

SetVpcId sets VpcId field to given value.

### HasVpcId

`func (o *IngestersCloudResource) HasVpcId() bool`

HasVpcId returns a boolean if a field has been set.

### GetVpcOptions

`func (o *IngestersCloudResource) GetVpcOptions() interface{}`

GetVpcOptions returns the VpcOptions field if non-nil, zero value otherwise.

### GetVpcOptionsOk

`func (o *IngestersCloudResource) GetVpcOptionsOk() (*interface{}, bool)`

GetVpcOptionsOk returns a tuple with the VpcOptions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVpcOptions

`func (o *IngestersCloudResource) SetVpcOptions(v interface{})`

SetVpcOptions sets VpcOptions field to given value.

### HasVpcOptions

`func (o *IngestersCloudResource) HasVpcOptions() bool`

HasVpcOptions returns a boolean if a field has been set.

### SetVpcOptionsNil

`func (o *IngestersCloudResource) SetVpcOptionsNil(b bool)`

 SetVpcOptionsNil sets the value for VpcOptions to be an explicit nil

### UnsetVpcOptions
`func (o *IngestersCloudResource) UnsetVpcOptions()`

UnsetVpcOptions ensures that no value is present for VpcOptions, not even an explicit nil
### GetVpcSecurityGroups

`func (o *IngestersCloudResource) GetVpcSecurityGroups() interface{}`

GetVpcSecurityGroups returns the VpcSecurityGroups field if non-nil, zero value otherwise.

### GetVpcSecurityGroupsOk

`func (o *IngestersCloudResource) GetVpcSecurityGroupsOk() (*interface{}, bool)`

GetVpcSecurityGroupsOk returns a tuple with the VpcSecurityGroups field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVpcSecurityGroups

`func (o *IngestersCloudResource) SetVpcSecurityGroups(v interface{})`

SetVpcSecurityGroups sets VpcSecurityGroups field to given value.

### HasVpcSecurityGroups

`func (o *IngestersCloudResource) HasVpcSecurityGroups() bool`

HasVpcSecurityGroups returns a boolean if a field has been set.

### SetVpcSecurityGroupsNil

`func (o *IngestersCloudResource) SetVpcSecurityGroupsNil(b bool)`

 SetVpcSecurityGroupsNil sets the value for VpcSecurityGroups to be an explicit nil

### UnsetVpcSecurityGroups
`func (o *IngestersCloudResource) UnsetVpcSecurityGroups()`

UnsetVpcSecurityGroups ensures that no value is present for VpcSecurityGroups, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



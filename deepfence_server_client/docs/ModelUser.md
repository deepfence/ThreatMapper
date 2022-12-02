# ModelUser

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Company** | Pointer to **string** |  | [optional] 
**CompanyId** | Pointer to **int32** |  | [optional] 
**Email** | Pointer to **string** |  | [optional] 
**FirstName** | Pointer to **string** |  | [optional] 
**Groups** | Pointer to **map[string]string** |  | [optional] 
**Id** | Pointer to **int32** |  | [optional] 
**IsActive** | Pointer to **bool** |  | [optional] 
**LastName** | Pointer to **string** |  | [optional] 
**PasswordInvalidated** | Pointer to **bool** |  | [optional] 
**Role** | Pointer to **string** |  | [optional] 
**RoleId** | Pointer to **int32** |  | [optional] 

## Methods

### NewModelUser

`func NewModelUser() *ModelUser`

NewModelUser instantiates a new ModelUser object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelUserWithDefaults

`func NewModelUserWithDefaults() *ModelUser`

NewModelUserWithDefaults instantiates a new ModelUser object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCompany

`func (o *ModelUser) GetCompany() string`

GetCompany returns the Company field if non-nil, zero value otherwise.

### GetCompanyOk

`func (o *ModelUser) GetCompanyOk() (*string, bool)`

GetCompanyOk returns a tuple with the Company field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCompany

`func (o *ModelUser) SetCompany(v string)`

SetCompany sets Company field to given value.

### HasCompany

`func (o *ModelUser) HasCompany() bool`

HasCompany returns a boolean if a field has been set.

### GetCompanyId

`func (o *ModelUser) GetCompanyId() int32`

GetCompanyId returns the CompanyId field if non-nil, zero value otherwise.

### GetCompanyIdOk

`func (o *ModelUser) GetCompanyIdOk() (*int32, bool)`

GetCompanyIdOk returns a tuple with the CompanyId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCompanyId

`func (o *ModelUser) SetCompanyId(v int32)`

SetCompanyId sets CompanyId field to given value.

### HasCompanyId

`func (o *ModelUser) HasCompanyId() bool`

HasCompanyId returns a boolean if a field has been set.

### GetEmail

`func (o *ModelUser) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *ModelUser) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *ModelUser) SetEmail(v string)`

SetEmail sets Email field to given value.

### HasEmail

`func (o *ModelUser) HasEmail() bool`

HasEmail returns a boolean if a field has been set.

### GetFirstName

`func (o *ModelUser) GetFirstName() string`

GetFirstName returns the FirstName field if non-nil, zero value otherwise.

### GetFirstNameOk

`func (o *ModelUser) GetFirstNameOk() (*string, bool)`

GetFirstNameOk returns a tuple with the FirstName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFirstName

`func (o *ModelUser) SetFirstName(v string)`

SetFirstName sets FirstName field to given value.

### HasFirstName

`func (o *ModelUser) HasFirstName() bool`

HasFirstName returns a boolean if a field has been set.

### GetGroups

`func (o *ModelUser) GetGroups() map[string]string`

GetGroups returns the Groups field if non-nil, zero value otherwise.

### GetGroupsOk

`func (o *ModelUser) GetGroupsOk() (*map[string]string, bool)`

GetGroupsOk returns a tuple with the Groups field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroups

`func (o *ModelUser) SetGroups(v map[string]string)`

SetGroups sets Groups field to given value.

### HasGroups

`func (o *ModelUser) HasGroups() bool`

HasGroups returns a boolean if a field has been set.

### SetGroupsNil

`func (o *ModelUser) SetGroupsNil(b bool)`

 SetGroupsNil sets the value for Groups to be an explicit nil

### UnsetGroups
`func (o *ModelUser) UnsetGroups()`

UnsetGroups ensures that no value is present for Groups, not even an explicit nil
### GetId

`func (o *ModelUser) GetId() int32`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *ModelUser) GetIdOk() (*int32, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *ModelUser) SetId(v int32)`

SetId sets Id field to given value.

### HasId

`func (o *ModelUser) HasId() bool`

HasId returns a boolean if a field has been set.

### GetIsActive

`func (o *ModelUser) GetIsActive() bool`

GetIsActive returns the IsActive field if non-nil, zero value otherwise.

### GetIsActiveOk

`func (o *ModelUser) GetIsActiveOk() (*bool, bool)`

GetIsActiveOk returns a tuple with the IsActive field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsActive

`func (o *ModelUser) SetIsActive(v bool)`

SetIsActive sets IsActive field to given value.

### HasIsActive

`func (o *ModelUser) HasIsActive() bool`

HasIsActive returns a boolean if a field has been set.

### GetLastName

`func (o *ModelUser) GetLastName() string`

GetLastName returns the LastName field if non-nil, zero value otherwise.

### GetLastNameOk

`func (o *ModelUser) GetLastNameOk() (*string, bool)`

GetLastNameOk returns a tuple with the LastName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastName

`func (o *ModelUser) SetLastName(v string)`

SetLastName sets LastName field to given value.

### HasLastName

`func (o *ModelUser) HasLastName() bool`

HasLastName returns a boolean if a field has been set.

### GetPasswordInvalidated

`func (o *ModelUser) GetPasswordInvalidated() bool`

GetPasswordInvalidated returns the PasswordInvalidated field if non-nil, zero value otherwise.

### GetPasswordInvalidatedOk

`func (o *ModelUser) GetPasswordInvalidatedOk() (*bool, bool)`

GetPasswordInvalidatedOk returns a tuple with the PasswordInvalidated field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPasswordInvalidated

`func (o *ModelUser) SetPasswordInvalidated(v bool)`

SetPasswordInvalidated sets PasswordInvalidated field to given value.

### HasPasswordInvalidated

`func (o *ModelUser) HasPasswordInvalidated() bool`

HasPasswordInvalidated returns a boolean if a field has been set.

### GetRole

`func (o *ModelUser) GetRole() string`

GetRole returns the Role field if non-nil, zero value otherwise.

### GetRoleOk

`func (o *ModelUser) GetRoleOk() (*string, bool)`

GetRoleOk returns a tuple with the Role field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRole

`func (o *ModelUser) SetRole(v string)`

SetRole sets Role field to given value.

### HasRole

`func (o *ModelUser) HasRole() bool`

HasRole returns a boolean if a field has been set.

### GetRoleId

`func (o *ModelUser) GetRoleId() int32`

GetRoleId returns the RoleId field if non-nil, zero value otherwise.

### GetRoleIdOk

`func (o *ModelUser) GetRoleIdOk() (*int32, bool)`

GetRoleIdOk returns a tuple with the RoleId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRoleId

`func (o *ModelUser) SetRoleId(v int32)`

SetRoleId sets RoleId field to given value.

### HasRoleId

`func (o *ModelUser) HasRoleId() bool`

HasRoleId returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



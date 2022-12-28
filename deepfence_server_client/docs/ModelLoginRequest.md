# ModelLoginRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Email** | **string** |  | 
**Password** | **string** |  | 

## Methods

### NewModelLoginRequest

`func NewModelLoginRequest(email string, password string, ) *ModelLoginRequest`

NewModelLoginRequest instantiates a new ModelLoginRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelLoginRequestWithDefaults

`func NewModelLoginRequestWithDefaults() *ModelLoginRequest`

NewModelLoginRequestWithDefaults instantiates a new ModelLoginRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEmail

`func (o *ModelLoginRequest) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *ModelLoginRequest) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *ModelLoginRequest) SetEmail(v string)`

SetEmail sets Email field to given value.


### GetPassword

`func (o *ModelLoginRequest) GetPassword() string`

GetPassword returns the Password field if non-nil, zero value otherwise.

### GetPasswordOk

`func (o *ModelLoginRequest) GetPasswordOk() (*string, bool)`

GetPasswordOk returns a tuple with the Password field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPassword

`func (o *ModelLoginRequest) SetPassword(v string)`

SetPassword sets Password field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



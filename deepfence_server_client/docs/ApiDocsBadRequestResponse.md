# ApiDocsBadRequestResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ErrorFields** | Pointer to **map[string]string** |  | [optional] 
**Message** | Pointer to **string** |  | [optional] 
**Success** | Pointer to **bool** |  | [optional] 

## Methods

### NewApiDocsBadRequestResponse

`func NewApiDocsBadRequestResponse() *ApiDocsBadRequestResponse`

NewApiDocsBadRequestResponse instantiates a new ApiDocsBadRequestResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewApiDocsBadRequestResponseWithDefaults

`func NewApiDocsBadRequestResponseWithDefaults() *ApiDocsBadRequestResponse`

NewApiDocsBadRequestResponseWithDefaults instantiates a new ApiDocsBadRequestResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetErrorFields

`func (o *ApiDocsBadRequestResponse) GetErrorFields() map[string]string`

GetErrorFields returns the ErrorFields field if non-nil, zero value otherwise.

### GetErrorFieldsOk

`func (o *ApiDocsBadRequestResponse) GetErrorFieldsOk() (*map[string]string, bool)`

GetErrorFieldsOk returns a tuple with the ErrorFields field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetErrorFields

`func (o *ApiDocsBadRequestResponse) SetErrorFields(v map[string]string)`

SetErrorFields sets ErrorFields field to given value.

### HasErrorFields

`func (o *ApiDocsBadRequestResponse) HasErrorFields() bool`

HasErrorFields returns a boolean if a field has been set.

### SetErrorFieldsNil

`func (o *ApiDocsBadRequestResponse) SetErrorFieldsNil(b bool)`

 SetErrorFieldsNil sets the value for ErrorFields to be an explicit nil

### UnsetErrorFields
`func (o *ApiDocsBadRequestResponse) UnsetErrorFields()`

UnsetErrorFields ensures that no value is present for ErrorFields, not even an explicit nil
### GetMessage

`func (o *ApiDocsBadRequestResponse) GetMessage() string`

GetMessage returns the Message field if non-nil, zero value otherwise.

### GetMessageOk

`func (o *ApiDocsBadRequestResponse) GetMessageOk() (*string, bool)`

GetMessageOk returns a tuple with the Message field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMessage

`func (o *ApiDocsBadRequestResponse) SetMessage(v string)`

SetMessage sets Message field to given value.

### HasMessage

`func (o *ApiDocsBadRequestResponse) HasMessage() bool`

HasMessage returns a boolean if a field has been set.

### GetSuccess

`func (o *ApiDocsBadRequestResponse) GetSuccess() bool`

GetSuccess returns the Success field if non-nil, zero value otherwise.

### GetSuccessOk

`func (o *ApiDocsBadRequestResponse) GetSuccessOk() (*bool, bool)`

GetSuccessOk returns a tuple with the Success field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSuccess

`func (o *ApiDocsBadRequestResponse) SetSuccess(v bool)`

SetSuccess sets Success field to given value.

### HasSuccess

`func (o *ApiDocsBadRequestResponse) HasSuccess() bool`

HasSuccess returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



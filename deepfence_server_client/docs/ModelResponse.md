# ModelResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Data** | Pointer to [**ModelResponseAccessToken**](ModelResponseAccessToken.md) |  | [optional] 
**ErrorFields** | Pointer to **map[string]string** |  | [optional] 
**Message** | Pointer to **string** |  | [optional] 
**Success** | Pointer to **bool** |  | [optional] 

## Methods

### NewModelResponse

`func NewModelResponse() *ModelResponse`

NewModelResponse instantiates a new ModelResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewModelResponseWithDefaults

`func NewModelResponseWithDefaults() *ModelResponse`

NewModelResponseWithDefaults instantiates a new ModelResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetData

`func (o *ModelResponse) GetData() ModelResponseAccessToken`

GetData returns the Data field if non-nil, zero value otherwise.

### GetDataOk

`func (o *ModelResponse) GetDataOk() (*ModelResponseAccessToken, bool)`

GetDataOk returns a tuple with the Data field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetData

`func (o *ModelResponse) SetData(v ModelResponseAccessToken)`

SetData sets Data field to given value.

### HasData

`func (o *ModelResponse) HasData() bool`

HasData returns a boolean if a field has been set.

### GetErrorFields

`func (o *ModelResponse) GetErrorFields() map[string]string`

GetErrorFields returns the ErrorFields field if non-nil, zero value otherwise.

### GetErrorFieldsOk

`func (o *ModelResponse) GetErrorFieldsOk() (*map[string]string, bool)`

GetErrorFieldsOk returns a tuple with the ErrorFields field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetErrorFields

`func (o *ModelResponse) SetErrorFields(v map[string]string)`

SetErrorFields sets ErrorFields field to given value.

### HasErrorFields

`func (o *ModelResponse) HasErrorFields() bool`

HasErrorFields returns a boolean if a field has been set.

### SetErrorFieldsNil

`func (o *ModelResponse) SetErrorFieldsNil(b bool)`

 SetErrorFieldsNil sets the value for ErrorFields to be an explicit nil

### UnsetErrorFields
`func (o *ModelResponse) UnsetErrorFields()`

UnsetErrorFields ensures that no value is present for ErrorFields, not even an explicit nil
### GetMessage

`func (o *ModelResponse) GetMessage() string`

GetMessage returns the Message field if non-nil, zero value otherwise.

### GetMessageOk

`func (o *ModelResponse) GetMessageOk() (*string, bool)`

GetMessageOk returns a tuple with the Message field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMessage

`func (o *ModelResponse) SetMessage(v string)`

SetMessage sets Message field to given value.

### HasMessage

`func (o *ModelResponse) HasMessage() bool`

HasMessage returns a boolean if a field has been set.

### GetSuccess

`func (o *ModelResponse) GetSuccess() bool`

GetSuccess returns the Success field if non-nil, zero value otherwise.

### GetSuccessOk

`func (o *ModelResponse) GetSuccessOk() (*bool, bool)`

GetSuccessOk returns a tuple with the Success field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSuccess

`func (o *ModelResponse) SetSuccess(v bool)`

SetSuccess sets Success field to given value.

### HasSuccess

`func (o *ModelResponse) HasSuccess() bool`

HasSuccess returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



# ControlsAgentControls

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Beatrate** | **int32** |  | 
**Commands** | [**[]ControlsAction**](ControlsAction.md) |  | 

## Methods

### NewControlsAgentControls

`func NewControlsAgentControls(beatrate int32, commands []ControlsAction, ) *ControlsAgentControls`

NewControlsAgentControls instantiates a new ControlsAgentControls object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewControlsAgentControlsWithDefaults

`func NewControlsAgentControlsWithDefaults() *ControlsAgentControls`

NewControlsAgentControlsWithDefaults instantiates a new ControlsAgentControls object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetBeatrate

`func (o *ControlsAgentControls) GetBeatrate() int32`

GetBeatrate returns the Beatrate field if non-nil, zero value otherwise.

### GetBeatrateOk

`func (o *ControlsAgentControls) GetBeatrateOk() (*int32, bool)`

GetBeatrateOk returns a tuple with the Beatrate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBeatrate

`func (o *ControlsAgentControls) SetBeatrate(v int32)`

SetBeatrate sets Beatrate field to given value.


### GetCommands

`func (o *ControlsAgentControls) GetCommands() []ControlsAction`

GetCommands returns the Commands field if non-nil, zero value otherwise.

### GetCommandsOk

`func (o *ControlsAgentControls) GetCommandsOk() (*[]ControlsAction, bool)`

GetCommandsOk returns a tuple with the Commands field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCommands

`func (o *ControlsAgentControls) SetCommands(v []ControlsAction)`

SetCommands sets Commands field to given value.


### SetCommandsNil

`func (o *ControlsAgentControls) SetCommandsNil(b bool)`

 SetCommandsNil sets the value for Commands to be an explicit nil

### UnsetCommands
`func (o *ControlsAgentControls) UnsetCommands()`

UnsetCommands ensures that no value is present for Commands, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



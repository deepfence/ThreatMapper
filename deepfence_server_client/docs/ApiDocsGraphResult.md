# ApiDocsGraphResult

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Edges** | [**map[string]DetailedConnectionSummary**](DetailedConnectionSummary.md) |  | 
**Nodes** | [**map[string]DetailedNodeSummary**](DetailedNodeSummary.md) |  | 

## Methods

### NewApiDocsGraphResult

`func NewApiDocsGraphResult(edges map[string]DetailedConnectionSummary, nodes map[string]DetailedNodeSummary, ) *ApiDocsGraphResult`

NewApiDocsGraphResult instantiates a new ApiDocsGraphResult object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewApiDocsGraphResultWithDefaults

`func NewApiDocsGraphResultWithDefaults() *ApiDocsGraphResult`

NewApiDocsGraphResultWithDefaults instantiates a new ApiDocsGraphResult object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEdges

`func (o *ApiDocsGraphResult) GetEdges() map[string]DetailedConnectionSummary`

GetEdges returns the Edges field if non-nil, zero value otherwise.

### GetEdgesOk

`func (o *ApiDocsGraphResult) GetEdgesOk() (*map[string]DetailedConnectionSummary, bool)`

GetEdgesOk returns a tuple with the Edges field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEdges

`func (o *ApiDocsGraphResult) SetEdges(v map[string]DetailedConnectionSummary)`

SetEdges sets Edges field to given value.


### GetNodes

`func (o *ApiDocsGraphResult) GetNodes() map[string]DetailedNodeSummary`

GetNodes returns the Nodes field if non-nil, zero value otherwise.

### GetNodesOk

`func (o *ApiDocsGraphResult) GetNodesOk() (*map[string]DetailedNodeSummary, bool)`

GetNodesOk returns a tuple with the Nodes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodes

`func (o *ApiDocsGraphResult) SetNodes(v map[string]DetailedNodeSummary)`

SetNodes sets Nodes field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



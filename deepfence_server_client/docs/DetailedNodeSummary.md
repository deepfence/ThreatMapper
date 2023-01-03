# DetailedNodeSummary

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Adjacency** | Pointer to **[]string** |  | [optional] 
**Id** | Pointer to **string** |  | [optional] 
**Image** | Pointer to **string** |  | [optional] 
**ImmediateParentId** | Pointer to **string** |  | [optional] 
**Label** | Pointer to **string** |  | [optional] 
**LabelMinor** | Pointer to **string** |  | [optional] 
**Metadata** | Pointer to [**[]ReportMetadataRow**](ReportMetadataRow.md) |  | [optional] 
**Metrics** | Pointer to **[]map[string]interface{}** |  | [optional] 
**Parents** | Pointer to [**[]DetailedParent**](DetailedParent.md) |  | [optional] 
**Pseudo** | Pointer to **bool** |  | [optional] 
**Rank** | Pointer to **string** |  | [optional] 
**Shape** | Pointer to **string** |  | [optional] 
**Stack** | Pointer to **bool** |  | [optional] 
**Tables** | Pointer to [**[]ReportTable**](ReportTable.md) |  | [optional] 
**Tag** | Pointer to **string** |  | [optional] 
**Type** | Pointer to **string** |  | [optional] 

## Methods

### NewDetailedNodeSummary

`func NewDetailedNodeSummary() *DetailedNodeSummary`

NewDetailedNodeSummary instantiates a new DetailedNodeSummary object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewDetailedNodeSummaryWithDefaults

`func NewDetailedNodeSummaryWithDefaults() *DetailedNodeSummary`

NewDetailedNodeSummaryWithDefaults instantiates a new DetailedNodeSummary object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAdjacency

`func (o *DetailedNodeSummary) GetAdjacency() []string`

GetAdjacency returns the Adjacency field if non-nil, zero value otherwise.

### GetAdjacencyOk

`func (o *DetailedNodeSummary) GetAdjacencyOk() (*[]string, bool)`

GetAdjacencyOk returns a tuple with the Adjacency field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAdjacency

`func (o *DetailedNodeSummary) SetAdjacency(v []string)`

SetAdjacency sets Adjacency field to given value.

### HasAdjacency

`func (o *DetailedNodeSummary) HasAdjacency() bool`

HasAdjacency returns a boolean if a field has been set.

### GetId

`func (o *DetailedNodeSummary) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *DetailedNodeSummary) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *DetailedNodeSummary) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *DetailedNodeSummary) HasId() bool`

HasId returns a boolean if a field has been set.

### GetImage

`func (o *DetailedNodeSummary) GetImage() string`

GetImage returns the Image field if non-nil, zero value otherwise.

### GetImageOk

`func (o *DetailedNodeSummary) GetImageOk() (*string, bool)`

GetImageOk returns a tuple with the Image field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetImage

`func (o *DetailedNodeSummary) SetImage(v string)`

SetImage sets Image field to given value.

### HasImage

`func (o *DetailedNodeSummary) HasImage() bool`

HasImage returns a boolean if a field has been set.

### GetImmediateParentId

`func (o *DetailedNodeSummary) GetImmediateParentId() string`

GetImmediateParentId returns the ImmediateParentId field if non-nil, zero value otherwise.

### GetImmediateParentIdOk

`func (o *DetailedNodeSummary) GetImmediateParentIdOk() (*string, bool)`

GetImmediateParentIdOk returns a tuple with the ImmediateParentId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetImmediateParentId

`func (o *DetailedNodeSummary) SetImmediateParentId(v string)`

SetImmediateParentId sets ImmediateParentId field to given value.

### HasImmediateParentId

`func (o *DetailedNodeSummary) HasImmediateParentId() bool`

HasImmediateParentId returns a boolean if a field has been set.

### GetLabel

`func (o *DetailedNodeSummary) GetLabel() string`

GetLabel returns the Label field if non-nil, zero value otherwise.

### GetLabelOk

`func (o *DetailedNodeSummary) GetLabelOk() (*string, bool)`

GetLabelOk returns a tuple with the Label field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLabel

`func (o *DetailedNodeSummary) SetLabel(v string)`

SetLabel sets Label field to given value.

### HasLabel

`func (o *DetailedNodeSummary) HasLabel() bool`

HasLabel returns a boolean if a field has been set.

### GetLabelMinor

`func (o *DetailedNodeSummary) GetLabelMinor() string`

GetLabelMinor returns the LabelMinor field if non-nil, zero value otherwise.

### GetLabelMinorOk

`func (o *DetailedNodeSummary) GetLabelMinorOk() (*string, bool)`

GetLabelMinorOk returns a tuple with the LabelMinor field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLabelMinor

`func (o *DetailedNodeSummary) SetLabelMinor(v string)`

SetLabelMinor sets LabelMinor field to given value.

### HasLabelMinor

`func (o *DetailedNodeSummary) HasLabelMinor() bool`

HasLabelMinor returns a boolean if a field has been set.

### GetMetadata

`func (o *DetailedNodeSummary) GetMetadata() []ReportMetadataRow`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *DetailedNodeSummary) GetMetadataOk() (*[]ReportMetadataRow, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *DetailedNodeSummary) SetMetadata(v []ReportMetadataRow)`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *DetailedNodeSummary) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### GetMetrics

`func (o *DetailedNodeSummary) GetMetrics() []map[string]interface{}`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *DetailedNodeSummary) GetMetricsOk() (*[]map[string]interface{}, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *DetailedNodeSummary) SetMetrics(v []map[string]interface{})`

SetMetrics sets Metrics field to given value.

### HasMetrics

`func (o *DetailedNodeSummary) HasMetrics() bool`

HasMetrics returns a boolean if a field has been set.

### GetParents

`func (o *DetailedNodeSummary) GetParents() []DetailedParent`

GetParents returns the Parents field if non-nil, zero value otherwise.

### GetParentsOk

`func (o *DetailedNodeSummary) GetParentsOk() (*[]DetailedParent, bool)`

GetParentsOk returns a tuple with the Parents field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParents

`func (o *DetailedNodeSummary) SetParents(v []DetailedParent)`

SetParents sets Parents field to given value.

### HasParents

`func (o *DetailedNodeSummary) HasParents() bool`

HasParents returns a boolean if a field has been set.

### GetPseudo

`func (o *DetailedNodeSummary) GetPseudo() bool`

GetPseudo returns the Pseudo field if non-nil, zero value otherwise.

### GetPseudoOk

`func (o *DetailedNodeSummary) GetPseudoOk() (*bool, bool)`

GetPseudoOk returns a tuple with the Pseudo field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPseudo

`func (o *DetailedNodeSummary) SetPseudo(v bool)`

SetPseudo sets Pseudo field to given value.

### HasPseudo

`func (o *DetailedNodeSummary) HasPseudo() bool`

HasPseudo returns a boolean if a field has been set.

### GetRank

`func (o *DetailedNodeSummary) GetRank() string`

GetRank returns the Rank field if non-nil, zero value otherwise.

### GetRankOk

`func (o *DetailedNodeSummary) GetRankOk() (*string, bool)`

GetRankOk returns a tuple with the Rank field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRank

`func (o *DetailedNodeSummary) SetRank(v string)`

SetRank sets Rank field to given value.

### HasRank

`func (o *DetailedNodeSummary) HasRank() bool`

HasRank returns a boolean if a field has been set.

### GetShape

`func (o *DetailedNodeSummary) GetShape() string`

GetShape returns the Shape field if non-nil, zero value otherwise.

### GetShapeOk

`func (o *DetailedNodeSummary) GetShapeOk() (*string, bool)`

GetShapeOk returns a tuple with the Shape field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetShape

`func (o *DetailedNodeSummary) SetShape(v string)`

SetShape sets Shape field to given value.

### HasShape

`func (o *DetailedNodeSummary) HasShape() bool`

HasShape returns a boolean if a field has been set.

### GetStack

`func (o *DetailedNodeSummary) GetStack() bool`

GetStack returns the Stack field if non-nil, zero value otherwise.

### GetStackOk

`func (o *DetailedNodeSummary) GetStackOk() (*bool, bool)`

GetStackOk returns a tuple with the Stack field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStack

`func (o *DetailedNodeSummary) SetStack(v bool)`

SetStack sets Stack field to given value.

### HasStack

`func (o *DetailedNodeSummary) HasStack() bool`

HasStack returns a boolean if a field has been set.

### GetTables

`func (o *DetailedNodeSummary) GetTables() []ReportTable`

GetTables returns the Tables field if non-nil, zero value otherwise.

### GetTablesOk

`func (o *DetailedNodeSummary) GetTablesOk() (*[]ReportTable, bool)`

GetTablesOk returns a tuple with the Tables field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTables

`func (o *DetailedNodeSummary) SetTables(v []ReportTable)`

SetTables sets Tables field to given value.

### HasTables

`func (o *DetailedNodeSummary) HasTables() bool`

HasTables returns a boolean if a field has been set.

### GetTag

`func (o *DetailedNodeSummary) GetTag() string`

GetTag returns the Tag field if non-nil, zero value otherwise.

### GetTagOk

`func (o *DetailedNodeSummary) GetTagOk() (*string, bool)`

GetTagOk returns a tuple with the Tag field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTag

`func (o *DetailedNodeSummary) SetTag(v string)`

SetTag sets Tag field to given value.

### HasTag

`func (o *DetailedNodeSummary) HasTag() bool`

HasTag returns a boolean if a field has been set.

### GetType

`func (o *DetailedNodeSummary) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *DetailedNodeSummary) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *DetailedNodeSummary) SetType(v string)`

SetType sets Type field to given value.

### HasType

`func (o *DetailedNodeSummary) HasType() bool`

HasType returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



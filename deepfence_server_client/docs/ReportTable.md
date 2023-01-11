# ReportTable

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Columns** | Pointer to [**[]ReportColumn**](ReportColumn.md) |  | [optional] 
**Id** | Pointer to **string** |  | [optional] 
**Label** | Pointer to **string** |  | [optional] 
**Rows** | Pointer to [**[]ReportRow**](ReportRow.md) |  | [optional] 
**TruncationCount** | Pointer to **int32** |  | [optional] 
**Type** | Pointer to **string** |  | [optional] 

## Methods

### NewReportTable

`func NewReportTable() *ReportTable`

NewReportTable instantiates a new ReportTable object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewReportTableWithDefaults

`func NewReportTableWithDefaults() *ReportTable`

NewReportTableWithDefaults instantiates a new ReportTable object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetColumns

`func (o *ReportTable) GetColumns() []ReportColumn`

GetColumns returns the Columns field if non-nil, zero value otherwise.

### GetColumnsOk

`func (o *ReportTable) GetColumnsOk() (*[]ReportColumn, bool)`

GetColumnsOk returns a tuple with the Columns field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetColumns

`func (o *ReportTable) SetColumns(v []ReportColumn)`

SetColumns sets Columns field to given value.

### HasColumns

`func (o *ReportTable) HasColumns() bool`

HasColumns returns a boolean if a field has been set.

### SetColumnsNil

`func (o *ReportTable) SetColumnsNil(b bool)`

 SetColumnsNil sets the value for Columns to be an explicit nil

### UnsetColumns
`func (o *ReportTable) UnsetColumns()`

UnsetColumns ensures that no value is present for Columns, not even an explicit nil
### GetId

`func (o *ReportTable) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *ReportTable) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *ReportTable) SetId(v string)`

SetId sets Id field to given value.

### HasId

`func (o *ReportTable) HasId() bool`

HasId returns a boolean if a field has been set.

### GetLabel

`func (o *ReportTable) GetLabel() string`

GetLabel returns the Label field if non-nil, zero value otherwise.

### GetLabelOk

`func (o *ReportTable) GetLabelOk() (*string, bool)`

GetLabelOk returns a tuple with the Label field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLabel

`func (o *ReportTable) SetLabel(v string)`

SetLabel sets Label field to given value.

### HasLabel

`func (o *ReportTable) HasLabel() bool`

HasLabel returns a boolean if a field has been set.

### GetRows

`func (o *ReportTable) GetRows() []ReportRow`

GetRows returns the Rows field if non-nil, zero value otherwise.

### GetRowsOk

`func (o *ReportTable) GetRowsOk() (*[]ReportRow, bool)`

GetRowsOk returns a tuple with the Rows field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRows

`func (o *ReportTable) SetRows(v []ReportRow)`

SetRows sets Rows field to given value.

### HasRows

`func (o *ReportTable) HasRows() bool`

HasRows returns a boolean if a field has been set.

### SetRowsNil

`func (o *ReportTable) SetRowsNil(b bool)`

 SetRowsNil sets the value for Rows to be an explicit nil

### UnsetRows
`func (o *ReportTable) UnsetRows()`

UnsetRows ensures that no value is present for Rows, not even an explicit nil
### GetTruncationCount

`func (o *ReportTable) GetTruncationCount() int32`

GetTruncationCount returns the TruncationCount field if non-nil, zero value otherwise.

### GetTruncationCountOk

`func (o *ReportTable) GetTruncationCountOk() (*int32, bool)`

GetTruncationCountOk returns a tuple with the TruncationCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTruncationCount

`func (o *ReportTable) SetTruncationCount(v int32)`

SetTruncationCount sets TruncationCount field to given value.

### HasTruncationCount

`func (o *ReportTable) HasTruncationCount() bool`

HasTruncationCount returns a boolean if a field has been set.

### GetType

`func (o *ReportTable) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *ReportTable) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *ReportTable) SetType(v string)`

SetType sets Type field to given value.

### HasType

`func (o *ReportTable) HasType() bool`

HasType returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



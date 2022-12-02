# ReportReport

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**DNS** | Pointer to [**map[string]ReportDNSRecord**](ReportDNSRecord.md) |  | [optional] 
**Nodes** | Pointer to [**map[string]ReportDNSRecord**](ReportDNSRecord.md) |  | [optional] 

## Methods

### NewReportReport

`func NewReportReport() *ReportReport`

NewReportReport instantiates a new ReportReport object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewReportReportWithDefaults

`func NewReportReportWithDefaults() *ReportReport`

NewReportReportWithDefaults instantiates a new ReportReport object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetDNS

`func (o *ReportReport) GetDNS() map[string]ReportDNSRecord`

GetDNS returns the DNS field if non-nil, zero value otherwise.

### GetDNSOk

`func (o *ReportReport) GetDNSOk() (*map[string]ReportDNSRecord, bool)`

GetDNSOk returns a tuple with the DNS field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDNS

`func (o *ReportReport) SetDNS(v map[string]ReportDNSRecord)`

SetDNS sets DNS field to given value.

### HasDNS

`func (o *ReportReport) HasDNS() bool`

HasDNS returns a boolean if a field has been set.

### GetNodes

`func (o *ReportReport) GetNodes() map[string]ReportDNSRecord`

GetNodes returns the Nodes field if non-nil, zero value otherwise.

### GetNodesOk

`func (o *ReportReport) GetNodesOk() (*map[string]ReportDNSRecord, bool)`

GetNodesOk returns a tuple with the Nodes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodes

`func (o *ReportReport) SetNodes(v map[string]ReportDNSRecord)`

SetNodes sets Nodes field to given value.

### HasNodes

`func (o *ReportReport) HasNodes() bool`

HasNodes returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



# IngestersDfCveStruct

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Timestamp** | Pointer to **string** |  | [optional] 
**Count** | Pointer to **int32** |  | [optional] 
**CveAttackVector** | Pointer to **string** |  | [optional] 
**CveCausedByPackage** | Pointer to **string** |  | [optional] 
**CveCausedByPackagePath** | Pointer to **string** |  | [optional] 
**CveContainerImage** | Pointer to **string** |  | [optional] 
**CveContainerImageId** | Pointer to **string** |  | [optional] 
**CveContainerLayer** | Pointer to **string** |  | [optional] 
**CveContainerName** | Pointer to **string** |  | [optional] 
**CveCvssScore** | Pointer to **float32** |  | [optional] 
**CveDescription** | Pointer to **string** |  | [optional] 
**CveFixedIn** | Pointer to **string** |  | [optional] 
**CveId** | Pointer to **string** |  | [optional] 
**CveIdCveSeverityCveContainerImage** | Pointer to **string** |  | [optional] 
**CveLink** | Pointer to **string** |  | [optional] 
**CveOverallScore** | Pointer to **float32** |  | [optional] 
**CveSeverity** | Pointer to **string** |  | [optional] 
**CveType** | Pointer to **string** |  | [optional] 
**DocId** | Pointer to **string** |  | [optional] 
**ExploitPoc** | Pointer to **string** |  | [optional] 
**Host** | Pointer to **string** |  | [optional] 
**HostName** | Pointer to **string** |  | [optional] 
**KubernetesClusterName** | Pointer to **string** |  | [optional] 
**Masked** | Pointer to **string** |  | [optional] 
**NodeType** | Pointer to **string** |  | [optional] 
**ScanId** | Pointer to **string** |  | [optional] 
**Type** | Pointer to **string** |  | [optional] 
**Urls** | Pointer to **[]string** |  | [optional] 

## Methods

### NewIngestersDfCveStruct

`func NewIngestersDfCveStruct() *IngestersDfCveStruct`

NewIngestersDfCveStruct instantiates a new IngestersDfCveStruct object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewIngestersDfCveStructWithDefaults

`func NewIngestersDfCveStructWithDefaults() *IngestersDfCveStruct`

NewIngestersDfCveStructWithDefaults instantiates a new IngestersDfCveStruct object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTimestamp

`func (o *IngestersDfCveStruct) GetTimestamp() string`

GetTimestamp returns the Timestamp field if non-nil, zero value otherwise.

### GetTimestampOk

`func (o *IngestersDfCveStruct) GetTimestampOk() (*string, bool)`

GetTimestampOk returns a tuple with the Timestamp field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimestamp

`func (o *IngestersDfCveStruct) SetTimestamp(v string)`

SetTimestamp sets Timestamp field to given value.

### HasTimestamp

`func (o *IngestersDfCveStruct) HasTimestamp() bool`

HasTimestamp returns a boolean if a field has been set.

### GetCount

`func (o *IngestersDfCveStruct) GetCount() int32`

GetCount returns the Count field if non-nil, zero value otherwise.

### GetCountOk

`func (o *IngestersDfCveStruct) GetCountOk() (*int32, bool)`

GetCountOk returns a tuple with the Count field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCount

`func (o *IngestersDfCveStruct) SetCount(v int32)`

SetCount sets Count field to given value.

### HasCount

`func (o *IngestersDfCveStruct) HasCount() bool`

HasCount returns a boolean if a field has been set.

### GetCveAttackVector

`func (o *IngestersDfCveStruct) GetCveAttackVector() string`

GetCveAttackVector returns the CveAttackVector field if non-nil, zero value otherwise.

### GetCveAttackVectorOk

`func (o *IngestersDfCveStruct) GetCveAttackVectorOk() (*string, bool)`

GetCveAttackVectorOk returns a tuple with the CveAttackVector field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveAttackVector

`func (o *IngestersDfCveStruct) SetCveAttackVector(v string)`

SetCveAttackVector sets CveAttackVector field to given value.

### HasCveAttackVector

`func (o *IngestersDfCveStruct) HasCveAttackVector() bool`

HasCveAttackVector returns a boolean if a field has been set.

### GetCveCausedByPackage

`func (o *IngestersDfCveStruct) GetCveCausedByPackage() string`

GetCveCausedByPackage returns the CveCausedByPackage field if non-nil, zero value otherwise.

### GetCveCausedByPackageOk

`func (o *IngestersDfCveStruct) GetCveCausedByPackageOk() (*string, bool)`

GetCveCausedByPackageOk returns a tuple with the CveCausedByPackage field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveCausedByPackage

`func (o *IngestersDfCveStruct) SetCveCausedByPackage(v string)`

SetCveCausedByPackage sets CveCausedByPackage field to given value.

### HasCveCausedByPackage

`func (o *IngestersDfCveStruct) HasCveCausedByPackage() bool`

HasCveCausedByPackage returns a boolean if a field has been set.

### GetCveCausedByPackagePath

`func (o *IngestersDfCveStruct) GetCveCausedByPackagePath() string`

GetCveCausedByPackagePath returns the CveCausedByPackagePath field if non-nil, zero value otherwise.

### GetCveCausedByPackagePathOk

`func (o *IngestersDfCveStruct) GetCveCausedByPackagePathOk() (*string, bool)`

GetCveCausedByPackagePathOk returns a tuple with the CveCausedByPackagePath field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveCausedByPackagePath

`func (o *IngestersDfCveStruct) SetCveCausedByPackagePath(v string)`

SetCveCausedByPackagePath sets CveCausedByPackagePath field to given value.

### HasCveCausedByPackagePath

`func (o *IngestersDfCveStruct) HasCveCausedByPackagePath() bool`

HasCveCausedByPackagePath returns a boolean if a field has been set.

### GetCveContainerImage

`func (o *IngestersDfCveStruct) GetCveContainerImage() string`

GetCveContainerImage returns the CveContainerImage field if non-nil, zero value otherwise.

### GetCveContainerImageOk

`func (o *IngestersDfCveStruct) GetCveContainerImageOk() (*string, bool)`

GetCveContainerImageOk returns a tuple with the CveContainerImage field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveContainerImage

`func (o *IngestersDfCveStruct) SetCveContainerImage(v string)`

SetCveContainerImage sets CveContainerImage field to given value.

### HasCveContainerImage

`func (o *IngestersDfCveStruct) HasCveContainerImage() bool`

HasCveContainerImage returns a boolean if a field has been set.

### GetCveContainerImageId

`func (o *IngestersDfCveStruct) GetCveContainerImageId() string`

GetCveContainerImageId returns the CveContainerImageId field if non-nil, zero value otherwise.

### GetCveContainerImageIdOk

`func (o *IngestersDfCveStruct) GetCveContainerImageIdOk() (*string, bool)`

GetCveContainerImageIdOk returns a tuple with the CveContainerImageId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveContainerImageId

`func (o *IngestersDfCveStruct) SetCveContainerImageId(v string)`

SetCveContainerImageId sets CveContainerImageId field to given value.

### HasCveContainerImageId

`func (o *IngestersDfCveStruct) HasCveContainerImageId() bool`

HasCveContainerImageId returns a boolean if a field has been set.

### GetCveContainerLayer

`func (o *IngestersDfCveStruct) GetCveContainerLayer() string`

GetCveContainerLayer returns the CveContainerLayer field if non-nil, zero value otherwise.

### GetCveContainerLayerOk

`func (o *IngestersDfCveStruct) GetCveContainerLayerOk() (*string, bool)`

GetCveContainerLayerOk returns a tuple with the CveContainerLayer field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveContainerLayer

`func (o *IngestersDfCveStruct) SetCveContainerLayer(v string)`

SetCveContainerLayer sets CveContainerLayer field to given value.

### HasCveContainerLayer

`func (o *IngestersDfCveStruct) HasCveContainerLayer() bool`

HasCveContainerLayer returns a boolean if a field has been set.

### GetCveContainerName

`func (o *IngestersDfCveStruct) GetCveContainerName() string`

GetCveContainerName returns the CveContainerName field if non-nil, zero value otherwise.

### GetCveContainerNameOk

`func (o *IngestersDfCveStruct) GetCveContainerNameOk() (*string, bool)`

GetCveContainerNameOk returns a tuple with the CveContainerName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveContainerName

`func (o *IngestersDfCveStruct) SetCveContainerName(v string)`

SetCveContainerName sets CveContainerName field to given value.

### HasCveContainerName

`func (o *IngestersDfCveStruct) HasCveContainerName() bool`

HasCveContainerName returns a boolean if a field has been set.

### GetCveCvssScore

`func (o *IngestersDfCveStruct) GetCveCvssScore() float32`

GetCveCvssScore returns the CveCvssScore field if non-nil, zero value otherwise.

### GetCveCvssScoreOk

`func (o *IngestersDfCveStruct) GetCveCvssScoreOk() (*float32, bool)`

GetCveCvssScoreOk returns a tuple with the CveCvssScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveCvssScore

`func (o *IngestersDfCveStruct) SetCveCvssScore(v float32)`

SetCveCvssScore sets CveCvssScore field to given value.

### HasCveCvssScore

`func (o *IngestersDfCveStruct) HasCveCvssScore() bool`

HasCveCvssScore returns a boolean if a field has been set.

### GetCveDescription

`func (o *IngestersDfCveStruct) GetCveDescription() string`

GetCveDescription returns the CveDescription field if non-nil, zero value otherwise.

### GetCveDescriptionOk

`func (o *IngestersDfCveStruct) GetCveDescriptionOk() (*string, bool)`

GetCveDescriptionOk returns a tuple with the CveDescription field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveDescription

`func (o *IngestersDfCveStruct) SetCveDescription(v string)`

SetCveDescription sets CveDescription field to given value.

### HasCveDescription

`func (o *IngestersDfCveStruct) HasCveDescription() bool`

HasCveDescription returns a boolean if a field has been set.

### GetCveFixedIn

`func (o *IngestersDfCveStruct) GetCveFixedIn() string`

GetCveFixedIn returns the CveFixedIn field if non-nil, zero value otherwise.

### GetCveFixedInOk

`func (o *IngestersDfCveStruct) GetCveFixedInOk() (*string, bool)`

GetCveFixedInOk returns a tuple with the CveFixedIn field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveFixedIn

`func (o *IngestersDfCveStruct) SetCveFixedIn(v string)`

SetCveFixedIn sets CveFixedIn field to given value.

### HasCveFixedIn

`func (o *IngestersDfCveStruct) HasCveFixedIn() bool`

HasCveFixedIn returns a boolean if a field has been set.

### GetCveId

`func (o *IngestersDfCveStruct) GetCveId() string`

GetCveId returns the CveId field if non-nil, zero value otherwise.

### GetCveIdOk

`func (o *IngestersDfCveStruct) GetCveIdOk() (*string, bool)`

GetCveIdOk returns a tuple with the CveId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveId

`func (o *IngestersDfCveStruct) SetCveId(v string)`

SetCveId sets CveId field to given value.

### HasCveId

`func (o *IngestersDfCveStruct) HasCveId() bool`

HasCveId returns a boolean if a field has been set.

### GetCveIdCveSeverityCveContainerImage

`func (o *IngestersDfCveStruct) GetCveIdCveSeverityCveContainerImage() string`

GetCveIdCveSeverityCveContainerImage returns the CveIdCveSeverityCveContainerImage field if non-nil, zero value otherwise.

### GetCveIdCveSeverityCveContainerImageOk

`func (o *IngestersDfCveStruct) GetCveIdCveSeverityCveContainerImageOk() (*string, bool)`

GetCveIdCveSeverityCveContainerImageOk returns a tuple with the CveIdCveSeverityCveContainerImage field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveIdCveSeverityCveContainerImage

`func (o *IngestersDfCveStruct) SetCveIdCveSeverityCveContainerImage(v string)`

SetCveIdCveSeverityCveContainerImage sets CveIdCveSeverityCveContainerImage field to given value.

### HasCveIdCveSeverityCveContainerImage

`func (o *IngestersDfCveStruct) HasCveIdCveSeverityCveContainerImage() bool`

HasCveIdCveSeverityCveContainerImage returns a boolean if a field has been set.

### GetCveLink

`func (o *IngestersDfCveStruct) GetCveLink() string`

GetCveLink returns the CveLink field if non-nil, zero value otherwise.

### GetCveLinkOk

`func (o *IngestersDfCveStruct) GetCveLinkOk() (*string, bool)`

GetCveLinkOk returns a tuple with the CveLink field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveLink

`func (o *IngestersDfCveStruct) SetCveLink(v string)`

SetCveLink sets CveLink field to given value.

### HasCveLink

`func (o *IngestersDfCveStruct) HasCveLink() bool`

HasCveLink returns a boolean if a field has been set.

### GetCveOverallScore

`func (o *IngestersDfCveStruct) GetCveOverallScore() float32`

GetCveOverallScore returns the CveOverallScore field if non-nil, zero value otherwise.

### GetCveOverallScoreOk

`func (o *IngestersDfCveStruct) GetCveOverallScoreOk() (*float32, bool)`

GetCveOverallScoreOk returns a tuple with the CveOverallScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveOverallScore

`func (o *IngestersDfCveStruct) SetCveOverallScore(v float32)`

SetCveOverallScore sets CveOverallScore field to given value.

### HasCveOverallScore

`func (o *IngestersDfCveStruct) HasCveOverallScore() bool`

HasCveOverallScore returns a boolean if a field has been set.

### GetCveSeverity

`func (o *IngestersDfCveStruct) GetCveSeverity() string`

GetCveSeverity returns the CveSeverity field if non-nil, zero value otherwise.

### GetCveSeverityOk

`func (o *IngestersDfCveStruct) GetCveSeverityOk() (*string, bool)`

GetCveSeverityOk returns a tuple with the CveSeverity field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveSeverity

`func (o *IngestersDfCveStruct) SetCveSeverity(v string)`

SetCveSeverity sets CveSeverity field to given value.

### HasCveSeverity

`func (o *IngestersDfCveStruct) HasCveSeverity() bool`

HasCveSeverity returns a boolean if a field has been set.

### GetCveType

`func (o *IngestersDfCveStruct) GetCveType() string`

GetCveType returns the CveType field if non-nil, zero value otherwise.

### GetCveTypeOk

`func (o *IngestersDfCveStruct) GetCveTypeOk() (*string, bool)`

GetCveTypeOk returns a tuple with the CveType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCveType

`func (o *IngestersDfCveStruct) SetCveType(v string)`

SetCveType sets CveType field to given value.

### HasCveType

`func (o *IngestersDfCveStruct) HasCveType() bool`

HasCveType returns a boolean if a field has been set.

### GetDocId

`func (o *IngestersDfCveStruct) GetDocId() string`

GetDocId returns the DocId field if non-nil, zero value otherwise.

### GetDocIdOk

`func (o *IngestersDfCveStruct) GetDocIdOk() (*string, bool)`

GetDocIdOk returns a tuple with the DocId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDocId

`func (o *IngestersDfCveStruct) SetDocId(v string)`

SetDocId sets DocId field to given value.

### HasDocId

`func (o *IngestersDfCveStruct) HasDocId() bool`

HasDocId returns a boolean if a field has been set.

### GetExploitPoc

`func (o *IngestersDfCveStruct) GetExploitPoc() string`

GetExploitPoc returns the ExploitPoc field if non-nil, zero value otherwise.

### GetExploitPocOk

`func (o *IngestersDfCveStruct) GetExploitPocOk() (*string, bool)`

GetExploitPocOk returns a tuple with the ExploitPoc field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExploitPoc

`func (o *IngestersDfCveStruct) SetExploitPoc(v string)`

SetExploitPoc sets ExploitPoc field to given value.

### HasExploitPoc

`func (o *IngestersDfCveStruct) HasExploitPoc() bool`

HasExploitPoc returns a boolean if a field has been set.

### GetHost

`func (o *IngestersDfCveStruct) GetHost() string`

GetHost returns the Host field if non-nil, zero value otherwise.

### GetHostOk

`func (o *IngestersDfCveStruct) GetHostOk() (*string, bool)`

GetHostOk returns a tuple with the Host field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHost

`func (o *IngestersDfCveStruct) SetHost(v string)`

SetHost sets Host field to given value.

### HasHost

`func (o *IngestersDfCveStruct) HasHost() bool`

HasHost returns a boolean if a field has been set.

### GetHostName

`func (o *IngestersDfCveStruct) GetHostName() string`

GetHostName returns the HostName field if non-nil, zero value otherwise.

### GetHostNameOk

`func (o *IngestersDfCveStruct) GetHostNameOk() (*string, bool)`

GetHostNameOk returns a tuple with the HostName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHostName

`func (o *IngestersDfCveStruct) SetHostName(v string)`

SetHostName sets HostName field to given value.

### HasHostName

`func (o *IngestersDfCveStruct) HasHostName() bool`

HasHostName returns a boolean if a field has been set.

### GetKubernetesClusterName

`func (o *IngestersDfCveStruct) GetKubernetesClusterName() string`

GetKubernetesClusterName returns the KubernetesClusterName field if non-nil, zero value otherwise.

### GetKubernetesClusterNameOk

`func (o *IngestersDfCveStruct) GetKubernetesClusterNameOk() (*string, bool)`

GetKubernetesClusterNameOk returns a tuple with the KubernetesClusterName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKubernetesClusterName

`func (o *IngestersDfCveStruct) SetKubernetesClusterName(v string)`

SetKubernetesClusterName sets KubernetesClusterName field to given value.

### HasKubernetesClusterName

`func (o *IngestersDfCveStruct) HasKubernetesClusterName() bool`

HasKubernetesClusterName returns a boolean if a field has been set.

### GetMasked

`func (o *IngestersDfCveStruct) GetMasked() string`

GetMasked returns the Masked field if non-nil, zero value otherwise.

### GetMaskedOk

`func (o *IngestersDfCveStruct) GetMaskedOk() (*string, bool)`

GetMaskedOk returns a tuple with the Masked field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMasked

`func (o *IngestersDfCveStruct) SetMasked(v string)`

SetMasked sets Masked field to given value.

### HasMasked

`func (o *IngestersDfCveStruct) HasMasked() bool`

HasMasked returns a boolean if a field has been set.

### GetNodeType

`func (o *IngestersDfCveStruct) GetNodeType() string`

GetNodeType returns the NodeType field if non-nil, zero value otherwise.

### GetNodeTypeOk

`func (o *IngestersDfCveStruct) GetNodeTypeOk() (*string, bool)`

GetNodeTypeOk returns a tuple with the NodeType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeType

`func (o *IngestersDfCveStruct) SetNodeType(v string)`

SetNodeType sets NodeType field to given value.

### HasNodeType

`func (o *IngestersDfCveStruct) HasNodeType() bool`

HasNodeType returns a boolean if a field has been set.

### GetScanId

`func (o *IngestersDfCveStruct) GetScanId() string`

GetScanId returns the ScanId field if non-nil, zero value otherwise.

### GetScanIdOk

`func (o *IngestersDfCveStruct) GetScanIdOk() (*string, bool)`

GetScanIdOk returns a tuple with the ScanId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScanId

`func (o *IngestersDfCveStruct) SetScanId(v string)`

SetScanId sets ScanId field to given value.

### HasScanId

`func (o *IngestersDfCveStruct) HasScanId() bool`

HasScanId returns a boolean if a field has been set.

### GetType

`func (o *IngestersDfCveStruct) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *IngestersDfCveStruct) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *IngestersDfCveStruct) SetType(v string)`

SetType sets Type field to given value.

### HasType

`func (o *IngestersDfCveStruct) HasType() bool`

HasType returns a boolean if a field has been set.

### GetUrls

`func (o *IngestersDfCveStruct) GetUrls() []string`

GetUrls returns the Urls field if non-nil, zero value otherwise.

### GetUrlsOk

`func (o *IngestersDfCveStruct) GetUrlsOk() (*[]string, bool)`

GetUrlsOk returns a tuple with the Urls field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUrls

`func (o *IngestersDfCveStruct) SetUrls(v []string)`

SetUrls sets Urls field to given value.

### HasUrls

`func (o *IngestersDfCveStruct) HasUrls() bool`

HasUrls returns a boolean if a field has been set.

### SetUrlsNil

`func (o *IngestersDfCveStruct) SetUrlsNil(b bool)`

 SetUrlsNil sets the value for Urls to be an explicit nil

### UnsetUrls
`func (o *IngestersDfCveStruct) UnsetUrls()`

UnsetUrls ensures that no value is present for Urls, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



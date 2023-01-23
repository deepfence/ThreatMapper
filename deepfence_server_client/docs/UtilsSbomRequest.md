# UtilsSbomRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ContainerName** | Pointer to **string** |  | [optional] 
**HostName** | Pointer to **string** |  | [optional] 
**ImageId** | Pointer to **string** |  | [optional] 
**ImageName** | Pointer to **string** |  | [optional] 
**KubernetesClusterName** | Pointer to **string** |  | [optional] 
**Mode** | Pointer to **string** |  | [optional] 
**NodeId** | Pointer to **string** |  | [optional] 
**NodeType** | Pointer to **string** |  | [optional] 
**Sbom** | Pointer to **[]int32** |  | [optional] 
**SbomFilePath** | Pointer to **string** |  | [optional] 
**ScanId** | Pointer to **string** |  | [optional] 
**ScanType** | Pointer to **string** |  | [optional] 

## Methods

### NewUtilsSbomRequest

`func NewUtilsSbomRequest() *UtilsSbomRequest`

NewUtilsSbomRequest instantiates a new UtilsSbomRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewUtilsSbomRequestWithDefaults

`func NewUtilsSbomRequestWithDefaults() *UtilsSbomRequest`

NewUtilsSbomRequestWithDefaults instantiates a new UtilsSbomRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetContainerName

`func (o *UtilsSbomRequest) GetContainerName() string`

GetContainerName returns the ContainerName field if non-nil, zero value otherwise.

### GetContainerNameOk

`func (o *UtilsSbomRequest) GetContainerNameOk() (*string, bool)`

GetContainerNameOk returns a tuple with the ContainerName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetContainerName

`func (o *UtilsSbomRequest) SetContainerName(v string)`

SetContainerName sets ContainerName field to given value.

### HasContainerName

`func (o *UtilsSbomRequest) HasContainerName() bool`

HasContainerName returns a boolean if a field has been set.

### GetHostName

`func (o *UtilsSbomRequest) GetHostName() string`

GetHostName returns the HostName field if non-nil, zero value otherwise.

### GetHostNameOk

`func (o *UtilsSbomRequest) GetHostNameOk() (*string, bool)`

GetHostNameOk returns a tuple with the HostName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHostName

`func (o *UtilsSbomRequest) SetHostName(v string)`

SetHostName sets HostName field to given value.

### HasHostName

`func (o *UtilsSbomRequest) HasHostName() bool`

HasHostName returns a boolean if a field has been set.

### GetImageId

`func (o *UtilsSbomRequest) GetImageId() string`

GetImageId returns the ImageId field if non-nil, zero value otherwise.

### GetImageIdOk

`func (o *UtilsSbomRequest) GetImageIdOk() (*string, bool)`

GetImageIdOk returns a tuple with the ImageId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetImageId

`func (o *UtilsSbomRequest) SetImageId(v string)`

SetImageId sets ImageId field to given value.

### HasImageId

`func (o *UtilsSbomRequest) HasImageId() bool`

HasImageId returns a boolean if a field has been set.

### GetImageName

`func (o *UtilsSbomRequest) GetImageName() string`

GetImageName returns the ImageName field if non-nil, zero value otherwise.

### GetImageNameOk

`func (o *UtilsSbomRequest) GetImageNameOk() (*string, bool)`

GetImageNameOk returns a tuple with the ImageName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetImageName

`func (o *UtilsSbomRequest) SetImageName(v string)`

SetImageName sets ImageName field to given value.

### HasImageName

`func (o *UtilsSbomRequest) HasImageName() bool`

HasImageName returns a boolean if a field has been set.

### GetKubernetesClusterName

`func (o *UtilsSbomRequest) GetKubernetesClusterName() string`

GetKubernetesClusterName returns the KubernetesClusterName field if non-nil, zero value otherwise.

### GetKubernetesClusterNameOk

`func (o *UtilsSbomRequest) GetKubernetesClusterNameOk() (*string, bool)`

GetKubernetesClusterNameOk returns a tuple with the KubernetesClusterName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetKubernetesClusterName

`func (o *UtilsSbomRequest) SetKubernetesClusterName(v string)`

SetKubernetesClusterName sets KubernetesClusterName field to given value.

### HasKubernetesClusterName

`func (o *UtilsSbomRequest) HasKubernetesClusterName() bool`

HasKubernetesClusterName returns a boolean if a field has been set.

### GetMode

`func (o *UtilsSbomRequest) GetMode() string`

GetMode returns the Mode field if non-nil, zero value otherwise.

### GetModeOk

`func (o *UtilsSbomRequest) GetModeOk() (*string, bool)`

GetModeOk returns a tuple with the Mode field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMode

`func (o *UtilsSbomRequest) SetMode(v string)`

SetMode sets Mode field to given value.

### HasMode

`func (o *UtilsSbomRequest) HasMode() bool`

HasMode returns a boolean if a field has been set.

### GetNodeId

`func (o *UtilsSbomRequest) GetNodeId() string`

GetNodeId returns the NodeId field if non-nil, zero value otherwise.

### GetNodeIdOk

`func (o *UtilsSbomRequest) GetNodeIdOk() (*string, bool)`

GetNodeIdOk returns a tuple with the NodeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeId

`func (o *UtilsSbomRequest) SetNodeId(v string)`

SetNodeId sets NodeId field to given value.

### HasNodeId

`func (o *UtilsSbomRequest) HasNodeId() bool`

HasNodeId returns a boolean if a field has been set.

### GetNodeType

`func (o *UtilsSbomRequest) GetNodeType() string`

GetNodeType returns the NodeType field if non-nil, zero value otherwise.

### GetNodeTypeOk

`func (o *UtilsSbomRequest) GetNodeTypeOk() (*string, bool)`

GetNodeTypeOk returns a tuple with the NodeType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNodeType

`func (o *UtilsSbomRequest) SetNodeType(v string)`

SetNodeType sets NodeType field to given value.

### HasNodeType

`func (o *UtilsSbomRequest) HasNodeType() bool`

HasNodeType returns a boolean if a field has been set.

### GetSbom

`func (o *UtilsSbomRequest) GetSbom() []int32`

GetSbom returns the Sbom field if non-nil, zero value otherwise.

### GetSbomOk

`func (o *UtilsSbomRequest) GetSbomOk() (*[]int32, bool)`

GetSbomOk returns a tuple with the Sbom field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSbom

`func (o *UtilsSbomRequest) SetSbom(v []int32)`

SetSbom sets Sbom field to given value.

### HasSbom

`func (o *UtilsSbomRequest) HasSbom() bool`

HasSbom returns a boolean if a field has been set.

### GetSbomFilePath

`func (o *UtilsSbomRequest) GetSbomFilePath() string`

GetSbomFilePath returns the SbomFilePath field if non-nil, zero value otherwise.

### GetSbomFilePathOk

`func (o *UtilsSbomRequest) GetSbomFilePathOk() (*string, bool)`

GetSbomFilePathOk returns a tuple with the SbomFilePath field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSbomFilePath

`func (o *UtilsSbomRequest) SetSbomFilePath(v string)`

SetSbomFilePath sets SbomFilePath field to given value.

### HasSbomFilePath

`func (o *UtilsSbomRequest) HasSbomFilePath() bool`

HasSbomFilePath returns a boolean if a field has been set.

### GetScanId

`func (o *UtilsSbomRequest) GetScanId() string`

GetScanId returns the ScanId field if non-nil, zero value otherwise.

### GetScanIdOk

`func (o *UtilsSbomRequest) GetScanIdOk() (*string, bool)`

GetScanIdOk returns a tuple with the ScanId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScanId

`func (o *UtilsSbomRequest) SetScanId(v string)`

SetScanId sets ScanId field to given value.

### HasScanId

`func (o *UtilsSbomRequest) HasScanId() bool`

HasScanId returns a boolean if a field has been set.

### GetScanType

`func (o *UtilsSbomRequest) GetScanType() string`

GetScanType returns the ScanType field if non-nil, zero value otherwise.

### GetScanTypeOk

`func (o *UtilsSbomRequest) GetScanTypeOk() (*string, bool)`

GetScanTypeOk returns a tuple with the ScanType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScanType

`func (o *UtilsSbomRequest) SetScanType(v string)`

SetScanType sets ScanType field to given value.

### HasScanType

`func (o *UtilsSbomRequest) HasScanType() bool`

HasScanType returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)



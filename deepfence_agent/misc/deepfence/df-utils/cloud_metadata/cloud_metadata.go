package cloud_metadata

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	dfUtils "github.com/deepfence/df-utils"
)

const (
	awsMetadataBaseUrl         = "http://169.254.169.254/latest/meta-data"
	googleCloudMetadataBaseUrl = "http://metadata.google.internal/computeMetadata/v1"
	azureMetadataBaseUrl       = "http://169.254.169.254/metadata"
	softlayerMetadataBaseUrl   = "https://api.service.softlayer.com/rest/v3.1/SoftLayer_Resource_Metadata"
	awsECSMetaDataURL          = "http://169.254.170.2/v2/metadata"
	digitalOceanMetadaBaseUrl  = "http://169.254.169.254/metadata"
)

var incorrectMetadataError = errors.New("couldn't verify metadata correctness")

func GetHTTPResponse(client *http.Client, method string, url string, body io.Reader, headers map[string]string) (string, error) {
	req, _ := http.NewRequest(method, url, body)
	if headers != nil {
		for key, val := range headers {
			req.Header.Add(key, val)
		}
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		bodyBytes, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return "", err
		}
		return string(bodyBytes), nil
	}
	return "", errors.New(fmt.Sprintf("StatusCode: %d", resp.StatusCode))
}

// GetAWSFargateMetadata returns fargate meta data from the ecs instances
func GetAWSFargateMetadata(onlyValidate bool) (CloudMetadata, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	awsFargateMetadata := CloudMetadata{CloudProvider: "aws_fargate", Label: "AWS Fargate"}
	httpResp, err := GetHTTPResponse(client, "GET", awsECSMetaDataURL, nil, nil)
	if onlyValidate == true {
		// Only check if cloud provider is AWS_Fargate, don't need metadata
		return awsFargateMetadata, err
	}
	if err != nil {
		return awsFargateMetadata, err
	}
	var result map[string]interface{}
	err = json.Unmarshal([]byte(httpResp), &result)
	if err != nil {
		return awsFargateMetadata, err
	}
	awsFargateMetadata.TaskARN = result["TaskARN"].(string)
	awsFargateMetadata.Family = result["Family"].(string)
	awsFargateMetadata.Zone = result["AvailabilityZone"].(string)
	awsFargateMetadata.Region = dfUtils.RemoveLastCharacter(awsFargateMetadata.Zone)
	containers := result["Containers"].([]interface{})
	for _, value := range containers {
		val := value.(map[string]interface{})
		if val["Type"] == "NORMAL" && !strings.Contains(strings.ToLower(val["Name"].(string)), "agent") {
			awsFargateMetadata.Hostname = val["Name"].(string)
			awsFargateMetadata.NetworkMode = val["Networks"].([]interface{})[0].(map[string]interface{})["NetworkMode"].(string)
			awsFargateMetadata.PrivateIP = []string{val["Networks"].([]interface{})[0].(map[string]interface{})["IPv4Addresses"].([]interface{})[0].(string)}
		}
	}
	return awsFargateMetadata, nil
}

func GetAWSMetadata(onlyValidate bool) (CloudMetadata, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	awsMetadata := CloudMetadata{CloudProvider: "aws", Label: "AWS"}
	// Get token
	headers := map[string]string{"X-aws-ec2-metadata-token-ttl-seconds": "60"}
	awsMetadataApiToken, err := GetHTTPResponse(client, "PUT", "http://169.254.169.254/latest/api/token", nil, headers)
	if err != nil {
		return awsMetadata, err
	}
	if awsMetadataApiToken == "" {
		return awsMetadata, errors.New("couldn't get metadata api token")
	}
	// Call metadata api with token
	headers = map[string]string{"X-aws-ec2-metadata-token": awsMetadataApiToken}
	httpResp, err := GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", awsMetadataBaseUrl, "instance-id"), nil, headers)
	if err == nil {
		awsMetadata.InstanceID = httpResp
	}
	verifyIfAws := func(instanceID string) error {
		var imageId string
		httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", awsMetadataBaseUrl, "ami-id"), nil, headers)
		if err == nil {
			imageId = httpResp
		}
		if strings.HasPrefix(instanceID, "i-") && strings.HasPrefix(imageId, "ami-") {
			return nil
		}
		sysVendor, err := ioutil.ReadFile("/sys/class/dmi/id/sys_vendor")
		if err == nil {
			if strings.Contains(string(sysVendor), "Amazon") {
				return nil
			}
		}
		productVersion, err := ioutil.ReadFile("/sys/class/dmi/id/product_version")
		if err == nil {
			if strings.Contains(string(productVersion), "amazon") {
				return nil
			}
		}
		return incorrectMetadataError
	}
	if onlyValidate == true {
		err = verifyIfAws(awsMetadata.InstanceID)
		return awsMetadata, err
	}
	if err != nil {
		return awsMetadata, err
	}
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", awsMetadataBaseUrl, "hostname"), nil, headers)
	if err == nil {
		awsMetadata.Hostname = httpResp
	}
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", awsMetadataBaseUrl, "instance-type"), nil, headers)
	if err == nil {
		awsMetadata.InstanceType = httpResp
	}
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", awsMetadataBaseUrl, "placement/availability-zone"), nil, headers)
	if err == nil {
		awsMetadata.Zone = httpResp
	}
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", awsMetadataBaseUrl, "placement/region"), nil, headers)
	if err == nil {
		awsMetadata.Region = httpResp
	}
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", awsMetadataBaseUrl, "public-ipv4"), nil, headers)
	if err == nil {
		var ips []string
		ips = append(ips, httpResp)
		awsMetadata.PublicIP = ips
	}
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", awsMetadataBaseUrl, "local-ipv4"), nil, headers)
	if err == nil {
		var ips []string
		ips = append(ips, httpResp)
		awsMetadata.PrivateIP = ips
	}
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", awsMetadataBaseUrl, "kernel-id"), nil, headers)
	if err == nil {
		awsMetadata.KernelId = httpResp
	}
	return awsMetadata, nil
}

func GetGoogleCloudMetadata(onlyValidate bool) (CloudMetadata, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	gcpMetadata := CloudMetadata{CloudProvider: "google_cloud"}
	resp, err := GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", googleCloudMetadataBaseUrl, "instance/?recursive=true&timeout_sec=1"), nil, map[string]string{"Metadata-Flavor": "Google"})
	if err != nil {
		return gcpMetadata, err
	}
	verifyIfGcp := func() error {
		productName, err := ioutil.ReadFile("/sys/class/dmi/id/product_name")
		if err != nil {
			return incorrectMetadataError
		}
		if strings.Contains(string(productName), "Google") {
			return nil
		}
		return incorrectMetadataError
	}
	if onlyValidate == true {
		err = verifyIfGcp()
		return gcpMetadata, err
	}
	var gcMetadataAll GoogleCloudMetadataAll
	err = json.Unmarshal([]byte(resp), &gcMetadataAll)
	if err != nil {
		return gcpMetadata, err
	}
	var region string
	if gcMetadataAll.Zone != "" {
		zoneSplit := strings.Split(gcMetadataAll.Zone, "/")
		zoneStr := zoneSplit[len(zoneSplit)-1]
		lastIndex := strings.LastIndex(zoneStr, "-")
		if lastIndex >= 0 {
			region = zoneStr[:strings.LastIndex(zoneStr, "-")]
		}
	}
	gcpMetadata = CloudMetadata{CloudProvider: "google_cloud", Label: "Google Cloud", InstanceID: strconv.FormatInt(gcMetadataAll.ID, 10), Hostname: gcMetadataAll.Hostname, Name: gcMetadataAll.Name, Zone: gcMetadataAll.Zone, Region: region, MachineType: gcMetadataAll.MachineType}
	var privateIP []string
	var publicIP []string
	for _, nwInterface := range gcMetadataAll.NetworkInterfaces {
		for _, accessConfig := range nwInterface.AccessConfigs {
			publicIP = append(publicIP, accessConfig.ExternalIP)
		}
		privateIP = append(privateIP, nwInterface.IP)
	}
	gcpMetadata.PrivateIP = privateIP
	gcpMetadata.PublicIP = publicIP
	return gcpMetadata, nil
}

func GetAzureMetadata(onlyValidate bool) (CloudMetadata, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	azureMetadata := CloudMetadata{CloudProvider: "azure"}
	verifyIfAzure := func() error {
		sysVendor, err := ioutil.ReadFile("/sys/class/dmi/id/sys_vendor")
		if err != nil {
			return incorrectMetadataError
		}
		if strings.Contains(string(sysVendor), "Microsoft Corporation") {
			return nil
		}
		return incorrectMetadataError
	}
	if onlyValidate == true {
		err := verifyIfAzure()
		return azureMetadata, err
	}
	resp, err := GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", azureMetadataBaseUrl, "instance?api-version=2020-06-01"), nil, map[string]string{"Metadata": "true"})
	if err != nil {
		return azureMetadata, err
	}
	var azureMetadataAll AzureMetadataAll
	err = json.Unmarshal([]byte(resp), &azureMetadataAll)
	if err != nil {
		return azureMetadata, err
	}
	azureMetadata = CloudMetadata{CloudProvider: "azure", Label: "Azure", VmID: azureMetadataAll.Compute.VMID, Name: azureMetadataAll.Compute.Name, VMSize: azureMetadataAll.Compute.VMSize, Region: azureMetadataAll.Compute.Location, Zone: azureMetadataAll.Compute.Zone, OsType: azureMetadataAll.Compute.OsType, SKU: azureMetadataAll.Compute.Sku, ResourceGroupName: azureMetadataAll.Compute.ResourceGroupName}
	var privateIP []string
	var publicIP []string
	for _, iface := range azureMetadataAll.Network.Interface {
		for _, ipAddr := range iface.Ipv4.IPAddress {
			publicIP = append(publicIP, ipAddr.PublicIPAddress)
			privateIP = append(privateIP, ipAddr.PrivateIPAddress)
		}
	}
	azureMetadata.PublicIP = publicIP
	azureMetadata.PrivateIP = privateIP
	return azureMetadata, nil
}

func GetDigitalOceanMetadata(onlyValidate bool) (CloudMetadata, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	digitalOceanMetadata := CloudMetadata{CloudProvider: "digital_ocean"}
	resp, err := GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", digitalOceanMetadaBaseUrl, "v1.json"), nil, map[string]string{"Metadata": "true"})
	if err != nil {
		return digitalOceanMetadata, err
	}
	var digitalOceanMetadataAll DigitalOceanMetadataAll
	err = json.Unmarshal([]byte(resp), &digitalOceanMetadataAll)
	if err != nil {
		return digitalOceanMetadata, err
	}
	verifyIfDigitalOcean := func(dropletID int) error {
		if dropletID == 0 {
			return incorrectMetadataError
		}
		sysVendor, err := ioutil.ReadFile("/sys/class/dmi/id/sys_vendor")
		if err != nil {
			return incorrectMetadataError
		}
		if strings.Contains(string(sysVendor), "DigitalOcean") {
			return nil
		}
		return incorrectMetadataError
	}
	if onlyValidate == true {
		err = verifyIfDigitalOcean(digitalOceanMetadataAll.DropletID)
		return digitalOceanMetadata, err
	}
	digitalOceanMetadata = CloudMetadata{CloudProvider: "digital_ocean", Label: "DigitalOcean", VmID: strconv.Itoa(digitalOceanMetadataAll.DropletID), Name: digitalOceanMetadataAll.Hostname, Region: digitalOceanMetadataAll.Region}
	var privateIP []string
	var publicIP []string
	for _, iface := range digitalOceanMetadataAll.Interfaces.Private {
		privateIP = append(privateIP, iface.Ipv4.IPAddress)
	}
	for _, iface := range digitalOceanMetadataAll.Interfaces.Public {
		publicIP = append(publicIP, iface.Ipv4.IPAddress)
	}
	digitalOceanMetadata.PublicIP = publicIP
	digitalOceanMetadata.PrivateIP = privateIP
	return digitalOceanMetadata, nil
}

func GetSoftlayerMetadata(onlyValidate bool) (CloudMetadata, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	softlayerMetadata := CloudMetadata{CloudProvider: "softlayer", Label: "IBM Cloud"}
	httpResp, err := GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", softlayerMetadataBaseUrl, "getId.txt"), nil, nil)
	if onlyValidate == true {
		// Only check if cloud provider is Softlayer, don't need metadata
		return softlayerMetadata, err
	}
	if err != nil {
		return softlayerMetadata, err
	}
	softlayerMetadata.ID = httpResp
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", softlayerMetadataBaseUrl, "getHostname.txt"), nil, nil)
	if err == nil {
		softlayerMetadata.Hostname = httpResp
	}
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", softlayerMetadataBaseUrl, "getDatacenter.txt"), nil, nil)
	if err == nil {
		softlayerMetadata.DataCenter = httpResp
	}
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", softlayerMetadataBaseUrl, "getDomain.txt"), nil, nil)
	if err == nil {
		softlayerMetadata.Domain = httpResp
	}
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", softlayerMetadataBaseUrl, "getPrimaryIpAddress.txt"), nil, nil)
	if err == nil {
		var ips []string
		ips = append(ips, httpResp)
		softlayerMetadata.PublicIP = ips
	}
	httpResp, err = GetHTTPResponse(client, "GET", fmt.Sprintf("%s/%s", softlayerMetadataBaseUrl, "getPrimaryBackendIpAddress.txt"), nil, nil)
	if err == nil {
		var ips []string
		ips = append(ips, httpResp)
		softlayerMetadata.PrivateIP = ips
	}
	return softlayerMetadata, nil
}

func GetGenericMetadata(onlyValidate bool) (CloudMetadata, error) {
	genericMetadata := CloudMetadata{CloudProvider: "unknown", Region: "unknown", Label: "Unknown"}
	if onlyValidate == true {
		return genericMetadata, nil
	}
	ipAddress, _, err := dfUtils.GetDefaultRouteIPAddress()
	if err != nil {
		return genericMetadata, err
	}
	var ips []string
	ips = append(ips, ipAddress)
	genericMetadata.PublicIP = ips
	return genericMetadata, nil
}

func DetectCloudServiceProvider() string {
	// Check if AWS
	_, err := GetAWSMetadata(true)
	if err == nil {
		return "aws"
	}
	// Check if Google Cloud
	_, err = GetGoogleCloudMetadata(true)
	if err == nil {
		return "google_cloud"
	}
	// Check if Azure
	_, err = GetAzureMetadata(true)
	if err == nil {
		return "azure"
	}
	// Check if Digital Ocean
	_, err = GetDigitalOceanMetadata(true)
	if err == nil {
		return "digital_ocean"
	}
	// Check if AWS ECS / Fargate
	_, err = GetAWSFargateMetadata(true)
	if err == nil {
		return "aws_fargate"
	}
	// Check if Softlayer
	_, err = GetSoftlayerMetadata(true)
	if err == nil {
		return "softlayer"
	}
	return "unknown"
}

type CloudMetadata struct {
	CloudProvider     string   `json:"cloud_provider"`
	TaskARN           string   `json:"task_arn,omitempty"`
	Family            string   `json:"family,omitempty"`
	InstanceID        string   `json:"instance_id,omitempty"`
	PublicIP          []string `json:"public_ip"`
	PrivateIP         []string `json:"private_ip"`
	NetworkMode       string   `json:"network_mode,omitempty"`
	InstanceType      string   `json:"instance_type,omitempty"`
	Hostname          string   `json:"hostname,omitempty"`
	KernelId          string   `json:"kernel_id,omitempty"`
	ID                string   `json:"id,omitempty"`
	Label             string   `json:"label,omitempty"`
	DataCenter        string   `json:"data_center,omitempty"`
	Domain            string   `json:"domain,omitempty"`
	Region            string   `json:"region,omitempty"`
	Zone              string   `json:"zone,omitempty"`
	Name              string   `json:"name,omitempty"`
	MachineType       string   `json:"machine_type,omitempty"`
	VmID              string   `json:"vm_id,omitempty"`
	VMSize            string   `json:"vm_size,omitempty"`
	OsType            string   `json:"os_type,omitempty"`
	SKU               string   `json:"sku,omitempty"`
	ResourceGroupName string   `json:"resource_group_name,omitempty"`
}

type GoogleCloudMetadataAll struct {
	Attributes struct {
	} `json:"attributes"`
	CPUPlatform string `json:"cpuPlatform"`
	Description string `json:"description"`
	Disks       []struct {
		DeviceName string `json:"deviceName"`
		Index      int    `json:"index"`
		Mode       string `json:"mode"`
		Type       string `json:"type"`
	} `json:"disks"`
	Hostname string `json:"hostname"`
	ID       int64  `json:"id"`
	Image    string `json:"image"`
	Licenses []struct {
		ID string `json:"id"`
	} `json:"licenses"`
	MachineType       string `json:"machineType"`
	MaintenanceEvent  string `json:"maintenanceEvent"`
	Name              string `json:"name"`
	NetworkInterfaces []struct {
		AccessConfigs []struct {
			ExternalIP string `json:"externalIp"`
			Type       string `json:"type"`
		} `json:"accessConfigs"`
		DNSServers        []string      `json:"dnsServers"`
		ForwardedIps      []interface{} `json:"forwardedIps"`
		Gateway           string        `json:"gateway"`
		IP                string        `json:"ip"`
		IPAliases         []interface{} `json:"ipAliases"`
		Mac               string        `json:"mac"`
		Network           string        `json:"network"`
		Subnetmask        string        `json:"subnetmask"`
		TargetInstanceIps []interface{} `json:"targetInstanceIps"`
	} `json:"networkInterfaces"`
	Preempted        string `json:"preempted"`
	RemainingCPUTime int    `json:"remainingCpuTime"`
	Scheduling       struct {
		AutomaticRestart  string `json:"automaticRestart"`
		OnHostMaintenance string `json:"onHostMaintenance"`
		Preemptible       string `json:"preemptible"`
	} `json:"scheduling"`
	ServiceAccounts interface{}   `json:"serviceAccounts"`
	Tags            []interface{} `json:"tags"`
	VirtualClock    struct {
		DriftToken string `json:"driftToken"`
	} `json:"virtualClock"`
	Zone string `json:"zone"`
}

type DigitalOceanMetadataAll struct {
	DropletID  int      `json:"droplet_id"`
	Hostname   string   `json:"hostname"`
	VendorData string   `json:"vendor_data"`
	PublicKeys []string `json:"public_keys"`
	AuthKey    string   `json:"auth_key"`
	Region     string   `json:"region"`
	Interfaces struct {
		Private []struct {
			Ipv4 struct {
				IPAddress string `json:"ip_address"`
				Netmask   string `json:"netmask"`
				Gateway   string `json:"gateway"`
			} `json:"ipv4"`
			Mac  string `json:"mac"`
			Type string `json:"type"`
		} `json:"private"`
		Public []struct {
			Ipv4 struct {
				IPAddress string `json:"ip_address"`
				Netmask   string `json:"netmask"`
				Gateway   string `json:"gateway"`
			} `json:"ipv4"`
			AnchorIpv4 struct {
				IPAddress string `json:"ip_address"`
				Netmask   string `json:"netmask"`
				Gateway   string `json:"gateway"`
			} `json:"anchor_ipv4"`
			Mac  string `json:"mac"`
			Type string `json:"type"`
		} `json:"public"`
	} `json:"interfaces"`
	FloatingIP struct {
		Ipv4 struct {
			Active bool `json:"active"`
		} `json:"ipv4"`
	} `json:"floating_ip"`
	DNS struct {
		Nameservers []string `json:"nameservers"`
	} `json:"dns"`
	Tags     []string `json:"tags"`
	Features struct {
		DhcpEnabled bool `json:"dhcp_enabled"`
	} `json:"features"`
	ModifyIndex int `json:"modify_index"`
}

type AzureMetadataAll struct {
	Compute struct {
		AzEnvironment              string `json:"azEnvironment"`
		CustomData                 string `json:"customData"`
		IsHostCompatibilityLayerVM string `json:"isHostCompatibilityLayerVm"`
		Location                   string `json:"location"`
		Name                       string `json:"name"`
		Offer                      string `json:"offer"`
		OsType                     string `json:"osType"`
		PlacementGroupID           string `json:"placementGroupId"`
		Plan                       struct {
			Name      string `json:"name"`
			Product   string `json:"product"`
			Publisher string `json:"publisher"`
		} `json:"plan"`
		PlatformFaultDomain  string `json:"platformFaultDomain"`
		PlatformUpdateDomain string `json:"platformUpdateDomain"`
		Provider             string `json:"provider"`
		PublicKeys           []struct {
			KeyData string `json:"keyData"`
			Path    string `json:"path"`
		} `json:"publicKeys"`
		Publisher         string `json:"publisher"`
		ResourceGroupName string `json:"resourceGroupName"`
		ResourceID        string `json:"resourceId"`
		SecurityProfile   struct {
			SecureBootEnabled string `json:"secureBootEnabled"`
			VirtualTpmEnabled string `json:"virtualTpmEnabled"`
		} `json:"securityProfile"`
		Sku            string `json:"sku"`
		StorageProfile struct {
			DataDisks      []interface{} `json:"dataDisks"`
			ImageReference struct {
				ID        string `json:"id"`
				Offer     string `json:"offer"`
				Publisher string `json:"publisher"`
				Sku       string `json:"sku"`
				Version   string `json:"version"`
			} `json:"imageReference"`
			OsDisk struct {
				Caching          string `json:"caching"`
				CreateOption     string `json:"createOption"`
				DiffDiskSettings struct {
					Option string `json:"option"`
				} `json:"diffDiskSettings"`
				DiskSizeGB         string `json:"diskSizeGB"`
				EncryptionSettings struct {
					Enabled string `json:"enabled"`
				} `json:"encryptionSettings"`
				Image struct {
					URI string `json:"uri"`
				} `json:"image"`
				ManagedDisk struct {
					ID                 string `json:"id"`
					StorageAccountType string `json:"storageAccountType"`
				} `json:"managedDisk"`
				Name   string `json:"name"`
				OsType string `json:"osType"`
				Vhd    struct {
					URI string `json:"uri"`
				} `json:"vhd"`
				WriteAcceleratorEnabled string `json:"writeAcceleratorEnabled"`
			} `json:"osDisk"`
		} `json:"storageProfile"`
		SubscriptionID string        `json:"subscriptionId"`
		Tags           string        `json:"tags"`
		TagsList       []interface{} `json:"tagsList"`
		Version        string        `json:"version"`
		VMID           string        `json:"vmId"`
		VMScaleSetName string        `json:"vmScaleSetName"`
		VMSize         string        `json:"vmSize"`
		Zone           string        `json:"zone"`
	} `json:"compute"`
	Network struct {
		Interface []struct {
			Ipv4 struct {
				IPAddress []struct {
					PrivateIPAddress string `json:"privateIpAddress"`
					PublicIPAddress  string `json:"publicIpAddress"`
				} `json:"ipAddress"`
				Subnet []struct {
					Address string `json:"address"`
					Prefix  string `json:"prefix"`
				} `json:"subnet"`
			} `json:"ipv4"`
			Ipv6 struct {
				IPAddress []interface{} `json:"ipAddress"`
			} `json:"ipv6"`
			MacAddress string `json:"macAddress"`
		} `json:"interface"`
	} `json:"network"`
}

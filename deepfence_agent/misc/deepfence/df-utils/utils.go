package utils

import (
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/weaveworks/scope/common/hostname"
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"os/exec"
	"reflect"
	"strings"
	"time"
)

type PktDirection string
type PolicyAction string

const (
	maxIdleConnsPerHost = 1024
)

func RemoveLastCharacter(s string) string {
	r := []rune(s)
	return string(r[:len(r)-1])
}

func GetUserDefinedTagsForGivenHost(hostName string, nodeType string, consoleServer string, certPath string, deepfenceKey string) (map[string][]string, error) {
	type TagsResponse struct {
		NodeName string   `json:"node_name"`
		Tags     []string `json:"tags"`
	}
	tags := make(map[string][]string)
	url := fmt.Sprintf("%s/df-api/user-defined-tags", consoleServer) // https://1.1.1.1/df-api/user-defined-tags
	var jsonStr = []byte(fmt.Sprintf(`{"host_name":"%s","node_type":"%s"}`, hostName, nodeType))
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonStr))
	if err != nil {
		return tags, err
	}
	req.Header.Add("deepfence-key", deepfenceKey)
	req.Header.Add("Content-Type", "application/json")
	httpClient, err := BuildHttpClientWithCert(certPath)
	if err != nil {
		return tags, err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return tags, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return tags, errors.New(resp.Status)
	}
	decoder := json.NewDecoder(resp.Body)
	var tagsResponse []TagsResponse
	err = decoder.Decode(&tagsResponse)
	if err != nil {
		return tags, err
	}
	for _, tagResp := range tagsResponse {
		tags[tagResp.NodeName] = tagResp.Tags
	}
	return tags, nil
}

func BuildHttpClientWithCert(certPath string) (*http.Client, error) {
	// Set up our own certificate pool
	tlsConfig := &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true}
	transport := &http.Transport{
		MaxIdleConnsPerHost: maxIdleConnsPerHost,
		TLSHandshakeTimeout: 0 * time.Second,
		TLSClientConfig:     tlsConfig}
	client := &http.Client{Transport: transport}

	// Load our trusted certificate path
	pemData, err := ioutil.ReadFile(certPath)
	if err != nil {
		return nil, err
	}
	ok := tlsConfig.RootCAs.AppendCertsFromPEM(pemData)
	if !ok {
		return nil, errors.New("unable to append certificates to PEM")
	}
	return client, nil
}

func GetKubernetesClusterId() string {
	var kubeSystemNamespaceUid string
	serviceHost := os.Getenv("KUBERNETES_SERVICE_HOST")
	servicePort := os.Getenv("KUBERNETES_SERVICE_PORT")
	caCertPool := x509.NewCertPool()
	caCert, caToken, err := getK8sCaCert()
	if err != nil {
		return ""
	}
	caCertPool.AppendCertsFromPEM(caCert)
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: caCertPool}}}

	// Get kubeSystemNamespaceUid
	url := fmt.Sprintf("https://%s:%s/api/v1/namespaces/kube-system", serviceHost, servicePort)
	req, err := http.NewRequest(http.MethodGet, url, bytes.NewBuffer([]byte{}))
	if err == nil {
		req.Header.Add("Content-Type", "application/json")
		req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", string(caToken)))
		resp, err := client.Do(req)
		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				bodyBytes, err := ioutil.ReadAll(resp.Body)
				if err == nil {
					var kubeSystemNamespaceDetails k8sNamespaceDetails
					err = json.Unmarshal(bodyBytes, &kubeSystemNamespaceDetails)
					if err == nil {
						kubeSystemNamespaceUid = kubeSystemNamespaceDetails.Metadata.UID
					}
				}
			}
		}
	}
	return kubeSystemNamespaceUid
}

func GetAllLocalIps() []string {
	var localIps []string
	ifaces, _ := net.Interfaces()
	// handle err
	for _, i := range ifaces {
		addrs, _ := i.Addrs()
		// handle err
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			localIps = append(localIps, ip.String())
		}
	}
	localIps = append(localIps, "0.0.0.0")
	localIps = append(localIps, "::")
	return localIps
}

func RemoveFromArray(array []string, val string) []string {
	for i, v := range array {
		if v == val {
			return append(array[:i], array[i+1:]...)
		}
	}
	return array
}

type k8sNamespaceDetails struct {
	Metadata struct {
		Name string `json:"name"`
		UID  string `json:"uid"`
	} `json:"metadata"`
}

type k8sNodeInfo struct {
	Metadata struct {
		Name   string            `json:"name"`
		UID    string            `json:"uid"`
		Labels map[string]string `json:"labels"`
	} `json:"metadata"`
	Status struct {
		NodeInfo struct {
			KernelVersion           string `json:"kernelVersion"`
			OsImage                 string `json:"osImage"`
			ContainerRuntimeVersion string `json:"containerRuntimeVersion"`
			KubeletVersion          string `json:"kubeletVersion"`
			KubeProxyVersion        string `json:"kubeProxyVersion"`
			OperatingSystem         string `json:"operatingSystem"`
			Architecture            string `json:"architecture"`
		} `json:"nodeInfo"`
	} `json:"status"`
}

func getK8sCaCert() ([]byte, []byte, error) {
	caCert, err := ioutil.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt")
	if err != nil {
		return nil, nil, err
	}
	caToken, err := ioutil.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/token")
	return caCert, caToken, err
}

func GetKubernetesDetails() (string, string, string, string, error) {
	var kubeSystemNamespaceUid string
	kubeClusterName := os.Getenv("DF_CLUSTER_NAME")
	var kubernetesVersion string
	var kubernetesNodeRole string
	kubeSystemNamespaceUid = GetKubernetesClusterId()
	if kubeClusterName == "" {
		kubeClusterName = kubeSystemNamespaceUid
	}
	serviceHost := os.Getenv("KUBERNETES_SERVICE_HOST")
	servicePort := os.Getenv("KUBERNETES_SERVICE_PORT")
	caCertPool := x509.NewCertPool()
	caCert, caToken, err := getK8sCaCert()
	if err != nil {
		return kubeSystemNamespaceUid, kubeClusterName, kubernetesVersion, kubernetesNodeRole, err
	}
	caCertPool.AppendCertsFromPEM(caCert)
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: caCertPool}}}

	// Get kubernetesVersion, kubernetesNodeRole
	k8sHostName := GetRealHostName()
	url := fmt.Sprintf("https://%s:%s/api/v1/nodes/%s", serviceHost, servicePort, k8sHostName)
	req, err := http.NewRequest(http.MethodGet, url, bytes.NewBuffer([]byte{}))
	if err == nil {
		req.Header.Add("Content-Type", "application/json")
		req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", string(caToken)))
		resp, err := client.Do(req)
		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				bodyBytes, err := ioutil.ReadAll(resp.Body)
				if err == nil {
					var k8sCurrentNodeInfo k8sNodeInfo
					err = json.Unmarshal(bodyBytes, &k8sCurrentNodeInfo)
					if err == nil {
						kubernetesVersion = k8sCurrentNodeInfo.Status.NodeInfo.KubeletVersion
						// Convert 'v1.13.0' to '1.13'
						kubernetesVersion = kubernetesVersion[1:]
						k8sVersionSplit := strings.Split(kubernetesVersion, ".")
						if len(k8sVersionSplit) >= 2 {
							kubernetesVersion = k8sVersionSplit[0] + "." + k8sVersionSplit[1]
						}
						kubernetesNodeRole = "node"
						for labelKey, labelValue := range k8sCurrentNodeInfo.Metadata.Labels {
							if labelKey == "node-role.kubernetes.io/master" {
								kubernetesNodeRole = "master"
								break
							} else if labelKey == "kubernetes.io/role" {
								if labelValue == "master" {
									kubernetesNodeRole = "master"
								}
								break
							} else if labelKey == "node-role.kubernetes.io/agent" {
								break
							}
						}
					}
				}
			}
		}
	}
	return kubeSystemNamespaceUid, kubeClusterName, kubernetesVersion, kubernetesNodeRole, err
}

func InArray(val interface{}, array interface{}) (exists bool, index int) {
	exists = false
	index = -1

	switch reflect.TypeOf(array).Kind() {
	case reflect.Slice:
		s := reflect.ValueOf(array)

		for i := 0; i < s.Len(); i++ {
			if reflect.DeepEqual(val, s.Index(i).Interface()) == true {
				index = i
				exists = true
				return
			}
		}
	}
	return
}

func ExecuteCommand(commandStr string) (string, error) {
	cmd := exec.Command("/bin/sh", "-c", commandStr)
	var commandOut bytes.Buffer
	var commandErr bytes.Buffer
	cmd.Stdout = &commandOut
	cmd.Stderr = &commandErr
	err := cmd.Run()
	if err != nil {
		return strings.TrimSpace(commandErr.String()), err
	}
	return strings.TrimSpace(commandOut.String()), nil
}

func ExecuteCommandInBackground(commandStr string) error {
	cmd := exec.Command("/bin/sh", "-c", commandStr)
	err := cmd.Start()
	go WaitFunction(cmd)
	return err
}

func IsThisHostUIMachine() bool {
	value := os.Getenv("DF_PROG_NAME")
	if len(value) == 0 || value != "discovery" {
		return false
	}
	return true
}

func FileExists(name string) bool {
	// Reports whether the named file or directory exists.
	if _, err := os.Stat(name); err != nil {
		if os.IsNotExist(err) {
			return false
		}
	}
	return true
}

func WaitFunction(command *exec.Cmd) {
	command.Wait()
}

func GetHostName() string {
	return hostname.Get()
}

func GetRealHostName() string {
	// GetHostName() will give modified hostname as per SCOPE_HOSTNAME env.
	// We need real hostname in some places
	if hostName := os.Getenv("AGENT_HOSTNAME"); hostName != "" {
		return hostName
	}
	hostName, err := os.Hostname()
	if err != nil {
		if hostName = os.Getenv("SCOPE_HOSTNAME"); hostName != "" {
			return hostName
		}
	}
	return hostName
}

func RoutedInterface(network string, flags net.Flags) *net.Interface {
	switch network {
	case "ip", "ip4", "ip6":
	default:
		return nil
	}
	ift, err := net.Interfaces()
	if err != nil {
		return nil
	}
	for _, ifi := range ift {
		if ifi.Flags&flags != flags {
			continue
		}
		if _, ok := hasRoutableIP(network, &ifi); !ok {
			continue
		}
		return &ifi
	}
	return nil
}

func hasRoutableIP(network string, ifi *net.Interface) (net.IP, bool) {
	ifat, err := ifi.Addrs()
	if err != nil {
		return nil, false
	}
	for _, ifa := range ifat {
		switch ifa := ifa.(type) {
		case *net.IPAddr:
			if ip := routableIP(network, ifa.IP); ip != nil {
				return ip, true
			}
		case *net.IPNet:
			if ip := routableIP(network, ifa.IP); ip != nil {
				return ip, true
			}
		}
	}
	return nil, false
}

func routableIP(network string, ip net.IP) net.IP {
	if !ip.IsLoopback() && !ip.IsLinkLocalUnicast() && !ip.IsGlobalUnicast() {
		return nil
	}
	switch network {
	case "ip4":
		if ip := ip.To4(); ip != nil {
			return ip
		}
	case "ip6":
		if ip.IsLoopback() { // addressing scope of the loopback address depends on each implementation
			return nil
		}
		if ip := ip.To16(); ip != nil && ip.To4() == nil {
			return ip
		}
	default:
		if ip := ip.To4(); ip != nil {
			return ip
		}
		if ip := ip.To16(); ip != nil {
			return ip
		}
	}
	return nil
}

func GetDefaultRouteIPAddress() (ipaddr string, interfaceName string, err error) {
	// get ip address of default route
	routedInterfaces := RoutedInterface("ip4", net.FlagUp|net.FlagBroadcast)
	if routedInterfaces != nil {
		interfaceAddrs, err := routedInterfaces.Addrs()
		if err != nil {
			return "", "", err
		}
		for _, interfaceAddr := range interfaceAddrs {
			switch addr := interfaceAddr.(type) {
			case *net.IPNet:
				if addr.IP.To4() != nil {
					return addr.IP.String(), routedInterfaces.Name, nil
				}
			case *net.IPAddr:
				if addr.IP.To4() != nil {
					return addr.IP.String(), routedInterfaces.Name, nil
				}
			}
		}
	}
	return "", "", errors.New("no interfaces found")
}

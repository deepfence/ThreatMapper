package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"sort"
	"strings"
	"time"

	dfUtils "github.com/deepfence/df-utils"
)

var (
	scanId                string
	ignoreValues          []string
	ignoreValuesLen       = 0
	kubernetesClusterName string
	kubernetesClusterId   string
	dfInstallDir          = ""
	dfLogDir              = ""
	dfComplianceDir       = ""
	kubeNodeRole          = "master"
)

const (
	nodeTypeHost      = "host"
	nodeTypeContainer = "container"
	nodeTypeImage     = "container_image"
	esScanDocType     = "compliance"
	esScanLogsDocType = "compliance-scan-logs"
)

type ComplianceScan struct {
	Type                  string `json:"type"`
	TimeStamp             int64  `json:"time_stamp"`
	NodeId                string `json:"node_id"`
	NodeType              string `json:"node_type"`
	KubernetesClusterName string `json:"kubernetes_cluster_name"`
	NodeName              string `json:"node_name"`
	TestCategory          string `json:"test_category"`
	TestNumber            string `json:"test_number"`
	TestInfo              string `json:"description"`
	Masked                string `json:"masked,omitempty"`
	RemediationScript     string `json:"remediation_script,omitempty"`
	RemediationAnsible    string `json:"remediation_ansible,omitempty"`
	RemediationPuppet     string `json:"remediation_puppet,omitempty"`
	TestRationale         string `json:"test_rationale"`
	TestSeverity          string `json:"test_severity"`
	TestDesc              string `json:"test_desc"`
	Status                string `json:"status"`
	ComplianceCheckType   string `json:"compliance_check_type"`
	ScanId                string `json:"scan_id"`
	ComplianceNodeType    string `json:"compliance_node_type"`
}
type ComplianceScanLog struct {
	Type                  string         `json:"type"`
	TimeStamp             int64          `json:"time_stamp"`
	NodeId                string         `json:"node_id"`
	NodeType              string         `json:"node_type"`
	KubernetesClusterName string         `json:"kubernetes_cluster_name"`
	KubernetesClusterId   string         `json:"kubernetes_cluster_id"`
	NodeName              string         `json:"node_name"`
	ScanStatus            string         `json:"scan_status"`
	ScanMessage           string         `json:"scan_message"`
	ComplianceCheckType   string         `json:"compliance_check_type"`
	TotalChecks           int            `json:"total_checks"`
	Result                map[string]int `json:"result"`
	ScanId                string         `json:"scan_id"`
}

func addComplianceScanLog(openscapLogsFile *os.File, nodeID string, kubernetesClusterName string, nodeType string, nodeName string, scanMessage string, scanStatus string, complianceCheckType string, totalChecks int, resultMap map[string]int) {
	openscapScanLog := ComplianceScanLog{ScanId: scanId, Type: esScanLogsDocType, TimeStamp: dfUtils.GetTimestamp(), NodeId: nodeID, NodeType: nodeType, KubernetesClusterName: kubernetesClusterName, KubernetesClusterId: kubernetesClusterId, NodeName: nodeName, ScanMessage: scanMessage, ScanStatus: scanStatus, ComplianceCheckType: complianceCheckType, TotalChecks: totalChecks, Result: resultMap}
	openscapScanLogStr, err := json.Marshal(openscapScanLog)
	if err != nil {
		return
	}
	dfUtils.AppendTextToFile(openscapLogsFile, string(openscapScanLogStr)+"\n")
	openscapLogsFile.Sync()
}

func main() {
	var complianceCheckType string
	var nodeType string
	var containerID string
	var imageName string
	var imageId string
	var ignoreFileName string
	f, _ := os.Create("/tmp/cdebug.log")
	defer f.Close()

	_, _ = f.WriteString("it is working all good\n")
	f.Sync()

	installDir, exists := os.LookupEnv("DF_INSTALL_DIR")
	if exists {
		dfInstallDir = installDir
	}
	dfLogDir = dfInstallDir + "/var/log/fenced"
	dfComplianceDir = dfInstallDir + "/usr/local/bin/compliance_check"
	fmt.Println("DF log directory: ", dfLogDir)
	fmt.Println("DF Compliance directory: ", dfComplianceDir)

	openscapLogsFileName := dfLogDir + "/compliance-scan-logs/debug.log"
	openscapLogsFile, err := os.OpenFile(openscapLogsFileName, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	if err != nil {
		fmt.Println("Unable to create file for logging to es")
		os.Exit(1)
	}
	defer openscapLogsFile.Close()

	flag.StringVar(&complianceCheckType, "compliance-check-type", "", "\t Choose from gdpr, hipaa, pci, nist")
	flag.StringVar(&nodeType, "node-type", "", "\t Choose from host, container, container_image")
	flag.StringVar(&kubeNodeRole, "k8-node-role", "", "\t K8 Worker or Master node")
	flag.StringVar(&kubernetesClusterName, "k8-name", "", "\t Choose from k8 name")
	flag.StringVar(&kubernetesClusterId, "k8-id", "", "\t Choose from k8 id")
	flag.StringVar(&scanId, "scan-id", "", "\t Scan Id for k8 nodes")
	flag.StringVar(&containerID, "container-id", "", "\t Container ID (Only when node-type is container)")
	flag.StringVar(&imageName, "image-name", "", "\t Image name (Only when node-type is container_image)")
	flag.StringVar(&imageId, "image-id", "", "\t Image ID (Only when node-type is container_image)")
	flag.StringVar(&ignoreFileName, "ignore-file-name", "", "\t Filename that contains entries to be ignored while sending out results ")
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s [options]\n\n", os.Args[0])
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nE.g. ./deepfence_compliance_check -compliance-check-type \"cis\" -node-type \"host\" \n")
		fmt.Fprintf(os.Stderr, "E.g. ./deepfence_compliance_check -compliance-check-type \"pcidss\" -node-type \"container\" -container-id \"1234\" \n")
		fmt.Fprintf(os.Stderr, "E.g. ./deepfence_compliance_check -compliance-check-type \"pcidss\" -node-type \"container_image\" -image-name \"1234\" -image-id \"1234\" \n")
	}
	flag.Parse()

	_, _ = f.WriteString("parsing done completely\n")

	if ignoreFileName != "" {
		ignoreValues = readIgnoreFile(ignoreFileName)
		ignoreValuesLen = len(ignoreValues)
		if ignoreValuesLen > 0 {
			sort.Strings(ignoreValues)
		}
		os.Remove(ignoreFileName)
	}

	nodeID := ""
	hostName := dfUtils.GetHostName()
	nodeName := hostName
	resultMap := map[string]int{}
	addComplianceScanLog(openscapLogsFile, nodeID, kubernetesClusterName, nodeType, nodeName, "", nodeName+hostName, complianceCheckType, 0, resultMap)
	if nodeType == nodeTypeContainer {
		containerName, err := dfUtils.GetContainerNameFromID(containerID)
		if err == nil {
			nodeName = hostName + containerName
		}
		nodeID = containerID + ";<container>"
	} else if nodeType == nodeTypeImage {
		nodeID = imageName + ";<container_image>"
		nodeName = imageName
	} else {
		nodeID = nodeName + ";<" + nodeType + ">"
	}
	if complianceCheckType == "" || nodeType == "" {
		flag.Usage()
		addComplianceScanLog(openscapLogsFile, nodeID, kubernetesClusterName, nodeType, nodeName, "Incorrect usage", "ERROR", complianceCheckType, 0, resultMap)
		os.Exit(1)
	}
	if nodeType == nodeTypeContainer && containerID == "" {
		errMsg := fmt.Sprintf("container-id is required for container scan")
		fmt.Println(errMsg)
		addComplianceScanLog(openscapLogsFile, nodeID, kubernetesClusterName, nodeType, nodeName, errMsg, "ERROR", complianceCheckType, 0, resultMap)
		os.Exit(1)
	}
	if nodeType == nodeTypeImage && (imageName == "" || imageId == "") {
		errMsg := fmt.Sprintf("image-name and image-id are required for image scan")
		fmt.Println(errMsg)
		addComplianceScanLog(openscapLogsFile, nodeID, kubernetesClusterName, nodeType, nodeName, errMsg, "ERROR", complianceCheckType, 0, resultMap)
		os.Exit(1)
	}
	command := ""
	tmpDir := ""
	openscapResultsFile := ""
	//var linuxDistribution string
	if scanId == "" {
		scanId = fmt.Sprintf("%s_%s_%s", complianceCheckType, nodeID, getDatetimeNow())
	}

	stopLoggingInProgress := make(chan bool)
	go func() {
		addComplianceScanLog(openscapLogsFile, nodeID, kubernetesClusterName, nodeType, nodeName, "", "INPROGRESS", complianceCheckType, 0, resultMap)
		ticker := time.NewTicker(2 * time.Minute)
		for {
			select {
			case <-ticker.C:
				addComplianceScanLog(openscapLogsFile, nodeID, kubernetesClusterName, nodeType, nodeName, "", "SCAN_IN_PROGRESS", complianceCheckType, 0, resultMap)
			case <-stopLoggingInProgress:
				return
			}
		}
	}()

	logErrorAndExit := func(errMsg string) {
		stopLoggingInProgress <- true
		time.Sleep(2 * time.Second)
		fmt.Println(errMsg)
		addComplianceScanLog(openscapLogsFile, nodeID, kubernetesClusterName, nodeType, nodeName, errMsg, "ERROR", complianceCheckType, 0, resultMap)
		os.Exit(1)
	}

	var kubeSuffix string
	var complianceNodeType string
	if kubernetesClusterId != "" {
		kubeSuffix = "kube"
		complianceNodeType = "kubernetes"
	} else {
		complianceNodeType = "linux"
	}
	if complianceCheckType == dfUtils.CheckTypeHIPAA {
		command = fmt.Sprintf(dfComplianceDir + "/compliance --bench-id hipaa" + kubeSuffix)
	} else if complianceCheckType == dfUtils.CheckTypeNIST {
		command = fmt.Sprintf(dfComplianceDir + "/compliance --bench-id nist" + kubeSuffix)
	} else if complianceCheckType == dfUtils.CheckTypePCI {
		command = fmt.Sprintf(dfComplianceDir + "/compliance --bench-id pci" + kubeSuffix)
	} else if complianceCheckType == dfUtils.CheckTypeGDPR {
		command = fmt.Sprintf(dfComplianceDir + "/compliance --bench-id gdpr" + kubeSuffix)
	} else {
		logErrorAndExit(fmt.Sprintf("Unknown complianceCheckType: " + complianceCheckType + ". complianceCheckType should be hipaa, pci, gdpr, nist"))
	}
	alreadyRunning := checkScanAlreadyRunning(command)
	if alreadyRunning {
		logErrorAndExit(fmt.Sprintf("Compliance scan of type '%s' already running on this node. Please wait for it to finish and then scan again.", complianceCheckType))
	}

	// If rpm based oscap scan, then "docker run" else run "./command.sh"
	//if linuxDistribution == debianBasedDistro || complianceCheckType == dfUtils.CheckTypeCIS || complianceCheckType == dfUtils.CheckTypeNISTMaster || complianceCheckType == dfUtils.CheckTypeNISTSlave || (complianceCheckType == dfUtils.CheckTypePCIDSS && (osVersion == "ubuntu1804" || osVersion == "ubuntu1604" || osVersion == "ubuntu1404" || osVersion == "debian8" || osVersion == "debian9" || osVersion == "debian10")) {
	// CIS | NIST | Oscap (debian based) | DebianPCIDSS
	var envVars = make(map[string]string)
	envVars["NODE_TYPE"] = kubeNodeRole
	envVars["pathPrefix"] = dfUtils.HostMountDir
	res, err := dfUtils.ExecuteCommand(command, envVars)
	file, _ := os.OpenFile(dfLogDir+"/compliance-scan-logs/"+"allLog.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	defer file.Close()
	if err != nil {
		dfUtils.AppendTextToFile(file, err.Error()+"\n")
	}
	dfUtils.AppendTextToFile(file, "res from ec:"+res+"\n")
	stopLoggingInProgress <- true
	time.Sleep(2 * time.Second)
	if tmpDir != "" {
		os.RemoveAll(tmpDir)
	}
	dfUtils.AppendTextToFile(file, command+"\n")
	if err != nil {
		os.Remove(openscapResultsFile)
		errMsg := fmt.Sprintf(err.Error())
		dfUtils.AppendTextToFile(file, err.Error()+"\n")
		fmt.Println(errMsg)
		addComplianceScanLog(openscapLogsFile, nodeID, kubernetesClusterName, nodeType, nodeName, errMsg, "ERROR", complianceCheckType, 0, resultMap)
		// TODO Remove below execute
		file.Close()
		os.Exit(1)
	}
	list := make([]benchItem, 0)
	scanner := bufio.NewScanner(strings.NewReader(res))
	dfUtils.AppendTextToFile(file, strings.TrimSpace(res)+"\n")
	for scanner.Scan() {
		// Read output line-by-line. Every check forms a item,
		// the first line is the header and the rest form the message
		line := scanner.Text()
		var item benchItem
		err := json.Unmarshal([]byte(line), &item)
		if err == nil {
			list = append(list, item)
		} else {
			dfUtils.AppendTextToFile(file, err.Error()+"\n")
		}
	}
	timestamp := dfUtils.GetTimestamp()
	cisScanResult := map[string]int{"pass": 0, "info": 0, "warn": 0, "note": 0}
	for _, item := range list {
		compScan := ComplianceScan{
			Type: esScanDocType, TimeStamp: timestamp, NodeId: nodeID, KubernetesClusterName: kubernetesClusterName, NodeType: nodeType, NodeName: nodeName,
			TestCategory: item.TestCategory, TestNumber: item.TestNum, TestInfo: item.Header, TestRationale: "", TestSeverity: "",
			TestDesc: item.TestNum + " - " + item.Level, Status: strings.ToLower(item.Level), ComplianceCheckType: complianceCheckType, ScanId: scanId,
			RemediationScript: item.Remediation, RemediationPuppet: item.RemediationImpact,ComplianceNodeType: complianceNodeType,
		}
		resultStr, err := json.Marshal(compScan)
		if err != nil {
			continue
		}
		if _, ok := cisScanResult[compScan.Status]; ok {
			cisScanResult[compScan.Status] += 1
		}
		logFile, _ := os.OpenFile(dfLogDir+"/compliance/"+complianceCheckType+".log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
		dfUtils.AppendTextToFile(logFile, string(resultStr)+"\n")
	}
	logFile, _ := os.OpenFile(dfLogDir+"/compliance-scan-logs/"+complianceCheckType+".log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	addComplianceScanLog(logFile, nodeID, kubernetesClusterName, nodeType, nodeName, "", "COMPLETED", complianceCheckType, cisScanResult["pass"]+cisScanResult["info"]+cisScanResult["warn"]+cisScanResult["note"], cisScanResult)

}

type benchItem struct {
	Level             string
	TestNum           string
	Group             string
	Header            string
	Profile           string // level 1, 2
	Scored            bool
	Automated         bool
	Message           string
	Remediation       string
	RemediationImpact string
	TestCategory      string
}

func getDatetimeNow() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000")
}

func readIgnoreFile(fileName string) []string {
	var retVal []string
	filePtr, fileErr := os.Open(fileName)
	if fileErr != nil {
		fmt.Printf("Error while opening file %s Reason %s\n",
			fileName, fileErr.Error())
		return []string{}
	}
	defer filePtr.Close()
	fileScanner := bufio.NewScanner(filePtr)
	for fileScanner.Scan() {
		retVal = append(retVal, fileScanner.Text())
	}
	return retVal
}

func checkScanAlreadyRunning(command string) bool {
	//	check if scan is already running
	firstChar := command[0:1]
	command = strings.Replace(command, firstChar, "["+firstChar+"]", 1)
	psOut, err := dfUtils.ExecuteCommand(fmt.Sprintf("ps aux | grep \"%s\"", command), nil)
	if err != nil {
		switch err.(type) {
		case *exec.ExitError:
			return false
		default:
			return true
		}
	}
	if psOut == "" {
		return false
	} else {
		return true
	}
}

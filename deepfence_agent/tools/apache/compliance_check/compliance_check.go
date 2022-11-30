package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/compliance_check/internal/deepfence"
	"github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/compliance_check/util"
	dfUtils "github.com/deepfence/df-utils"
)

var (
	scanId                string
	ignoreValues          []string
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
)

func main() {
	var complianceCheckType string
	var nodeType string
	var containerID string
	var imageName string
	var imageId string
	var ignoreFileName string
	var cisVersion string
	installDir, exists := os.LookupEnv("DF_INSTALL_DIR")
	if exists {
		dfInstallDir = installDir
	}
	dfLogDir = dfInstallDir + "/var/log/fenced"
	dfComplianceDir = dfInstallDir + "/usr/local/bin/compliance_check"

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
	flag.StringVar(&cisVersion, "cis-version", "1.6.0", "\t CIS Version of kubernetes benchmark")
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s [options]\n\n", os.Args[0])
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nE.g. ./deepfence_compliance_check -compliance-check-type \"hipaa\" -node-type \"host\" \n")
		fmt.Fprintf(os.Stderr, "E.g. ./deepfence_compliance_check -compliance-check-type \"pci\" -node-type \"container\" -container-id \"1234\" \n")
		fmt.Fprintf(os.Stderr, "E.g. ./deepfence_compliance_check -compliance-check-type \"gdpr\" -node-type \"container_image\" -image-name \"1234\" -image-id \"1234\" \n")
	}
	flag.Parse()

	if ignoreFileName != "" {
		ignoreValues = readIgnoreFile(ignoreFileName)
		if len(ignoreValues) > 0 {
			sort.Strings(ignoreValues)
		}
		os.Remove(ignoreFileName)
	}

	nodeID := ""
	hostName := dfUtils.GetHostName()
	nodeName := hostName
	resultMap := map[string]int{}
	var kubeSuffix string
	var complianceNodeType string
	if kubernetesClusterId != "" {
		kubeSuffix = "kube"
		complianceNodeType = "kubernetes"
	} else {
		complianceNodeType = "linux"
	}

	if complianceCheckType == "" || nodeType == "" {
		flag.Usage()
		os.Exit(1)
	}
	if nodeType == nodeTypeContainer && containerID == "" {
		fmt.Println("container-id is required for container scan")
		os.Exit(1)
	}
	if nodeType == nodeTypeImage && (imageName == "" || imageId == "") {
		fmt.Println("image-name and image-id are required for image scan")
		os.Exit(1)
	}

	var containerName string
	var err error
	if nodeType == nodeTypeContainer {
		containerName, err = dfUtils.GetContainerNameFromID(containerID)
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
	if scanId == "" {
		scanId = fmt.Sprintf("%s_%s_%s", complianceCheckType, nodeID, dfUtils.GetDatetimeNow())
	}

	config := util.Config{
		ManagementConsolePort: os.Getenv("MGMT_CONSOLE_PORT"),
		ManagementConsoleUrl:  os.Getenv("MGMT_CONSOLE_URL"),
		DeepfenceKey:          os.Getenv("DEEPFENCE_KEY"),
		KubernetesClusterName: kubernetesClusterName,
		KubernetesClusterId:   kubernetesClusterId,
		NodeType:              nodeType,
		NodeName:              nodeName,
		ComplianceCheckType:   complianceCheckType,
		HostName:              hostName,
		ContainerID:           containerID,
		ComplianceNodeType:    complianceNodeType,
		ScanId:                scanId,
		ContainerName:         containerName,
		NodeId:                nodeID,
	}
	dfClient, err := deepfence.NewClient(config)
	if err != nil {
		addToAllLog("Error initializing df client " + err.Error())
		os.Exit(1)
	}
	// err = dfClient.SendScanStatustoConsole("", "QUEUED", 0, resultMap)
	err = dfClient.WriteScanStatusToFile(dfLogDir, "", "QUEUED", 0, resultMap)
	if err != nil {
		addToAllLog("Error in sending Queued status to console" + err.Error())
	}

	command := ""
	stopLoggingInProgress := make(chan bool)
	go func() {
		// err := dfClient.SendScanStatustoConsole("", "INPROGRESS", 0, resultMap)
		err := dfClient.WriteScanStatusToFile(dfLogDir, "", "INPROGRESS", 0, resultMap)
		if err != nil {
			addToAllLog("Error in sending in progress status to console" + err.Error())
		}
		ticker := time.NewTicker(2 * time.Minute)
		for {
			select {
			case <-ticker.C:
				// err := dfClient.SendScanStatustoConsole("", "SCAN_IN_PROGRESS", 0, resultMap)
				err := dfClient.WriteScanStatusToFile(dfLogDir, "", "SCAN_IN_PROGRESS", 0, resultMap)
				if err != nil {
					addToAllLog("Error in sending inProgress status to console" + err.Error())
				}
			case <-stopLoggingInProgress:
				return
			}
		}
	}()

	logErrorAndExit := func(errMsg string) {
		stopLoggingInProgress <- true
		time.Sleep(2 * time.Second)
		// err := dfClient.SendScanStatustoConsole(errMsg, "ERROR", 0, resultMap)
		err := dfClient.WriteScanStatusToFile(dfLogDir, errMsg, "ERROR", 0, resultMap)
		if err != nil {
			addToAllLog("Error in sending Error status to console" + err.Error())
		}
		os.Exit(1)
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

	var envVars = make(map[string]string)
	envVars["NODE_TYPE"] = kubeNodeRole
	envVars["pathPrefix"] = dfUtils.HostMountDir
	envVars["CIS_VERSION"] = cisVersion
	res, err := dfUtils.ExecuteCommand(command, envVars)
	stopLoggingInProgress <- true
	time.Sleep(2 * time.Second)
	addToAllLog(command)
	if err != nil {
		errMsg := err.Error()
		addToAllLog("Error from executing command: " + command + ", error:" + errMsg)
		// err := dfClient.SendScanStatustoConsole(errMsg, "ERROR", 0, resultMap)
		err := dfClient.WriteScanStatusToFile(dfLogDir, errMsg, "ERROR", 0, resultMap)
		if err != nil {
			addToAllLog("Error in sending Error status to console" + err.Error())
		}
		os.Exit(1)
	}
	list := make([]benchItem, 0)
	scanner := bufio.NewScanner(strings.NewReader(res))
	for scanner.Scan() {
		// Read output line-by-line. Every check forms a item,
		// the first line is the header and the rest form the message
		line := scanner.Text()
		var item benchItem
		err := json.Unmarshal([]byte(line), &item)
		if err == nil {
			list = append(list, item)
		} else {
			addToAllLog("json.Unmarshal: " + err.Error())
		}
	}
	timestamp := dfUtils.GetTimestamp()
	timestampStr := dfUtils.GetDatetimeNow()
	scanResult := map[string]int{"pass": 0, "info": 0, "warn": 0, "note": 0}
	var complianceScanResults []util.ComplianceScan
	for _, item := range list {
		compScan := util.ComplianceScan{
			Type:                  util.ComplianceScanIndexName,
			TimeStamp:             timestamp,
			Timestamp:             timestampStr,
			Masked:                "false",
			TestCategory:          item.TestCategory,
			TestNumber:            item.TestNum,
			TestInfo:              item.Header,
			TestRationale:         "",
			TestSeverity:          "",
			TestDesc:              item.TestNum + " - " + item.Level,
			Status:                strings.ToLower(item.Level),
			RemediationScript:     item.Remediation,
			RemediationPuppet:     item.RemediationImpact,
			NodeId:                config.NodeId,
			KubernetesClusterName: config.KubernetesClusterName,
			KubernetesClusterId:   config.KubernetesClusterId,
			NodeType:              config.NodeType,
			NodeName:              config.NodeName,
			ComplianceCheckType:   config.ComplianceCheckType,
			ScanId:                config.ScanId,
			ComplianceNodeType:    config.ComplianceNodeType,
		}
		complianceScanResults = append(complianceScanResults, compScan)
		if _, ok := scanResult[compScan.Status]; ok {
			scanResult[compScan.Status] += 1
		}
	}
	// err = dfClient.SendComplianceResultToConsole(complianceScanResults)
	err = dfClient.WriteComplianceResultToFile(dfLogDir, complianceScanResults)
	if err != nil {
		addToAllLog("Error in sending Compliance Result to console" + err.Error())
	}
	// err = dfClient.SendScanStatustoConsole("", "COMPLETED", scanResult["pass"]+scanResult["info"]+scanResult["warn"]+scanResult["note"], scanResult)
	err = dfClient.WriteScanStatusToFile(dfLogDir, "", "COMPLETED", scanResult["pass"]+scanResult["info"]+scanResult["warn"]+scanResult["note"], scanResult)
	if err != nil {
		addToAllLog("Error in send completed scan status to console:" + err.Error())
	}
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

func addToAllLog(message string) {
	file, _ := os.OpenFile(dfLogDir+"/compliance-scan.logfile", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	dfUtils.AppendTextToFile(file, message+"\n")
	file.Close()
}

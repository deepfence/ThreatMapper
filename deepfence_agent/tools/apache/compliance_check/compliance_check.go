package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/compliance_check/internal/deepfence"
	"github.com/deepfence/ThreatMapper/deepfence_agent/tools/apache/compliance_check/util"
	dfUtils "github.com/deepfence/df-utils"
	"os"
	"os/exec"
	"sort"
	"strings"
	"time"
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
)

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
	var kubeSuffix string
	var complianceNodeType string
	if kubernetesClusterId != "" {
		kubeSuffix = "kube"
		complianceNodeType = "kubernetes"
	} else {
		complianceNodeType = "linux"
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
	}
	dfClient, _ := deepfence.NewClient(config)
	dfClient.SendScanStatustoConsole("", "QUEUED", 0, resultMap)
	if nodeType == nodeTypeContainer {
		containerName, err := dfUtils.GetContainerNameFromID(containerID)
		if err == nil {
			nodeName = hostName + containerName
		}
		config.ContainerName = containerName
		nodeID = containerID + ";<container>"
	} else if nodeType == nodeTypeImage {
		nodeID = imageName + ";<container_image>"
		nodeName = imageName
	} else {
		nodeID = nodeName + ";<" + nodeType + ">"
	}
	config.NodeId = nodeID
	dfClient.UpdateConfig(config)

	if complianceCheckType == "" || nodeType == "" {
		flag.Usage()
		dfClient.SendScanStatustoConsole("Incorrect usage", "ERROR", 0, resultMap)
		os.Exit(1)
	}
	if nodeType == nodeTypeContainer && containerID == "" {
		errMsg := fmt.Sprintf("container-id is required for container scan")
		fmt.Println(errMsg)
		dfClient.SendScanStatustoConsole(errMsg, "ERROR", 0, resultMap)
		os.Exit(1)
	}
	if nodeType == nodeTypeImage && (imageName == "" || imageId == "") {
		errMsg := fmt.Sprintf("image-name and image-id are required for image scan")
		fmt.Println(errMsg)
		dfClient.SendScanStatustoConsole(errMsg, "ERROR", 0, resultMap)
		os.Exit(1)
	}
	command := ""
	openscapResultsFile := ""
	//var linuxDistribution string
	if scanId == "" {
		scanId = fmt.Sprintf("%s_%s_%s", complianceCheckType, nodeID, getDatetimeNow())
	}

	stopLoggingInProgress := make(chan bool)
	go func() {
		dfClient.SendScanStatustoConsole("", "INPROGRESS", 0, resultMap)
		ticker := time.NewTicker(2 * time.Minute)
		for {
			select {
			case <-ticker.C:
				dfClient.SendScanStatustoConsole("", "SCAN_IN_PROGRESS", 0, resultMap)
			case <-stopLoggingInProgress:
				return
			}
		}
	}()

	logErrorAndExit := func(errMsg string) {
		stopLoggingInProgress <- true
		time.Sleep(2 * time.Second)
		fmt.Println(errMsg)
		dfClient.SendScanStatustoConsole(errMsg, "ERROR", 0, resultMap)
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
	alreadyRunning := checkScanAlreadyRunning(command)
	if alreadyRunning {
		logErrorAndExit(fmt.Sprintf("Compliance scan of type '%s' already running on this node. Please wait for it to finish and then scan again.", complianceCheckType))
	}

	var envVars = make(map[string]string)
	envVars["NODE_TYPE"] = kubeNodeRole
	envVars["pathPrefix"] = dfUtils.HostMountDir
	res, err := dfUtils.ExecuteCommand(command, envVars)
	file, _ := os.OpenFile(dfLogDir+"/compliance-scan-logs/allLog.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	defer file.Close()
	stopLoggingInProgress <- true
	time.Sleep(2 * time.Second)
	dfUtils.AppendTextToFile(file, command+"\n")
	if err != nil {
		os.Remove(openscapResultsFile)
		errMsg := fmt.Sprintf(err.Error())
		dfUtils.AppendTextToFile(file, err.Error()+"\n")
		fmt.Println(errMsg)
		dfClient.SendScanStatustoConsole(errMsg, "ERROR", 0, resultMap)
		// TODO Remove below execute
		file.Close()
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
			dfUtils.AppendTextToFile(file, err.Error()+"\n")
		}
	}
	timestamp := dfUtils.GetTimestamp()
	cisScanResult := map[string]int{"pass": 0, "info": 0, "warn": 0, "note": 0}
	for _, item := range list {
		compScan := util.ComplianceScan{
			TimeStamp:         timestamp,
			TestCategory:      item.TestCategory,
			TestNumber:        item.TestNum,
			TestInfo:          item.Header,
			TestRationale:     "",
			TestSeverity:      "",
			TestDesc:          item.TestNum + " - " + item.Level,
			Status:            strings.ToLower(item.Level),
			RemediationScript: item.Remediation,
			RemediationPuppet: item.RemediationImpact,
		}
		err := dfClient.SendComplianceResultToConsole(compScan)
		if err != nil {
			continue
		}
		if _, ok := cisScanResult[compScan.Status]; ok {
			cisScanResult[compScan.Status] += 1
		}
	}
	dfClient.SendScanStatustoConsole("", "COMPLETED", cisScanResult["pass"]+cisScanResult["info"]+cisScanResult["warn"]+cisScanResult["note"], cisScanResult)
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

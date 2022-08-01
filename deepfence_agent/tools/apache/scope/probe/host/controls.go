package host

import (
	"bufio"
	"encoding/json"
	"fmt"
	dfUtils "github.com/deepfence/df-utils"
	log "github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/common/xfer"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
)

// Control IDs used by the host integration.
const (
	StartComplianceScan   = "start_compliance_scan"
	GetLogsFromAgent      = "get_logs_from_agent"
	GenerateSBOM          = "generate_sbom"
	AddUserDefinedTags    = "host_add_user_defined_tags"
	DeleteUserDefinedTags = "host_delete_user_defined_tags"
	StartSecretsScan      = "secret_scan_start"
	secretScanSocket      = "/tmp/secretScanner.sock"
	unixProtocol          = "unix"
	tcpProtocol           = "tcp"
)

var (
	complianceCheckTypes []string
)

func init() {
	complianceCheckTypes = []string{"hipaa", "gdpr", "nist", "pci"}
}

func (r *Reporter) registerControls() {
	r.handlerRegistry.Register(StartComplianceScan, r.startComplianceScan)
	r.handlerRegistry.Register(GetLogsFromAgent, r.getLogsFromAgent)
	r.handlerRegistry.Register(GenerateSBOM, r.handleGenerateSBOM)
	r.handlerRegistry.Register(AddUserDefinedTags, r.addUserDefinedTags)
	r.handlerRegistry.Register(DeleteUserDefinedTags, r.deleteUserDefinedTags)
	r.handlerRegistry.Register(StartSecretsScan, r.startSecretsScan)
}

func (r *Reporter) deregisterControls() {
	r.handlerRegistry.Rm(GetLogsFromAgent)
	r.handlerRegistry.Rm(GenerateSBOM)
	r.handlerRegistry.Rm(AddUserDefinedTags)
	r.handlerRegistry.Rm(DeleteUserDefinedTags)
}

func (r *Reporter) addUserDefinedTags(req xfer.Request) xfer.Response {
	tags := strings.Split(fmt.Sprintf("%s", req.ControlArgs["user_defined_tags"]), ",")
	r.userDefinedTags.Lock()
	defer r.userDefinedTags.Unlock()
	for _, tag := range tags {
		if tag != "" {
			exists, _ := dfUtils.InArray(tag, r.userDefinedTags.tags)
			if !exists {
				r.userDefinedTags.tags = append(r.userDefinedTags.tags, tag)
			}
		}
	}
	return xfer.Response{TagsInfo: "Tags added"}
}

func (r *Reporter) deleteUserDefinedTags(req xfer.Request) xfer.Response {
	tags := strings.Split(fmt.Sprintf("%s", req.ControlArgs["user_defined_tags"]), ",")
	r.userDefinedTags.Lock()
	defer r.userDefinedTags.Unlock()
	for _, tag := range tags {
		r.userDefinedTags.tags = dfUtils.RemoveFromArray(r.userDefinedTags.tags, tag)
	}
	return xfer.Response{TagsInfo: "Tags deleted"}
}

func (r *Reporter) getLogsFromAgent(req xfer.Request) xfer.Response {
	//logTypes := fmt.Sprintf("%s", req.ControlArgs["log_types"])
	var logFileNameLocMap = map[string]string{
		"discovery.logfile": getDfInstallDir() + "/var/log/fenced/discovery.logfile",
	}
	var fileInfo []map[string]string
	for logFile, logLocation := range logFileNameLocMap {
		dat, err := readFile(logLocation)
		if err == nil {
			data := map[string]string{
				"file_name": logFile,
				"data":      string(dat),
			}
			fileInfo = append(fileInfo, data)
		}
	}
	filepath.Walk(getDfInstallDir()+"/var/log/supervisor/", func(path string, f os.FileInfo, err error) error {
		if f.IsDir() {
			return nil
		}
		dat, err := readFile(path)
		if err == nil {
			data := map[string]string{
				"file_name": f.Name(),
				"data":      string(dat),
			}
			fileInfo = append(fileInfo, data)
		}
		return nil
	})
	return xfer.Response{AgentLogs: fileInfo}
}

func (r *Reporter) startComplianceScan(req xfer.Request) xfer.Response {
	// Run compliance scan
	var ignoreList, ignoreFileName, ignoreParam string
	var ignoreErr bool
	complianceCheckType := fmt.Sprintf("%s", req.ControlArgs["check_type"])
	if complianceCheckType == "" {
		return xfer.ResponseErrorf("check_type is required")
	}
	exists, _ := dfUtils.InArray(complianceCheckType, complianceCheckTypes)
	if !exists {
		return xfer.ResponseErrorf("check_type should be one of %v", complianceCheckTypes)
	}
	nodeType := fmt.Sprintf("%s", req.ControlArgs["node_type"])
	kubernetesClusterName := fmt.Sprintf("%s", req.ControlArgs["kubernetes_cluster_name"])
	kubernetesClusterId := fmt.Sprintf("%s", req.ControlArgs["kubernetes_cluster_id"])
	scanId := fmt.Sprintf("%s", req.ControlArgs["scan_id"])
	// prepend cgexec only if deepfence created groups are present
	cgexecPrefix := ""
	if _, statErr := os.Stat("/sys/fs/cgroup/cpu/medium_2"); statErr == nil {
		cgexecPrefix = "cgexec -g cpu:medium_2 "
	}
	ignoreList, ignoreErr = req.ControlArgs["ignore_test_number_list"]
	if ignoreErr == false {
		ignoreList = ""
		ignoreParam = ""
	}
	var command string
	if nodeType == nodeTypeContainer {
		containerID := fmt.Sprintf("%s", req.ControlArgs["container_id"])
		if containerID == "" {
			return xfer.ResponseErrorf("container_id is required")
		}
		if ignoreList != "" {
			ignoreFileName = fmt.Sprintf("%s/tmp/%s_%s.txt", getDfInstallDir(), complianceCheckType, containerID)
			ignoreErr := writeIgnoreFile(ignoreFileName, ignoreList)
			if ignoreErr != nil {
				log.Errorf("Unable to write to ignore file %s %v", ignoreFileName, ignoreErr)
				ignoreParam = ""
			} else {
				ignoreParam = fmt.Sprintf("-ignore-file-name %s", ignoreFileName)
			}
		}
		command = fmt.Sprintf("%s%s/usr/local/bin/compliance_check/deepfence_compliance_check -compliance-check-type '%s' -container-id '%s' -node-type '%s' -k8-name '%s' %s", cgexecPrefix, getDfInstallDir(), complianceCheckType, containerID, nodeType, kubernetesClusterName, ignoreParam)
	} else if nodeType == nodeTypeImage {
		imageId := fmt.Sprintf("%s", req.ControlArgs["image_id"])
		if imageId == "" {
			return xfer.ResponseErrorf("image_id is required")
		}
		imageNameWithTag := fmt.Sprintf("%s", req.ControlArgs["image_name"])
		if imageNameWithTag == "" {
			return xfer.ResponseErrorf("image_name is required")
		}
		if ignoreList != "" {
			ignoreFileName = fmt.Sprintf("%s/tmp/%s_%s.txt", getDfInstallDir(), complianceCheckType, imageId)
			ignoreErr := writeIgnoreFile(ignoreFileName, ignoreList)
			if ignoreErr != nil {
				log.Errorf("Unable to write to ignore file %s %v", ignoreFileName, ignoreErr)
				ignoreParam = ""
			} else {
				ignoreParam = fmt.Sprintf("-ignore-file-name %s", ignoreFileName)
			}
		}
		command = fmt.Sprintf("%s%s/usr/local/bin/compliance_check/deepfence_compliance_check -compliance-check-type '%s' -image-name '%s' -image-id '%s' -node-type '%s' -k8-name '%s' %s", cgexecPrefix, getDfInstallDir(), complianceCheckType, imageNameWithTag, imageId, nodeType, kubernetesClusterName, ignoreParam)
	} else if nodeType == nodeTypeHost {
		if ignoreList != "" {
			ignoreFileName = fmt.Sprintf("%s/tmp/%s.txt", getDfInstallDir(), complianceCheckType)
			ignoreErr := writeIgnoreFile(ignoreFileName, ignoreList)
			if ignoreErr != nil {
				log.Errorf("Unable to write to ignore file %s %v", ignoreFileName, ignoreErr)
				ignoreParam = ""
			} else {
				ignoreParam = fmt.Sprintf("-ignore-file-name %s", ignoreFileName)
			}
		}
		_, _, _, kubeNodeRole, _ := dfUtils.GetKubernetesDetails()
		if kubeNodeRole != "master" {
			kubeNodeRole = "worker"
		}
		command = fmt.Sprintf("%s%s/usr/local/bin/compliance_check/deepfence_compliance_check -compliance-check-type '%s' -node-type '%s' -k8-name '%s' %s -k8-id '%s' -scan-id '%s' -k8-node-role '%s'", cgexecPrefix, getDfInstallDir(), complianceCheckType, nodeType, kubernetesClusterName, ignoreParam, kubernetesClusterId, scanId, kubeNodeRole)
	} else {
		return xfer.ResponseErrorf("invalid node_type")
	}
	err := dfUtils.ExecuteCommandInBackground(command)
	if err != nil {
		return xfer.ResponseErrorf(fmt.Sprintf("%s", err))
	}
	return xfer.Response{ComplianceCheckInfo: "Compliance check started"}
}

func readFile(filepath string) ([]byte, error) {
	return ioutil.ReadFile(filepath)
}

func writeIgnoreFile(fileName string, dataBuff string) error {
	var ignoreIds []string
	err := json.Unmarshal([]byte(dataBuff), &ignoreIds)
	if err != nil {
		return err
	}
	filePtr, fileErr := os.Create(fileName)
	if fileErr != nil {
		return fileErr
	}
	defer filePtr.Close()
	fileWriter := bufio.NewWriter(filePtr)
	for _, line := range ignoreIds {
		fmt.Fprintln(filePtr, line)
	}
	fileWriter.Flush()
	return nil
}

func getDfInstallDir() string {
	installDir, exists := os.LookupEnv("DF_INSTALL_DIR")
	if exists {
		return installDir
	} else {
		return ""
	}
}

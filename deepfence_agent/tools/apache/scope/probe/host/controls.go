package host

import (
	"fmt"
	dfUtils "github.com/deepfence/df-utils"
	"github.com/weaveworks/scope/common/xfer"
	"io/ioutil"
	"os"
	"strings"
)

// Control IDs used by the host integration.
const (
	GetLogsFromAgent      = "get_logs_from_agent"
	GenerateSBOM          = "generate_sbom"
	AddUserDefinedTags    = "host_add_user_defined_tags"
	DeleteUserDefinedTags = "host_delete_user_defined_tags"
	StartSecretsScan      = "secret_scan_start"
	secretScanSocket	  = "/tmp/secretScanner.sock"
	unixProtocol 		  = "unix"
	tcpProtocol  		  = "tcp"
)

func (r *Reporter) registerControls() {
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
		"secretScanner.log": getDfInstallDir() + "/var/log/fenced/secretScanner.log",
		"cve_upload_file.logfile": getDfInstallDir() + "/var/log/fenced/cve_upload_file.logfile",
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
	return xfer.Response{AgentLogs: fileInfo}
}

func readFile(filepath string) ([]byte, error) {
	return ioutil.ReadFile(filepath)
}

func getDfInstallDir() string {
	installDir, exists := os.LookupEnv("DF_INSTALL_DIR")
	if exists {
		return installDir
	} else {
		return ""
	}
}

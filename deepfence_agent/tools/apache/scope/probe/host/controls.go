package host

import (
	"fmt"
	"io/ioutil"
	"os"
	"strings"

	dfUtils "github.com/deepfence/df-utils"
	"github.com/weaveworks/scope/common/xfer"
)

// Control IDs used by the host integration.
const (
	GetLogsFromAgent      = "get_logs_from_agent"
	UploadData            = "uploadData"
	AddUserDefinedTags    = "host_add_user_defined_tags"
	DeleteUserDefinedTags = "host_delete_user_defined_tags"
)

func (r *Reporter) registerControls() {
	r.handlerRegistry.Register(GetLogsFromAgent, r.getLogsFromAgent)
	r.handlerRegistry.Register(UploadData, r.uploadData)
	r.handlerRegistry.Register(AddUserDefinedTags, r.addUserDefinedTags)
	r.handlerRegistry.Register(DeleteUserDefinedTags, r.deleteUserDefinedTags)
}

func (r *Reporter) deregisterControls() {
	r.handlerRegistry.Rm(GetLogsFromAgent)
	r.handlerRegistry.Rm(UploadData)
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
	discoveryLogFile := getDfInstallDir() + "/var/log/fenced/discovery.logfile"
	vulnerabilityUploaderLogFile := getDfInstallDir() + "/var/log/fenced/cve_upload_file.logfile"
	var fileInfo []map[string]string
	dat, err := readFile(discoveryLogFile)
	if err == nil {
		data := map[string]string{
			"file_name": "discovery.logfile",
			"data":      string(dat),
		}
		fileInfo = append(fileInfo, data)
	}
	dat, err = readFile(vulnerabilityUploaderLogFile)
	if err == nil {
		data := map[string]string{
			"file_name": "cve_upload_file.logfile",
			"data":      string(dat),
		}
		fileInfo = append(fileInfo, data)
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

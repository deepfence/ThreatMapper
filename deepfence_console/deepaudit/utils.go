package main

import (
	"bytes"
	"crypto/md5"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

func fileExists(fileName string) bool {
	if _, err := os.Stat(fileName); err == nil || os.IsExist(err) {
		return true
	}
	return false
}

func downloadFileFromConsole(remoteFileName string, localFileName string, maxRetries int) error {
	fmt.Println("Downloading file from console...\n")
	var httpErr error
	var errVal error
	var httpReq *http.Request
	var httpResp *http.Response
	retryCounter := 0
	for {
		httpReq, httpErr = http.NewRequest("GET", "https://"+managementConsoleUrl+"/df-api/downloadFile", nil)
		if httpErr != nil {
			return httpErr
		}
		httpReq.Close = true
		httpReq.Header.Add("deepfence-key", deepfenceKey)
		httpReq.Header.Add("DF_FILE_NAME", remoteFileName)
		httpResp, errVal = httpClient.Do(httpReq)
		if errVal != nil {
			return errVal
		}
		if httpResp.StatusCode == http.StatusOK {
			break
		} else {
			if retryCounter >= maxRetries {
				statusCode := httpResp.StatusCode
				httpResp.Body.Close()
				if statusCode == http.StatusProcessing {
					fmt.Printf("Got signal from server to wait for data. Continuing after 5 retries.")
					return errors.New("download file not available")
				} else {
					return errors.New(fmt.Sprintf("error while downloading file - got %d", statusCode))
				}
			}
			statusCode := httpResp.StatusCode
			httpResp.Body.Close()
			retryCounter += 1
			fmt.Printf(fmt.Sprintf("error while downloading file - got %d, waiting for 30 seconds \n", statusCode))
			time.Sleep(30 * time.Second)
		}
	}
	err := mkdirRecursive(filepath.Dir(localFileName))
	if err != nil {
		return err
	}
	fileFd, fileErrVal := os.Create(localFileName)
	if fileErrVal != nil {
		return fileErrVal
	}
	io.Copy(fileFd, httpResp.Body)
	fileFd.Close()
	httpResp.Body.Close()
	fmt.Printf("Donwloaded file fromm console\n")
	return nil
}

func getTimestamp() string {
	return strconv.FormatInt(time.Now().UTC().UnixNano(), 10)
}

func getIntTimestamp() int64 {
	return time.Now().UTC().UnixNano() / 1000000
}

func getDatetimeNow() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000")
}

func trimSuffix(s, suffix string) string {
	if strings.HasSuffix(s, suffix) {
		s = s[:len(s)-len(suffix)]
	}
	return s
}

func inSlice(slice []string, val string) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}
	return false
}

func md5HashForFile(filePath string) (string, error) {
	var returnMD5String string
	file, err := os.Open(filePath)
	if err != nil {
		return returnMD5String, err
	}
	defer file.Close()
	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return returnMD5String, err
	}
	hashInBytes := hash.Sum(nil)
	returnMD5String = hex.EncodeToString(hashInBytes)
	return returnMD5String, nil
}

func runCommandInBackground(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	err := cmd.Start()
	go waitFunction(cmd)
	return err
}

func waitFunction(command *exec.Cmd) {
	command.Wait()
}

func runCommand(name string, args ...string) (stdout string, stderr string, exitCode int) {
	var defaultFailedCode = 1
	var outbuf, errbuf bytes.Buffer
	cmd := exec.Command(name, args...)
	cmd.Stdout = &outbuf
	cmd.Stderr = &errbuf

	err := cmd.Run()
	stdout = outbuf.String()
	stderr = errbuf.String()

	if err != nil {
		// try to get the exit code
		if exitError, ok := err.(*exec.ExitError); ok {
			ws := exitError.Sys().(syscall.WaitStatus)
			exitCode = ws.ExitStatus()
		} else {
			// This will happen (in OSX) if `name` is not available in $PATH,
			// in this situation, exit code could not be get, and stderr will be
			// empty string very likely, so we use the default fail code, and format err
			// to string and set to stderr
			log.Printf("Could not get exit code for failed program: %v, %v", name, args)
			exitCode = defaultFailedCode
			if stderr == "" {
				stderr = err.Error()
			}
		}
	} else {
		// success, exitCode should be 0 if go is ok
		ws := cmd.ProcessState.Sys().(syscall.WaitStatus)
		exitCode = ws.ExitStatus()
	}
	return
}

func mkdirRecursive(folderPath string) error {
	return os.MkdirAll(folderPath, os.ModePerm)
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

// structs valid for clair v2.1.1 (https://github.com/quay/clair/tree/v2.1.1)

type Layer struct {
	Name             string            `json:"Name,omitempty"`
	NamespaceName    string            `json:"NamespaceName,omitempty"`
	Path             string            `json:"Path,omitempty"`
	Headers          map[string]string `json:"Headers,omitempty"`
	ParentName       string            `json:"ParentName,omitempty"`
	Format           string            `json:"Format,omitempty"`
	IndexedByVersion int               `json:"IndexedByVersion,omitempty"`
	Features         []Feature         `json:"Features,omitempty"`
}

type Vulnerability struct {
	Name          string                 `json:"Name,omitempty"`
	NamespaceName string                 `json:"NamespaceName,omitempty"`
	Description   string                 `json:"Description,omitempty"`
	Link          string                 `json:"Link,omitempty"`
	Severity      string                 `json:"Severity,omitempty"`
	Metadata      map[string]interface{} `json:"Metadata,omitempty"`
	FixedBy       string                 `json:"FixedBy,omitempty"`
	FixedIn       []Feature              `json:"FixedIn,omitempty"`
}

type Feature struct {
	Name            string          `json:"Name,omitempty"`
	NamespaceName   string          `json:"NamespaceName,omitempty"`
	VersionFormat   string          `json:"VersionFormat,omitempty"`
	Version         string          `json:"Version,omitempty"`
	Vulnerabilities []Vulnerability `json:"Vulnerabilities,omitempty"`
	AddedBy         string          `json:"AddedBy,omitempty"`
}

type LayerEnvelope struct {
	Layer *Layer `json:"Layer,omitempty"`
	Error *Error `json:"Error,omitempty"`
}

type Error struct {
	Message string `json:"Message,omitempty"`
}

// END: structs valid for clair v2.1.1 (https://github.com/quay/clair/tree/v2.1.1)

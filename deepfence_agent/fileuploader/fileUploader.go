/*
 * File uploader for use by CVE routines.
 * It takes as a argument the container image that needs to be uploaded,
 * or the keyword "host". In case of container image, the entire image is sent
 * out as a tarball. In case of host, the base files are first sent out,
 * followed by the language pack files.
 */

package main

import (
	"bufio"
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"mime/multipart"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/deepfence/vessel"
	vesselConstants "github.com/deepfence/vessel/constants"
	containerdRuntime "github.com/deepfence/vessel/containerd"
	dockerRuntime "github.com/deepfence/vessel/docker"
	scopeHostname "github.com/weaveworks/scope/common/hostname"
)

var skipDirs []string
var skipDirLen int
var scanTypeStr, scanId, sanitizedScanId, nodeType, nodeId string
var scanTypes, allScanTypes, languageScanTypes []string
var fileWalkErrStr = "no such file or directory"
var httpOk = 200
var hostname string
var kubernetesClusterName string
var mgmtConsoleUrl string
var stopLogging chan bool
var certPath = "/etc/filebeat/filebeat.crt"
var httpClient *http.Client
var deepfenceKey string

// Host mount dir for scanning host ("/" for serverless or fargate)
var mountPoint = "/fenced/mnt/host/" // "/"
var dfInstallDir string = ""

var javaExt = []string{".jar", ".war"}
var pythonExt = []string{".pyc", ".whl", ".egg", "METADATA", "PKG-INFO"}
var rubyExt = []string{".gemspec", "Rakefile"}
var phpExt = []string{"composer.lock"}
var nodejsExt = []string{"package.json"}
var jsExt = []string{".js"}
var dotnetExt = []string{".dll", ".exe"}

var javaFiles = "/tmp/java-files.txt"
var pythonFiles = "/tmp/python-files.txt"
var rubyFiles = "/tmp/ruby-files.txt"
var phpFiles = "/tmp/php-files.txt"
var nodejsFiles = "/tmp/nodejs-files.txt"
var jsFiles = "/tmp/js-files.txt"
var dotnetFiles = "/tmp/dotnet-files.txt"

// runtime vars
var containerRuntimeInterface vessel.Runtime
var activeRuntime string

func init() {
	stopLogging = make(chan bool)
	deepfenceKey = os.Getenv("DEEPFENCE_KEY")
	languageScanTypes = []string{"java", "python", "ruby", "php", "nodejs", "js", "dotnet"}
	allScanTypes = append([]string{"base"}, languageScanTypes...)
}

func inSlice(slice []string, val string) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}
	return false
}

func getTimestamp() int64 {
	return time.Now().UTC().UnixNano() / 1000000
}

func initSkipDirs() {

	if runtime.GOOS == "windows" {
		tmpDir := os.TempDir()
		if tmpDir != "" {
			skipDirs = append(skipDirs, tmpDir)
		}
		skipDirs = append(skipDirs, "C:\\Program Files\\dependency-check")
		skipDirs = append(skipDirs, "C:\\Program Files\\sysmon")
		skipDirs = append(skipDirs, "C:\\Program Files\\Filebeat")
		skipDirs = append(skipDirs, "C:\\Program Files\\Docker")
		skipDirs = append(skipDirs, "C:\\Program Files\\Npcap")
		skipDirs = append(skipDirs, "C:\\Program Files\\Deepfence")
		skipDirs = append(skipDirs, "C:\\Program Files\\Java")
		skipDirs = append(skipDirs, "C:\\Program Files\\Hyper-V")
	} else {
		skipDirs = append(skipDirs, mountPoint+"usr/local/bin/dependency-check")
		skipDirs = append(skipDirs, mountPoint+"var/lib/docker")
		skipDirs = append(skipDirs, mountPoint+"mnt")
		skipDirs = append(skipDirs, mountPoint+"run")
		skipDirs = append(skipDirs, mountPoint+"proc")
		skipDirs = append(skipDirs, mountPoint+"dev")
		skipDirs = append(skipDirs, mountPoint+"boot")
		skipDirs = append(skipDirs, mountPoint+"etc")
		skipDirs = append(skipDirs, mountPoint+"sys")
		skipDirs = append(skipDirs, mountPoint+"lost+found")
	}
	skipDirLen = len(skipDirs)
}

func addNfsMountsToSkipDirs() {

	outputFileName := dfInstallDir + "/tmp/nfs-mounts.txt"
	cmdFileName := dfInstallDir + "/tmp/get-nfs.sh"
	nfsCmd := fmt.Sprintf("findmnt -l -t nfs4 -n --output=TARGET > %s", outputFileName)
	errVal := ioutil.WriteFile(cmdFileName, []byte(nfsCmd), 0600)
	if errVal != nil {
		fmt.Printf("Error while writing nfs command %s \n", errVal.Error())
		return
	}
	cmdOutput, cmdErr := exec.Command("bash", cmdFileName).CombinedOutput()
	if cmdErr != nil {
		fileSize, _ := os.Stat(outputFileName)
		if (string(cmdOutput) == "") && (fileSize.Size() == 0) {
			fmt.Printf("No NFS mount points detected \n")
		} else {
			fmt.Printf("Error getting NFS mount points. %s %s \n", cmdErr.Error(), string(cmdOutput))
		}
		os.Remove(cmdFileName)
		return
	}
	file, err := os.Open(outputFileName)
	if err != nil {
		fmt.Printf("Error while opening file %s\n", err.Error())
		os.Remove(outputFileName)
		os.Remove(cmdFileName)
		return
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if scanner.Err() != nil {
			fmt.Println("Error while reading nfs files ", scanner.Err().Error())
			os.Remove(outputFileName)
			os.Remove(cmdFileName)
			return
		}
		skipDirs = append(skipDirs, line)
		skipDirLen = len(skipDirs)
	}
	os.Remove(outputFileName)
	os.Remove(cmdFileName)
	return
}

func copyFile(scrFileName string, dstFileName string, isDstFile bool) error {
	from, err := os.Open(scrFileName)
	if err != nil {
		return err
	}
	defer from.Close()
	if !isDstFile {
		// if dstFileName is Dir instead of File
		dstFileName = path.Join(dstFileName, filepath.Base(scrFileName))
	}
	to, err := os.OpenFile(dstFileName, os.O_RDWR|os.O_CREATE, 0666)
	if err != nil {
		return err
	}
	defer to.Close()
	_, err = io.Copy(to, from)
	if err != nil {
		return err
	}
	return nil
}

func buildHostTar(outputPath string, mountPath string) error {
	impFiles := [11]string{"var/lib/dpkg/status", "etc/apt/sources.list", "etc/os-release", "etc/lsb-release",
		"var/lib/rpm/Packages", "etc/centos-release", "etc/redhat-release", "etc/system-release",
		"etc/apk/repositories", "etc/alpine-release", "lib/apk/db/installed"}

	for fileCnt := 0; fileCnt < len(impFiles); fileCnt++ {
		if _, err := os.Stat(mountPath + "/" + impFiles[fileCnt]); err == nil {
			dirPath := outputPath + "/" + path.Dir(impFiles[fileCnt])
			err = os.MkdirAll(dirPath, 0700)
			if err != nil {
				fmt.Printf("%s - Failed to create dir: %s\n", scanId, err)
				continue
			}
			err = copyFile(mountPath+"/"+impFiles[fileCnt], dirPath, false)
			if err != nil {
				fmt.Printf("%s - Failed to copy file %s : %s\n", scanId, mountPath+"/"+impFiles[fileCnt], err)
				continue
			}
		}
	}
	cmd := exec.Command("tar", "-cf", outputPath+"/layer.tar", "-C", outputPath, ".")
	return cmd.Run()
}

func buildClient() (*http.Client, error) {
	// Set up our own certificate pool
	tlsConfig := &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true}
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig:     tlsConfig,
			DisableKeepAlives:   false,
			MaxIdleConnsPerHost: 1024,
			DialContext: (&net.Dialer{
				Timeout:   15 * time.Minute,
				KeepAlive: 15 * time.Minute,
			}).DialContext,
			TLSHandshakeTimeout:   10 * time.Second,
			ResponseHeaderTimeout: 5 * time.Minute,
		},
		Timeout: 15 * time.Minute,
	}

	// Load our trusted certificate path
	pemData, err := ioutil.ReadFile(certPath)
	if err != nil {
		return nil, err
	}
	ok := tlsConfig.RootCAs.AppendCertsFromPEM(pemData)
	if !ok {
		return nil, errors.New("Unable to append certificates to PEM")
	}

	return client, nil
}

func uploadToConsole(localFileName string, remoteFileName string, extractRemoteFile bool) error {
	r, w := io.Pipe()
	multiPartWriter := multipart.NewWriter(w)
	go func() {
		defer w.Close()
		defer multiPartWriter.Close()
		part, err := multiPartWriter.CreateFormFile("DF_MULTIPART_BOUNDARY", "empty_string")
		if err != nil {
			return
		}
		file, err := os.Open(localFileName)
		if err != nil {
			return
		}
		defer file.Close()
		if _, err = io.Copy(part, file); err != nil {
			return
		}
	}()
	httpReq, err := http.NewRequest("POST", "https://"+mgmtConsoleUrl+"/df-api/uploadMultiPart", r)
	if err != nil {
		return err
	}
	httpReq.Close = true
	httpReq.Header.Add("deepfence-key", deepfenceKey)
	httpReq.Header.Add("DF_FILE_NAME", remoteFileName)
	if extractRemoteFile {
		// this will extract the uploaded file in 'remoteFileFolder/extract' folder
		httpReq.Header.Add("DF_EXTRACT", "true")
	} else {
		httpReq.Header.Add("DF_EXTRACT", "false")
	}
	httpReq.Header.Add("Content-Type", multiPartWriter.FormDataContentType())
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return err
	}
	if resp.StatusCode != httpOk {
		errMsg := fmt.Sprintf("Unable to complete request. Got %d ", resp.StatusCode)
		resp.Body.Close()
		return errors.New(errMsg)
	}
	resp.Body.Close()
	if extractRemoteFile {
		retryCount := 0
		for {
			statusReq, err := http.NewRequest("GET", "https://"+mgmtConsoleUrl+"/df-api/uploadExtractStatus", nil)
			if err != nil {
				return err
			}
			statusReq.Header.Add("deepfence-key", deepfenceKey)
			statusReq.Header.Add("DF_FILE_NAME", remoteFileName)
			statusResp, err := httpClient.Do(statusReq)
			if err != nil {
				return err
			}
			if statusResp.StatusCode == httpOk {
				statusResp.Body.Close()
				break
			} else {
				if retryCount > 15 {
					errMsg := fmt.Sprintf("Unable to get extract status. Got %d ", statusResp.StatusCode)
					statusResp.Body.Close()
					return errors.New(errMsg)
				}
				statusResp.Body.Close()
				retryCount += 1
				time.Sleep(10 * time.Second)
			}
		}
	}
	fmt.Printf("%s - %s - File upload completed successfully \n", scanId, localFileName)
	return nil
}

func checkSkipDir(filePath string) bool {

	for i := 0; i < skipDirLen; i++ {
		if strings.HasPrefix(filePath, skipDirs[i]) {
			return true
		}
	}
	return false
}

func buildFileList(sourceDir string) error {

	//var fileList []string
	var javaNames = ""
	var phpNames = ""
	var pythonNames = ""
	var rubyNames = ""
	var jsNames = ""
	var nodejsNames = ""
	var dotnetNames = ""

	err := filepath.Walk(sourceDir, func(fileNamePath string, fileInfo os.FileInfo,
		errVal error) error {
		if errVal != nil {
			errStr := errVal.Error()
			if !strings.Contains(errStr, fileWalkErrStr) {
				fmt.Printf("%s - Error %s while walk.\n", scanId, errVal.Error())
			}
		}
		if fileInfo == nil {
			return nil
		}
		if (fileInfo.IsDir()) && (checkSkipDir(fileNamePath) == true || (fileInfo.Name() == "/tmp")) {
			return filepath.SkipDir
		}
		if !fileInfo.IsDir() {
			if checkFileExtn(fileNamePath, javaExt) == true {
				javaNames = javaNames + fileNamePath + "\n"
			} else if checkFileExtn(fileNamePath, jsExt) == true {
				jsNames = jsNames + fileNamePath + "\n"
			} else if checkFileExtn(fileNamePath, rubyExt) == true {
				rubyNames = rubyNames + fileNamePath + "\n"
			} else if checkFileExtn(fileNamePath, pythonExt) == true {
				pythonNames = pythonNames + fileNamePath + "\n"
			} else if checkFileExtn(fileNamePath, nodejsExt) == true {
				nodejsNames = nodejsNames + fileNamePath + "\n"
			} else if checkFileExtn(fileNamePath, phpExt) == true {
				phpNames = phpNames + fileNamePath + "\n"
			} else if checkFileExtn(fileNamePath, dotnetExt) == true {
				dotnetNames = dotnetNames + fileNamePath + "\n"
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	writeErr := ioutil.WriteFile(javaFiles, []byte(javaNames), 0600)
	if writeErr != nil {
		fmt.Printf("Error while writing java files list %s\n", writeErr.Error())
	}
	writeErr = ioutil.WriteFile(jsFiles, []byte(jsNames), 0600)
	if writeErr != nil {
		fmt.Printf("Error while writing js files list %s\n", writeErr.Error())
	}
	writeErr = ioutil.WriteFile(rubyFiles, []byte(rubyNames), 0600)
	if writeErr != nil {
		fmt.Printf("Error while writing ruby files list %s\n", writeErr.Error())
	}
	writeErr = ioutil.WriteFile(pythonFiles, []byte(pythonNames), 0600)
	if writeErr != nil {
		fmt.Printf("Error while writing python files list %s\n", writeErr.Error())
	}
	writeErr = ioutil.WriteFile(phpFiles, []byte(phpNames), 0600)
	if writeErr != nil {
		fmt.Printf("Error while writing php files list %s\n", writeErr.Error())
	}
	writeErr = ioutil.WriteFile(nodejsFiles, []byte(nodejsNames), 0600)
	if writeErr != nil {
		fmt.Printf("Error while writing nodejs files list %s\n", writeErr.Error())
	}
	writeErr = ioutil.WriteFile(dotnetFiles, []byte(dotnetNames), 0600)
	if writeErr != nil {
		fmt.Printf("Error while writing dotnet files list %s\n", writeErr.Error())
	}
	return nil
}

func checkFileExtn(fileName string, extList []string) bool {

	listLen := len(extList)
	extVal := filepath.Ext(fileName)

	if extVal != "" {
		for i := 0; i < listLen; i++ {
			if strings.EqualFold(extVal, extList[i]) == true {
				return true
			}
		}
	}
	for i := 0; i < listLen; i++ {
		if strings.EqualFold(fileName, extList[i]) == true {
			return true
		}
	}
	return false
}

func createAndUploadLanguageFiles(dstPath string, language string) error {

	var srcFileName string

	localFileName := dstPath + "/" + language + ".tar"
	tmpTarFile := dstPath + "/create-tar.sh"
	destFileName := "/data/cve-scan-upload/" + hostname + "/" + sanitizedScanId + "/" + language + ".tar"
	if language == "java" {
		srcFileName = javaFiles
	} else if language == "python" {
		srcFileName = pythonFiles
	} else if language == "ruby" {
		srcFileName = rubyFiles
	} else if language == "php" {
		srcFileName = phpFiles
	} else if language == "nodejs" {
		srcFileName = nodejsFiles
	} else if language == "js" {
		srcFileName = nodejsFiles
	} else if language == "dotnet" {
		srcFileName = dotnetFiles
	}
	tarCmd := fmt.Sprintf("%s/bin/tar -rf %s -P --transform='s,%s,,' --files-from %s ", dfInstallDir, localFileName, mountPoint, srcFileName)
	errVal := ioutil.WriteFile(tmpTarFile, []byte(tarCmd), 0600)
	if errVal != nil {
		fmt.Println(errVal.Error())
		return errVal
	}
	cmdOutput, cmdErr := exec.Command("bash", tmpTarFile).CombinedOutput()
	if cmdErr != nil {
		fmt.Printf("Error while creating tar %s. %s \n", cmdErr.Error(), string(cmdOutput))
		return cmdErr
	}
	os.Remove(tmpTarFile)
	err := uploadToConsole(localFileName, destFileName, false)
	if err != nil {
		msg := fmt.Sprintf("%s - Unable to upload file to server. Reason = %s", scanId, err.Error())
		fmt.Println(msg)
		err = sendScanLogsToLogstash(msg, "WARN")
		if err != nil {
			fmt.Println(scanId, err.Error())
		}
	}
	return nil
}

func getTmpScanId(scanId string) string {
	tmpScanId := strings.Replace(scanId, "/", "_", -1)
	tmpScanId = strings.Replace(tmpScanId, ":", "_", -1)
	tmpScanId = strings.Replace(tmpScanId, ".", "_", -1)
	return tmpScanId
}

func uploadImageData(imageName string) (string, error) {
	var errVal error
	destFileName := "/data/cve-scan-upload/" + hostname + "/" + sanitizedScanId + "/layer.tar"
	outputDir, outputErr := ioutil.TempDir("", sanitizedScanId)
	if outputErr != nil {
		return outputDir, errVal
	}
	outputParam := path.Join(outputDir, "save-output.tar")

	// strip image name with, docker.io and docker.io/library
	// kludge: could be done better
	fmt.Printf("Actual image name: %s\n", imageName)
	tempImageName := strings.TrimPrefix(imageName, "docker.io/library/")
	tempImageName = strings.TrimPrefix(tempImageName, "docker.io/")
	imageName = tempImageName
	fmt.Printf("stripped off image name: %s\n", imageName)
	_, errVal = containerRuntimeInterface.Save(imageName, outputParam)
	if errVal != nil {
		fmt.Printf("Error saving image: %s - %v\n", imageName, errVal)
		return outputDir, errVal
	}
	// if containerd, then also migrate image to docker spec
	if activeRuntime == vesselConstants.CONTAINERD {
		errVal = containerdRuntime.MigrateOCITarToDockerV1Tar(outputDir, "save-output.tar")
		if errVal != nil {
			fmt.Printf("Error migrating image: %s - %v\n", imageName, errVal)
			return outputDir, errVal
		}
	}
	// _, errVal = exec.Command("docker", "save", imageName, "-o", outputParam).Output()
	// if errVal != nil {
	// 	return outputDir, errVal
	// }
	errVal = uploadToConsole(outputParam, destFileName, true)
	if errVal != nil {
		return outputDir, errVal
	}
	return outputDir, nil
}

func deleteFiles(path string, wildCard string) {

	var val string
	files, _ := filepath.Glob(path + wildCard)
	for _, val = range files {
		os.RemoveAll(val)
	}
}

func sendError(path string, err error, action string) {
	deleteFiles(path+"/", "*")
	os.Remove(path)
	stopLogging <- true
	time.Sleep(3 * time.Second)
	msg := fmt.Sprintf("%s - Error occurred. Reason = %s", scanId, err.Error())
	fmt.Println(msg)
	err = sendScanLogsToLogstash(msg, action)
	if err != nil {
		fmt.Println(scanId, err.Error())
	}
}

func uploadHostData() (string, error) {
	// Append DF Install Dir in case serverless container is not writable
	var path = dfInstallDir + "/tmp/analyze-local-host"
	path = path + "-" + hostname
	deleteFiles(path+"/", "*")
	os.Remove(path)
	os.MkdirAll(path, 0700)
	err := buildHostTar(path, mountPoint)
	if err != nil {
		return path, err
	}
	fileName := path + "/layer.tar"
	destFileName := "/data/cve-scan-upload/" + hostname + "/" + sanitizedScanId + "/layer.tar"
	err = uploadToConsole(fileName, destFileName, false)
	if err != nil {
		return path, err
	}
	/*
		Set timeout of 15 minutes for buildFileList.
	*/
	buildLocateDbChan := make(chan string, 1)
	go func() {
		buildErr := buildFileList(mountPoint)
		if buildErr != nil {
			buildLocateDbChan <- buildErr.Error()
		} else {
			buildLocateDbChan <- ""
		}
	}()
	select {
	case buildLocateDbResult := <-buildLocateDbChan:
		if buildLocateDbResult != "" {
			return path, errors.New(buildLocateDbResult)
		}
	case <-time.After(15 * time.Minute):
		fmt.Println(scanId, "buildFileList timed out")
	}
	/*
		Set timeout of 10 minutes for each language scan upload
	*/
	for _, scanType := range scanTypes {
		if inSlice(languageScanTypes, scanType) {
			languageChan := make(chan error, 1)
			go func() {
				languageChan <- createAndUploadLanguageFiles(path, scanType)
			}()
			select {
			case _ = <-languageChan:
			case <-time.After(10 * time.Minute):
				fmt.Println(scanId, scanType+" language upload timed out")
			}
		}
	}
	os.Remove(javaFiles)
	os.Remove(pythonFiles)
	os.Remove(rubyFiles)
	os.Remove(phpFiles)
	os.Remove(jsFiles)
	os.Remove(dotnetFiles)
	os.Remove(nodejsFiles)
	return path, nil
}

func sendScanLogsToLogstash(cveScanMsg string, action string) error {
	cveScanMsg = strings.Replace(cveScanMsg, "\n", " ", -1)
	scanLog := fmt.Sprintf("{\"scan_id\":\"%s\",\"time_stamp\":%d,\"cve_scan_message\":\"%s\",\"action\":\"%s\",\"type\":\"cve-scan\",\"node_type\":\"%s\",\"node_id\":\"%s\",\"scan_type\":\"%s\",\"host_name\":\"%s\",\"host\":\"%s\",\"kubernetes_cluster_name\":\"%s\"}", scanId, getTimestamp(), cveScanMsg, action, nodeType, nodeId, scanTypeStr, hostname, hostname, kubernetesClusterName)
	fmt.Println(scanLog)
	postReader := bytes.NewReader([]byte(scanLog))
	retryCount := 0
	for {
		httpReq, err := http.NewRequest("POST", "https://"+mgmtConsoleUrl+"/df-api/add-to-logstash?doc_type=cve-scan", postReader)
		if err != nil {
			return err
		}
		httpReq.Close = true
		httpReq.Header.Add("deepfence-key", deepfenceKey)
		resp, err := httpClient.Do(httpReq)
		if err != nil {
			return err
		}
		if resp.StatusCode == httpOk {
			resp.Body.Close()
			break
		} else {
			if retryCount > 5 {
				errMsg := fmt.Sprintf("Unable to complete request. Got %d ", resp.StatusCode)
				resp.Body.Close()
				return errors.New(errMsg)
			}
			resp.Body.Close()
			retryCount += 1
			time.Sleep(5 * time.Second)
		}
	}
	return nil
}

func main() {
	usage := "Usage: <program name> <image name> <scan type> <scan id> <image id> <kubernetes cluster name> <host mount dir (/ for fargate)>"
	if len(os.Args) < 6 {
		fmt.Println(usage)
		return
	}
	fmt.Println("Before - " + time.Now().String())
	imageName := os.Args[1]
	scanType := os.Args[2]
	scanId = os.Args[3]
	imageId := os.Args[4]
	kubernetesClusterName = os.Args[5]
	// Set the host mount dir appropriately, if there is a 6th parameter for host mount dir
	// Used to set base scan dir for serverless or fargate
	if len(os.Args) == 7 && os.Args[6] != "" {
		mountPoint = os.Args[6]
	}

	installDir, exists := os.LookupEnv("DF_INSTALL_DIR")
	if exists {
		dfInstallDir = installDir
	}
	fmt.Println("DF installation directory: ", dfInstallDir)
	certPath = dfInstallDir + certPath
	javaFiles = dfInstallDir + javaFiles
	pythonFiles = dfInstallDir + pythonFiles
	rubyFiles = dfInstallDir + rubyFiles
	phpFiles = dfInstallDir + phpFiles
	nodejsFiles = dfInstallDir + nodejsFiles
	jsFiles = dfInstallDir + jsFiles
	dotnetFiles = dfInstallDir + dotnetFiles

	if imageName == "" || scanType == "" || scanId == "" {
		fmt.Println(usage)
		fmt.Println("After - " + time.Now().String())
		return
	}
	if scanType == "all" {
		scanTypes = allScanTypes
	} else {
		tmpScanTypes := strings.Split(scanType, ",")
		for _, tmpScanType := range tmpScanTypes {
			if inSlice(allScanTypes, tmpScanType) {
				scanTypes = append(scanTypes, tmpScanType)
			}
		}
		if !inSlice(scanTypes, "base") {
			scanTypes = append(scanTypes, "base")
		}
	}
	scanTypeStr = strings.Join(scanTypes, ",")
	if imageName != "host" && imageId == "" {
		fmt.Println(usage)
		fmt.Println("After - " + time.Now().String())
		return
	}
	hostname = scopeHostname.Get()
	mgmtConsoleUrl = os.Getenv("MGMT_CONSOLE_URL") + ":" + os.Getenv("MGMT_CONSOLE_PORT")
	sanitizedScanId = getTmpScanId(scanId)
	initSkipDirs()
	addNfsMountsToSkipDirs()
	var err error
	httpClient, err = buildClient()
	if err != nil {
		fmt.Printf("buildClient failed: %v", err)
		fmt.Println("After - " + time.Now().String())
		return
	}

	if imageName == "host" {
		nodeId = hostname
		nodeType = "host"
	} else {
		nodeId = imageName
		nodeType = "container_image"
	}

	go func() {
		err = sendScanLogsToLogstash("", "UPLOADING_IMAGE")
		if err != nil {
			fmt.Println(scanId, err.Error())
		}
		ticker := time.NewTicker(2 * time.Minute)
		for {
			select {
			case <-ticker.C:
				err = sendScanLogsToLogstash("", "UPLOADING_IMAGE")
				if err != nil {
					fmt.Println(scanId, err.Error())
				}
			case <-stopLogging:
				fmt.Println("After - " + time.Now().String())
				return
			}
		}
	}()
	if imageName == "host" {
		if runtime.GOOS != "windows" {
			filePath, err := uploadHostData()
			if err != nil {
				sendError(filePath, err, "WARN")
			} else {
				deleteFiles(filePath+"/", "*")
				os.Remove(filePath)
				stopLogging <- true
				time.Sleep(3 * time.Second)
				err = sendScanLogsToLogstash("", "UPLOAD_COMPLETE")
				if err != nil {
					fmt.Println(scanId, err.Error())
				}
			}
		}
	} else {
		// Auto-detect underlying container runtime
		activeRuntime, _, err = vessel.AutoDetectRuntime()
		if err != nil {
			stopLogging <- true
			time.Sleep(3 * time.Second)
			err = sendScanLogsToLogstash(err.Error(), "ERROR")
			if err != nil {
				fmt.Println(scanId, err.Error())
			}
			return
		}
		switch activeRuntime {
		case vesselConstants.DOCKER:
			containerRuntimeInterface = dockerRuntime.New()
		case vesselConstants.CONTAINERD:
			containerRuntimeInterface = containerdRuntime.New()
		}
		if containerRuntimeInterface == nil {
			stopLogging <- true
			time.Sleep(3 * time.Second)
			err = sendScanLogsToLogstash("Could not detect container runtime", "ERROR")
			if err != nil {
				fmt.Println(scanId, err.Error())
			}
			return
		}

		outputDir, err := uploadImageData(imageName)
		if outputDir != "" {
			deleteFiles(outputDir+"/", "*")
			os.Remove(outputDir)
		}
		stopLogging <- true
		time.Sleep(3 * time.Second)
		if err != nil {
			msg := fmt.Sprintf("%s - Error: %s", scanId, err.Error())
			fmt.Println(msg)
			err = sendScanLogsToLogstash(msg, "ERROR")
			if err != nil {
				fmt.Println(scanId, err.Error())
			}
		} else {
			err = sendScanLogsToLogstash("Image data uploaded", "UPLOAD_COMPLETE")
			if err != nil {
				fmt.Println(scanId, err.Error())
			}
		}
	}
	fmt.Println(time.Now().String())
}

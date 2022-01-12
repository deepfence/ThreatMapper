package main

import (
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"html"
	"io"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	//"gopkg.in/yaml.v2"
	//"github.com/codeskyblue/go-sh"

	"github.com/deepfence/vessel"
	vesselConstants "github.com/deepfence/vessel/constants"
	containerdRuntime "github.com/deepfence/vessel/containerd"
	dockerRuntime "github.com/deepfence/vessel/docker"
)

var tmp_path string
var global_image_id string
var global_image_name string
var global_host_name string
var layer_found string
var dependency_check_cmd string
var start_time string
var node_id string
var node_type string
var scanTypes []string
var scanTypeStr string
var pathPrefix string
var scanId string
var global_container_name string
var hostName string
var kubernetesClusterName string
var hostMountPath string
var isHostScan bool
var updateDepCheckData bool
var isLocalImageScan bool
var deepfenceKey string
var maskedCveIds map[string]struct{}
var managementConsoleUrl string
var fileSet map[string]bool

const HTTP_OK = 200

var depcheckDataDir = "/data/owasp-data/data/"
var dirErrMsg = "no such file or directory"
var pathErrMsg = "The system cannot find the path specified"

/* Four hours in nanoseconds */
var fourHourNanoSec = 14400000000000
var lockFileName = "/root/depcheck-download.lock"
var tmpDepcheckDataFile = "/root/depcheck-data.tar.bz2"
var cveCounter CveCounter
var failCVECount int64          // if no of cve >= this, fail the scan
var failCVEScore float64        // if score of cve >= this, fail the scan
var TotalCVEScore float64       // Total CVE score of the image
var ScaledTotalCVEScore float64 // Total CVE score of the image scaled between 0-10
var stopLogging chan bool
var httpClient *http.Client
var httpOk = 200
var scanLanguages []string
var failedCVETotalCount int64

/* Constants for score function */
const LOW_SCORE_DEFAULT = 2.0
const MEDIUM_SCORE_DEFAULT = 5.5
const HIGH_SCORE_DEFAULT = 8.0
const CRITICAL_SCORE_DEFAULT = 9.5

const LOW_WEIGHTAGE = 1
const MEDIUM_WEIGHTAGE = 10 * LOW_WEIGHTAGE
const HIGH_WEIGHTAGE = 5 * MEDIUM_WEIGHTAGE
const CRITICAL_WEIGHTAGE = 5 * HIGH_WEIGHTAGE

const PLAIN_NETWORK_WEIGHTAGE = 2
const AV_NETWORK_WEIGHTAGE = 2 // Easier to attack leading to higher score
const AV_ADJNETWORK_WEIGHTAGE = 1.5
const AV_LOCAL_WEIGHTAGE = 1.3
const AV_PHYSICAL_WEIGHTAGE = 1
const AC_HIGH_WEIGHTAGE = 1
const AC_MEDIUM_WEIGHTAGE = 1.5
const AC_LOW_WEIGHTAGE = 2 // Low complexity means easier to attack leading to higher scores

const MAX_SEVERITY_SCORE = 10 * CRITICAL_WEIGHTAGE // * AV_NETWORK_WEIGHTAGE * AC_LOW_WEIGHTAGE
const MAX_TOTAL_SEVERITY_SCORE = 500               // match this value with deepfence_backend/utils/constants.py constant

var containerRuntimeInterface vessel.Runtime

func init() {
	cveCounter = CveCounter{}
	stopLogging = make(chan bool)
	isHostScan = false
	scanLanguages = []string{"java", "python", "ruby", "php", "nodejs", "js", "dotnet"}

	// Auto-detect underlying container runtime
	containerRuntime, _, err := vessel.AutoDetectRuntime()
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	switch containerRuntime {
	case vesselConstants.DOCKER:
		containerRuntimeInterface = dockerRuntime.New()
	case vesselConstants.CONTAINERD:
		containerRuntimeInterface = containerdRuntime.New()
	}
	if containerRuntimeInterface == nil {
		fmt.Println("Error: Could not detect container runtime")
		os.Exit(1)
	}
}

const (
	postLayerURI        = "/fetcher/v1/layers"
	getLayerFeaturesURI = "/fetcher/v1/layers/%s?vulnerabilities"
)

type CveCounter struct {
	Critical int64
	High     int64
	Medium   int64
	Low      int64
}

// https://github.com/docker/docker/blob/master/image/tarexport/tarexport.go#L17
type manifestItem struct {
	Config   string
	RepoTags []string
	Layers   []string
	LayerIds []string `json:",omitempty"`
}

var imageManifest manifestItem

// If CVSS score is missing, fill it standard CVSS score based on severity. Later, we can
// use a better calculation based on attack vector, complexity etc. to fill a more accurate value.
func fillMissingCveScore(severity string, CveCvssScore float64, CveAttackVector string) float64 {
	var score float64
	severity = strings.ToLower(severity)

	score = CveCvssScore

	if score == 0.0 {
		if severity == "critical" {
			score = CRITICAL_SCORE_DEFAULT
		} else if severity == "high" {
			score = HIGH_SCORE_DEFAULT
		} else if severity == "medium" {
			score = MEDIUM_SCORE_DEFAULT
		} else {
			score = LOW_SCORE_DEFAULT
		}
	}

	return score
}

func updateCveScore(severity string, CveCvssScore float64, CveAttackVector string) float64 {
	var score float64
	severity = strings.ToLower(severity)

	score = CveCvssScore

	if score == 0.0 {
		if severity == "critical" {
			score = CRITICAL_SCORE_DEFAULT
		} else if severity == "high" {
			score = HIGH_SCORE_DEFAULT
		} else if severity == "medium" {
			score = MEDIUM_SCORE_DEFAULT
		} else {
			score = LOW_SCORE_DEFAULT
		}
	}

	if severity == "critical" {
		score *= CRITICAL_WEIGHTAGE
	} else if severity == "high" {
		score *= HIGH_WEIGHTAGE
	} else if severity == "medium" {
		score *= MEDIUM_WEIGHTAGE
	} else {
		score *= LOW_WEIGHTAGE
	}

	// CVE AttackVector formats
	// "AV:N/AC:M/Au:N/C:P/I:P"
	// "NETWORK"
	// "LOCAL"
	// "UNKNOWN"

	// Since, we now use CVSS score to calclute base score, we don't need to
	// double count based on Attack vector, complexities etc.
	/*
		s := strings.Split(CveAttackVector, "/")

		if len(s) == 1 {
			if s[0] == "NETWORK" {
				score *= PLAIN_NETWORK_WEIGHTAGE
			}
		} else {
			for i := 0; i < len(s); i++ {
				temp_av := strings.Split(s[i], ":")
				if temp_av[0] == "AV" {
					if temp_av[1] == "N" {
						score *= AV_NETWORK_WEIGHTAGE
					} else if temp_av[1] == "A" {
						score *= AV_ADJNETWORK_WEIGHTAGE
					} else if temp_av[1] == "L" {
						score *= AV_LOCAL_WEIGHTAGE
					} else if temp_av[1] == "P" {
						score *= AV_PHYSICAL_WEIGHTAGE
					}
				} else if temp_av[0] == "AC" {
					if temp_av[1] == "H" {
						score *= AC_HIGH_WEIGHTAGE
					} else if temp_av[1] == "M" {
						score *= AC_MEDIUM_WEIGHTAGE
					} else if temp_av[1] == "L" {
						score *= AC_LOW_WEIGHTAGE
					}
				} else { // Don't change it for other metrics now
					score *= 1
				}
			}
		}
	*/

	// Scale Indivial score to 0-10
	score = score * 10.0 / MAX_SEVERITY_SCORE

	TotalCVEScore += score
	ScaledTotalCVEScore = TotalCVEScore * 10.0 / MAX_TOTAL_SEVERITY_SCORE
	if ScaledTotalCVEScore >= 10.0 { // Limit maximum scaled total score to 10.0
		ScaledTotalCVEScore = 10.0
	}
	// fmt.Printf("scaled total cve_cvss_score: %F\n", ScaledTotalCVEScore)

	return score
}

func (c *CveCounter) getTotalCount() int64 {
	return c.Critical + c.High + c.Medium + c.Low
}

func (c *CveCounter) addCveCount(severity string) {
	severity = strings.ToLower(severity)
	if severity == "critical" {
		c.Critical += 1
	} else if severity == "high" {
		c.High += 1
	} else if severity == "medium" {
		c.Medium += 1
	} else {
		c.Low += 1
	}
	if failCVECount >= 0 {
		failedCVETotalCount = c.getTotalCount()
	}
}

type nvdDetails struct {
	NVD struct {
		CVSSv2 struct {
			Score   float64 `json:"Score"`
			Vectors string  `json:"Vectors"`
		} `json:"CVSSv2"`
	} `json:"NVD"`
}

func deleteFiles(path string, wildCard string) {

	var val string
	fmt.Printf("Now deleting all files from %s \n", path+wildCard)
	files, _ := filepath.Glob(path + wildCard)
	for _, val = range files {
		os.RemoveAll(val)
	}
}

func save(imageName, imageId, imageTarPath string) (string, error) {
	var path string
	if imageTarPath == "" {
		tmpScanId := strings.ReplaceAll(scanId, "/", "_")
		tmpScanId = strings.ReplaceAll(tmpScanId, ":", "_")
		tmpScanId = strings.ReplaceAll(tmpScanId, ".", "_")
		path = "/data/cve-scan-upload/image_scan/" + tmpScanId + "/extract"
	} else {
		path = filepath.Dir(imageTarPath) + "/extract"
	}
	mkdirRecursive(path)
	if imageTarPath == "" {
		err := containerRuntimeInterface.ExtractImage(imageId, imageName, path)
		if err != nil {
			return "", err
		}
	} else {
		_, stdErr, retVal := runCommand("tar", "-xf", imageTarPath, "--warning=none", "-C"+path)
		if retVal != 0 {
			return "", errors.New(stdErr)
		}
	}
	fmt.Printf("Image %s saved in %s \n", imageName, path)
	return path, nil
}

func historyFromManifest(path string) (*manifestItem, error) {
	mf, err := os.Open(path + "/manifest.json")
	if err != nil {
		return nil, err
	}
	defer mf.Close()

	var manifest []manifestItem
	if err = json.NewDecoder(mf).Decode(&manifest); err != nil {
		return nil, err
	} else if len(manifest) != 1 {
		return nil, err
	}
	var layerIds []string
	for _, layer := range manifest[0].Layers {
		trimmedLayerId := strings.TrimSuffix(layer, "/layer.tar")
		// manifests saved by some versions of skopeo has .tar extentions
		trimmedLayerId = strings.TrimSuffix(trimmedLayerId, ".tar")
		layerIds = append(layerIds, trimmedLayerId)
	}
	manifest[0].LayerIds = layerIds
	imageManifest = manifest[0]
	return &manifest[0], nil
}

func analyzeLayer(path, layerName, parentLayerName string) error {
	payload := LayerEnvelope{
		Layer: &Layer{
			Name:       layerName,
			Path:       path,
			ParentName: parentLayerName,
			Format:     "Docker",
		},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	retryCount := 0
	for {
		request, err := http.NewRequest("POST", "https://"+managementConsoleUrl+postLayerURI, bytes.NewBuffer(jsonPayload))
		fmt.Printf("Analyze layer. Path is %s url is %s uri is %s \n",
			path, postLayerURI, postLayerURI)
		if err != nil {
			return err
		}
		request.Close = true
		request.Header.Add("deepfence-key", deepfenceKey)
		request.Header.Add("Content-Type", "application/json")
		response, err := httpClient.Do(request)
		if err != nil {
			return err
		}
		if response.StatusCode == 201 {
			response.Body.Close()
			break
		} else {
			if retryCount > 1 {
				body, _ := ioutil.ReadAll(response.Body)
				statusCode := response.StatusCode
				response.Body.Close()
				return fmt.Errorf("got response %d with message %s", statusCode, string(body))
			}
			response.Body.Close()
			retryCount += 1
			time.Sleep(5 * time.Second)
		}
	}
	return nil
}

func getLayer(layerID string) (Layer, error) {
	fmt.Printf("Inside get layer URL is %s \n", fmt.Sprintf(getLayerFeaturesURI, layerID))
	var response *http.Response
	retryCount := 0
	for {
		httpReq, err := http.NewRequest("GET", "https://"+managementConsoleUrl+fmt.Sprintf(getLayerFeaturesURI, layerID), nil)
		if err != nil {
			return Layer{}, err
		}
		httpReq.Close = true
		httpReq.Header.Add("deepfence-key", deepfenceKey)
		response, err = httpClient.Do(httpReq)
		if err != nil {
			return Layer{}, err
		}
		if response.StatusCode == 200 {
			var apiResponse LayerEnvelope
			err = json.NewDecoder(response.Body).Decode(&apiResponse)
			if err != nil {
				return Layer{}, err
			}
			response.Body.Close()
			if apiResponse.Error != nil {
				return Layer{}, errors.New(apiResponse.Error.Message)
			}
			return *apiResponse.Layer, nil
		} else {
			if retryCount > 1 {
				body, _ := ioutil.ReadAll(response.Body)
				statusCode := response.StatusCode
				response.Body.Close()
				err = fmt.Errorf("got response %d with message %s", statusCode, string(body))
				return Layer{}, err
			}
			response.Body.Close()
			retryCount += 1
			time.Sleep(5 * time.Second)
		}
	}
}
func strip_image(path string, layerPaths []string, layerIDs []string) error {
	// * at the begining is imp, things didnt work for RHEL due to this
	var debImpFiles []string
	if runtime.GOOS == "windows" {
		debImpFiles = []string{}
	} else {
		debImpFiles = []string{"*var/lib/dpkg/status",
			"*lib/apk/db/installed",
			"*etc/apt/sources.list",
			"*etc/os-release",
			"*etc/lsb-release",
			"*var/lib/rpm/Packages",
			"*etc/centos-release",
			"*etc/redhat-release",
			"*etc/alpine-release",
			"*etc/system-release"}
	}
	backupPath := path + "_backup"
	err := os.Rename(path, backupPath)
	if err != nil {
		return err
	}
	//defer os.RemoveAll(backupPath)

	//fmt.Printf("Stripping %d layers\n", len(layerIDs))
	for i := 0; i < len(layerPaths); i++ {
		layerPath := path + "/" + layerIDs[i]
		//err = os.MkdirAll(path, layerPath, ModeDir | 0755)
		err = os.MkdirAll(layerPath, 0755)
		if err != nil {
			return err
		}

		strippedLayerTar := path + "/" + layerPaths[i]
		if runtime.GOOS == "windows" {
			touchWinCmd := exec.Command("copy", "NUL", strippedLayerTar)
			err = touchWinCmd.Run()
		} else {
			cmd := exec.Command("touch", strippedLayerTar)
			err = cmd.Run()
		}
		//fmt.Printf(" ==== Touched %s\n", strippedLayerTar)
		//cmd = exec.Command("cp", backupPath + "/" + layerIDs[i] + "VERSION", layerPath + "/VERSION")
		//err = cmd.Run()
		//cmd = exec.Command("cp", backupPath + "/" + layerIDs[i] + "json", layerPath + "/json")
		//err = cmd.Run()

		layerTarPath := backupPath + "/" + layerPaths[i]
		//fmt.Printf("Examining %s\n", layerPath)
		if _, err := os.Stat(layerTarPath); err == nil {
			//fmt.Printf(" !!! %s exists\n", layerTarPath)
			for fileCnt := 0; fileCnt < len(debImpFiles); fileCnt++ {
				//fmt.Printf(" ---- Extracting %s @ %s\n", debImpFiles[fileCnt], layerPath)
				//cmd, err:= exec.Command("tar", "-xf", layerTarPath, "-C", layerPath, "--wildcards", debImpFiles[fileCnt]).CombinedOutput()
				if runtime.GOOS == "windows" {
					zipLoc := "C:/Program Files/Deepfence/7-zip/7z.exe"
					untarCmd := exec.Command(zipLoc, "x", layerTarPath, "-o"+layerPath, debImpFiles[fileCnt])
					err = untarCmd.Run()
					if err != nil {
						fmt.Println("failed unarchiving", err)
					}
				} else {
					// using 7zip to unarchive both tar and 7zip formats
					cmd := exec.Command("/usr/bin/7z", "x", layerTarPath, "-o"+layerPath, debImpFiles[fileCnt], "-r")
					err = cmd.Run()
					if err != nil {
						fmt.Println("failed unarchiving", err)
					}
				}
			}
			if runtime.GOOS == "windows" {
				zipLoc := "C:/Program Files/Deepfence/7-zip/7z.exe"
				tarCmd := exec.Command(zipLoc, "a", "-ttar", "-so", layerPath+strippedLayerTar, ".")
				err = tarCmd.Run()
			} else {
				// 7zip not necessary for archiving back to tar format
				cmd := exec.Command("tar", "-cf", strippedLayerTar, "--warning=none", "-C", layerPath, ".")
				err = cmd.Run()
				if err != nil {
					fmt.Println("failed archiving", err)
				}
			}
		} else {
			return err
		}
	}
	return nil
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
	var certPath string
	if runtime.GOOS == "windows" {
		certPath = "C:/ProgramData/Filebeat/filebeat.crt"
	} else {
		certPath = "/etc/filebeat/filebeat.crt"
	}
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

func delFromServer(fileName string) error {
	//fmt.Printf("Now trying to delete %s from %s \n", fileName, serverIP)
	httpReq, err := http.NewRequest("DEL", "https://"+managementConsoleUrl+"/df-api/clear", nil)
	if err != nil {
		//fmt.Printf("Error while deleting from server. Reason %s \n", err.Error())
		return err
	}
	httpReq.Close = true
	httpReq.Header.Add("deepfence-key", deepfenceKey)
	httpReq.Header.Add("DF_FILE_NAME", fileName)
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		//fmt.Printf("Error while deleting from server. Reason %s \n", err.Error())
		return err
	}
	if resp.StatusCode != HTTP_OK {
		errMsg := fmt.Sprintf("Unable to complete request. Got %d ", resp.StatusCode)
		resp.Body.Close()
		return errors.New(errMsg)
	}
	resp.Body.Close()
	//fmt.Printf("File deleted from server successfully \n")
	return nil
}

func uploadToServer(fileName string) error {
	r, w := io.Pipe()
	multiPartWriter := multipart.NewWriter(w)
	go func() {
		defer w.Close()
		defer multiPartWriter.Close()
		part, err := multiPartWriter.CreateFormFile("DF_MULTIPART_BOUNDARY", "empty_string")
		if err != nil {
			return
		}
		file, err := os.Open(fileName)
		if err != nil {
			return
		}
		defer file.Close()
		if _, err = io.Copy(part, file); err != nil {
			return
		}
	}()
	httpReq, err := http.NewRequest("POST", "https://"+managementConsoleUrl+"/df-api/uploadMultiPart", r)
	if err != nil {
		return err
	}
	httpReq.Close = true
	httpReq.Header.Add("deepfence-key", deepfenceKey)
	httpReq.Header.Add("DF_FILE_NAME", fileName)
	httpReq.Header.Add("Content-Type", multiPartWriter.FormDataContentType())
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return err
	}
	if resp.StatusCode != HTTP_OK {
		errMsg := fmt.Sprintf("Unable to complete request. Got %d ", resp.StatusCode)
		resp.Body.Close()
		return errors.New(errMsg)
	}
	resp.Body.Close()
	return nil
}

func logErrorAndExit(errMsg string) {
	stopLogging <- true
	time.Sleep(3 * time.Second)
	sendScanLogsToLogstash(errMsg, "ERROR")
	deleteTmpDir()
	os.Exit(1)
}

func saveContainerImage(imageName string, imageTarPath string, imageId string) *manifestItem {
	path, err := save(imageName, global_image_id, imageTarPath)
	if err != nil {
		msg := fmt.Sprintf("Could not save image: %s", err.Error())
		logErrorAndExit(msg)
	}
	fmt.Printf("Image saved to %s \n", path)
	tmp_path = path
	// Retrieve history.
	//fmt.Println("Getting image's history")
	manifestItem, err := historyFromManifest(path)
	if err != nil {
		msg := fmt.Sprintf("Could not read image manifest: %s", err.Error())
		logErrorAndExit(msg)
		return manifestItem
	}
	layerIDs := manifestItem.LayerIds
	layerPaths := manifestItem.Layers
	if len(layerPaths) == 0 {
		logErrorAndExit("Image layer path is empty")
		return manifestItem
	}
	if len(layerIDs) == 0 {
		logErrorAndExit("Image layer id is empty")
		return manifestItem
	}
	if imageId == "" {
		// reading image id from manifest file json path and tripping off extension
		imageId = strings.TrimSuffix(imageManifest.Config, ".json")
		global_image_id = imageId
	}
	err = strip_image(path, layerPaths, layerIDs)
	if err != nil {
		msg := fmt.Sprintf("Unable to strip image. Reason = %s \n", err.Error())
		logErrorAndExit(msg)
	}
	var fileName string
	//pathPrefix = "/data/cve-data/" + hostName + "/"
	loopCntr := len(layerPaths)
	if isLocalImageScan {
		// if image is local, upload layer.tar to /data for clair
		for i := 0; i < loopCntr; i++ {
			if runtime.GOOS == "windows" {
				if strings.HasSuffix(layerPaths[i], ".tar") {
					fileName = path + "\\" + layerPaths[i]
				} else {
					fileName = path + "\\" + layerPaths[i] + "\\layer.tar"
				}
			} else {
				if strings.HasSuffix(layerPaths[i], ".tar") {
					fileName = path + "/" + layerPaths[i]
				} else {
					fileName = path + "/" + layerPaths[i] + "/layer.tar"
				}
			}
			err = uploadToServer(fileName)
			if err != nil {
				msg := fmt.Sprintf("Unable to upload file %s to host %s. Reason %s",
					fileName, managementConsoleUrl, err.Error())
				sendScanLogsToLogstash(msg, "ERROR")
				return manifestItem
			}
		}
	}
	return manifestItem
}

func getContainerVulnerabilities(imageName string, imageTarPath string, imageId string, manifestItem *manifestItem) {
	path := tmp_path
	// Retrieve history.
	layerIDs := manifestItem.LayerIds
	layerPaths := manifestItem.Layers
	var fileName string
	loopCntr := len(layerPaths)
	if runtime.GOOS == "windows" {
		fileName = path + "\\" + layerPaths[0]
	} else {
		fileName = path + "/" + layerPaths[0]
	}
	err := analyzeLayer(fileName, layerIDs[0], "")
	if err != nil {
		msg := fmt.Sprintf("Could not analyze layer %s, moving on: %v", layerIDs[0], err)
		sendScanLogsToLogstash(msg, "WARN")
	}
	for i := 1; i < loopCntr; i++ {
		fileName = path + "/" + layerPaths[i]
		fmt.Printf("layerPaths: %s\n", layerPaths[i])
		err = analyzeLayer(fileName, layerIDs[i], layerIDs[i-1])
		if err != nil {
			msg := fmt.Sprintf("Could not analyze layer %s, moving on: %v", layerIDs[i], err)
			fmt.Printf("Analyze layer error: %s", msg)
			sendScanLogsToLogstash(msg, "WARN")
		}
	}
	// Get vulnerabilities.
	//fmt.Println("Getting image's vulnerabilities")
	layer, err := getLayer(layerIDs[len(layerIDs)-1])
	if err != nil {
		msg := fmt.Sprintf("Could not get base vulnerabilities in any layers, moving on: %s", err.Error())
		fmt.Printf("getLayer error: %s", msg)
		sendScanLogsToLogstash(msg, "WARN")
		//os.Exit(1)
	}
	if isLocalImageScan {
		go delFromServer(pathPrefix + path)
	}

	// Print report.
	//fmt.Printf("\n# deepaudit report for image %s (%s)\n", imageName, time.Now().UTC())

	if len(layer.Features) == 0 {
		msg := "No feature has been detected on the image. This usually means that the image isn't supported by deepaudit, will do what we can."
		fmt.Printf("no feature: %s", msg)
		sendScanLogsToLogstash(msg, "WARN")
		//os.Exit(0)
	}

	var cveJsonList string
	for _, feature := range layer.Features {
		//fmt.Printf("## Feature: %s %s (%s)\n", feature.Name, feature.Version, feature.Namespace)
		if len(feature.Vulnerabilities) > 0 {
			//fmt.Printf("   - Added by: %s\n", feature.AddedBy)
			for _, vulnerability := range feature.Vulnerabilities {

				//Grab details from NVD data
				b, err := json.Marshal(vulnerability.Metadata)
				if err != nil {
					msg := fmt.Sprintf("Error: %s", err)
					fmt.Printf("json error: %s", msg)
					sendScanLogsToLogstash(msg, "WARN")
					return
				}
				var nvd nvdDetails
				bytes := []byte(b)
				json.Unmarshal(bytes, &nvd)

				description_a := html.EscapeString(vulnerability.Description)
				description_b := strings.Replace(description_a, "!", "", -1)
				description_c := strings.Replace(description_b, "\"", "", -1)
				description_d := strings.Replace(description_c, "#", "", -1)
				description_e := strings.Replace(description_d, "$", "", -1)
				description_f := strings.Replace(description_e, "%", "", -1)
				description_g := strings.Replace(description_f, "&", "", -1)
				description_h := strings.Replace(description_g, "'", "", -1)
				description_i := strings.Replace(description_h, "(", "", -1)
				description_j := strings.Replace(description_i, ")", "", -1)
				description_k := strings.Replace(description_j, "[", "", -1)
				description_l := strings.Replace(description_k, "]", "", -1)
				description_m := strings.Replace(description_l, "!", "", -1)
				description_n := strings.Replace(description_m, "@", "", -1)
				description_o := strings.Replace(description_n, "^", "", -1)
				description_p := strings.Replace(description_o, "/", "", -1)
				description := strings.Replace(description_p, "\\", "", -1)

				var baseData dfVulnStruct
				baseData.Cve_id = vulnerability.Name
				baseData.Cve_type = "base"
				baseData.Cve_container_image = global_image_name
				baseData.Cve_container_image_id = strings.Trim(strings.TrimPrefix(string(global_image_id), "sha256:"), "\n")
				baseData.Cve_container_name = global_container_name
				baseData.Cve_severity = vulnerability.Severity
				baseData.Cve_caused_by_package = feature.Name + "_" + feature.Version
				baseData.Cve_caused_by_package_path = ""
				baseData.Cve_container_layer = feature.AddedBy
				baseData.Cve_fixed_in = vulnerability.FixedBy
				baseData.Cve_link = vulnerability.Link
				baseData.Cve_description = description
				baseData.Cve_cvss_score = fillMissingCveScore(vulnerability.Severity, nvd.NVD.CVSSv2.Score, nvd.NVD.CVSSv2.Vectors)
				baseData.Cve_attack_vector = nvd.NVD.CVSSv2.Vectors
				baseData.Cve_overall_score = updateCveScore(vulnerability.Severity, nvd.NVD.CVSSv2.Score, nvd.NVD.CVSSv2.Vectors)
				if _, found := maskedCveIds[baseData.Cve_id]; found {
					baseData.Masked = "true"
				} else {
					baseData.Masked = "false"
				}
				cveJson, err := formatCveJson(baseData)
				if err == nil && cveJson != "" {
					cveJsonList += cveJson + ","
				}
				if baseData.Masked == "false" {
					cveCounter.addCveCount(baseData.Cve_severity)
				}
			}
		}
	}
	err = sendCveJsonToLogstash("[" + trimSuffix(cveJsonList, ",") + "]")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	}
}

func getHostVulnerabilities(hostName string, hostTarFile string) {
	//path := "/tmp/" + hostName
	layerName, err := md5HashForFile(hostTarFile)
	if err != nil {
		logErrorAndExit(fmt.Sprintf("Error: %s", err))
	}
	//os.MkdirAll(path, 0755)
	//_, stdErr, retVal := runCommand("tar", "-xf", hostTarFile, "-C"+path)
	//if retVal != 0 {
	//	logErrorAndExit(fmt.Sprintf("Error: %s", stdErr))
	//}
	//tmp_path = path
	// Analyze image
	err = analyzeLayer(hostTarFile, layerName, "")
	if err != nil {
		msg := fmt.Sprintf("Could not analyze host: %s", err)
		sendScanLogsToLogstash(msg, "WARN")
	}
	// Get vulnerabilities.
	//fmt.Println("Getting image's vulnerabilities")
	layer, err := getLayer(layerName)
	if err != nil {
		msg := fmt.Sprintf("Could not get base vulnerabilities for host, moving on: %s", err.Error())
		sendScanLogsToLogstash(msg, "WARN")
		//os.Exit(1)
	}
	// Print report.
	//fmt.Printf("\n# deepaudit report for image %s (%s)\n", layerName, time.Now().UTC())
	if len(layer.Features) == 0 {
		msg := "No feature has been detected on the image. This usually means that the image isn't supported by deepaudit, will do what we can."
		sendScanLogsToLogstash(msg, "WARN")
		//os.Exit(0)
	}

	var cveJsonList string
	for _, feature := range layer.Features {
		fmt.Printf("## Feature: %s %s (%s)\n", feature.Name, feature.Version, feature.NamespaceName)
		if len(feature.Vulnerabilities) > 0 {
			//fmt.Printf("   - Added by: %s\n", feature.AddedBy)
			for _, vulnerability := range feature.Vulnerabilities {
				//Grab details from NVD data
				b, err := json.Marshal(vulnerability.Metadata)
				if err != nil {
					//fmt.Printf("Error: %s", err)
					return
				}
				var nvd nvdDetails
				bytes := []byte(b)
				json.Unmarshal(bytes, &nvd)

				description_a := html.EscapeString(vulnerability.Description)
				description_b := strings.Replace(description_a, "!", "", -1)
				description_c := strings.Replace(description_b, "\"", "", -1)
				description_d := strings.Replace(description_c, "#", "", -1)
				description_e := strings.Replace(description_d, "$", "", -1)
				description_f := strings.Replace(description_e, "%", "", -1)
				description_g := strings.Replace(description_f, "&", "", -1)
				description_h := strings.Replace(description_g, "'", "", -1)
				description_i := strings.Replace(description_h, "(", "", -1)
				description_j := strings.Replace(description_i, ")", "", -1)
				description_k := strings.Replace(description_j, "[", "", -1)
				description_l := strings.Replace(description_k, "]", "", -1)
				description_m := strings.Replace(description_l, "!", "", -1)
				description_n := strings.Replace(description_m, "@", "", -1)
				description_o := strings.Replace(description_n, "^", "", -1)
				description_p := strings.Replace(description_o, "/", "", -1)
				description := strings.Replace(description_p, "\\", "", -1)

				var baseData dfVulnStruct
				baseData.Cve_id = vulnerability.Name
				baseData.Cve_type = "base"
				baseData.Cve_container_image = global_host_name
				baseData.Cve_container_image_id = global_host_name
				baseData.Cve_container_name = global_container_name
				baseData.Cve_severity = vulnerability.Severity
				baseData.Cve_caused_by_package = feature.Name + "_" + feature.Version
				baseData.Cve_container_layer = feature.AddedBy
				baseData.Cve_fixed_in = vulnerability.FixedBy
				baseData.Cve_link = vulnerability.Link
				baseData.Cve_description = description
				baseData.Cve_cvss_score = fillMissingCveScore(vulnerability.Severity, nvd.NVD.CVSSv2.Score, nvd.NVD.CVSSv2.Vectors)
				baseData.Cve_attack_vector = nvd.NVD.CVSSv2.Vectors
				baseData.Cve_overall_score = updateCveScore(vulnerability.Severity, nvd.NVD.CVSSv2.Score, nvd.NVD.CVSSv2.Vectors)
				if _, found := maskedCveIds[baseData.Cve_id]; found {
					baseData.Masked = "true"
				} else {
					baseData.Masked = "false"
				}
				cveJson, err := formatCveJson(baseData)
				if err == nil && cveJson != "" {
					cveJsonList += cveJson + ","
				}
				if baseData.Masked == "false" {
					cveCounter.addCveCount(baseData.Cve_severity)
				}
			}
		}
	}
	err = sendCveJsonToLogstash("[" + trimSuffix(cveJsonList, ",") + "]")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	}
}

func sendToLogstash(postReader io.Reader, urlPath string) error {
	// Send  data to cve server, which will put it in a redis pub-sub read by logstash
	retryCount := 0
	for {
		httpReq, err := http.NewRequest("POST", urlPath, postReader)
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
			if retryCount > 2 {
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

func sendCveJsonToLogstash(cveJsonStr string) error {
	if cveJsonStr == "" {
		return nil
	}
	postReader := bytes.NewReader([]byte(cveJsonStr))
	return sendToLogstash(postReader, "https://"+managementConsoleUrl+"/df-api/add-to-logstash?doc_type=cve")
}

func sendScanLogsToLogstash(cveScanMsg string, action string) error {
	cveScanMsg = strings.Replace(cveScanMsg, "\n", " ", -1)
	scanLog := fmt.Sprintf("{\"scan_id\":\"%s\",\"time_stamp\":%d,\"cve_scan_message\":\"%s\",\"action\":\"%s\",\"type\":\"cve-scan\",\"node_type\":\"%s\",\"node_id\":\"%s\",\"scan_type\":\"%s\",\"host_name\":\"%s\",\"host\":\"%s\",\"kubernetes_cluster_name\":\"%s\"}", scanId, getIntTimestamp(), cveScanMsg, action, node_type, node_id, scanTypeStr, hostName, hostName, kubernetesClusterName)
	postReader := bytes.NewReader([]byte(scanLog))
	return sendToLogstash(postReader, "https://"+managementConsoleUrl+"/df-api/add-to-logstash?doc_type=cve-scan")
}

func downloadDependencyData() string {
	downloadFileName := "/data/owasp-data/depcheck-data.tar.bz2"
	if runtime.GOOS == "windows" {
		depcheckDataDir = "C:/ProgramData/Deepfence/temp/owasp-data/data/"
		tmpDepcheckDataFile = "C:/ProgramData/Deepfence/temp/depcheck-data.zip"
		downloadFileName = "/data/owasp-data/depcheck-data.zip"
	}
	err := downloadFileFromConsole(downloadFileName, tmpDepcheckDataFile, 10)
	if err != nil {
		return err.Error()
	}
	mkdirErrVal := os.MkdirAll(depcheckDataDir, 0755)
	if mkdirErrVal != nil {
		return mkdirErrVal.Error()
	}
	if runtime.GOOS == "windows" {
		powershell, lookupErr := exec.LookPath("powershell.exe")
		if lookupErr != nil {
			return lookupErr.Error()
		}
		untarCmd := fmt.Sprintf("Expand-Archive %s -DestinationPath %s", tmpDepcheckDataFile, depcheckDataDir)
		_, unzipErr := exec.Command(powershell, "-c", untarCmd).Output()
		if unzipErr != nil {
			return unzipErr.Error()
		}
	} else {
		unTarCmd := fmt.Sprintf("-jxf %s -C %s",
		tmpDepcheckDataFile, depcheckDataDir)
		unTarArgs := strings.Split(unTarCmd, " ")
		fmt.Printf("Tar arguments: %s \n", unTarCmd)
		cmdOut, cmdErr := exec.Command("/bin/tar", unTarArgs...).CombinedOutput()
		if cmdOut != nil {
			fmt.Printf("Tar cmd stdout: %s \n", string(cmdOut))
		}
		if cmdErr != nil {
			fmt.Printf("Tar cmd stderr: %s \n", cmdErr.Error())
			return cmdErr.Error()
		}
	}
	os.RemoveAll(tmpDepcheckDataFile)
	return ""
}

func checkDependencyData() string {
	var fileFd *os.File
	var openErrVal error
	fileFd, openErrVal = os.Open(depcheckDataDir)
	if openErrVal != nil {
		errMsg := openErrVal.Error()
		if !strings.Contains(errMsg, dirErrMsg) {
			if runtime.GOOS == "windows" {
				if !strings.Contains(errMsg, pathErrMsg) {
					return errMsg
				}
			} else {
				return errMsg
			}
		}
		fmt.Printf("Downloading dependency data from fetcher\n")
		downloadErrMsg := downloadDependencyData()
		return downloadErrMsg
	}
	fdStat, statErr := fileFd.Stat()
	if statErr != nil {
		return statErr.Error()
	}
	if runtime.GOOS == "windows" {
		// close all file handles
		fileFd.Close()
	}
	timeSince := time.Since(fdStat.ModTime())
	if int(timeSince) > fourHourNanoSec {
		fmt.Printf("Four hours since last download of data. Downloading again \n")
		deleteFiles(depcheckDataDir, "*")
		os.RemoveAll(depcheckDataDir)
		downloadErrMsg := downloadDependencyData()
		return downloadErrMsg
	}
	fmt.Printf("Download data age is less than four hours. All ok \n")
	return ""
}

func deleteTmpDir() {
	if tmp_path != "" {
		deleteFiles(tmp_path, "*")
		os.RemoveAll(tmp_path)
		deleteFiles(tmp_path, "_backup")
		os.RemoveAll(tmp_path + "_backup")
	}
}

func completeScan() {
	stopLogging <- true
	time.Sleep(3 * time.Second)
	// ------------------
	fmt.Printf("## Final scaled cve_overall_score of the image: %F\n", ScaledTotalCVEScore)
	deleteTmpDir()
	if failCVECount > 0 {
		if failedCVETotalCount >= failCVECount {
			errMsg := fmt.Sprintf("CVE count threshold(%d) exceeded\n", failCVECount)
			sendScanLogsToLogstash(errMsg, "ERROR")
			log.Printf(errMsg)
			os.Exit(1)
		}
	}
	if failCVEScore > 0 {
		if ScaledTotalCVEScore >= failCVEScore {
			errMsg := fmt.Sprintf("CVE score threshold(%f) exceeded\n", failCVEScore)
			sendScanLogsToLogstash(errMsg, "ERROR")
			log.Printf(errMsg)
			os.Exit(1)
		}
	}
	sendScanLogsToLogstash("", "COMPLETED")
}

func getCurrentlyMaskedCveIds(nodeId, nodeType string) ([]string, error) {
	var currentlyMaskedCveIds []string
	jsonPayload, err := json.Marshal(map[string]string{"node_id": nodeId, "node_type": nodeType})
	if err != nil {
		return currentlyMaskedCveIds, err
	}
	httpReq, err := http.NewRequest("POST", "https://"+managementConsoleUrl+"/df-api/masked-cve-id", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return currentlyMaskedCveIds, err
	}
	httpReq.Close = true
	httpReq.Header.Add("deepfence-key", deepfenceKey)
	httpReq.Header.Add("Content-Type", "application/json")
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return currentlyMaskedCveIds, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == HTTP_OK {
		maskedCveIdStr, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return currentlyMaskedCveIds, err
		}
		err = json.Unmarshal(maskedCveIdStr, &currentlyMaskedCveIds)
		if err != nil {
			return currentlyMaskedCveIds, err
		}
	}
	return currentlyMaskedCveIds, nil
}

func main() {
	var imageName string
	var imageTarPath string
	var imageId string
	var errVal string
	var scanType string
	var maskCveIdArgs string
	// If scan happening in UI machine, set updateDepCheckData to false, because ti container keeps dependency data updated
	var windowsTempDir = "C:/ProgramData/Deepfence/temp"      //store output.json here
	var windowsSysTempDir = "C:/Program Files/Deepfence/temp" // create lock file

	// start time for unique filenames
	start_time = getTimestamp()
	flag.BoolVar(&updateDepCheckData, "update-dependency-data", true, "\t Should dependency data be updated")
	flag.BoolVar(&isLocalImageScan, "is-image-local", true, "\t Image is present locally - ci/cd scan, cmd line registry scan")
	flag.StringVar(&global_container_name, "container-name", "", "\t Name of the container to be scanned")
	flag.StringVar(&hostName, "host-name", "", "\t Name of the host for which the scan is for")
	flag.StringVar(&kubernetesClusterName, "kubernetes-cluster-name", "", "\t Management console ip address")
	flag.StringVar(&managementConsoleUrl, "mgmt-console-url", "127.0.0.1:443", "\t Management console ip address")
	flag.StringVar(&imageName, "image-name", "", "\t Image name to audit")
	flag.StringVar(&imageTarPath, "image-path", "", "\t Path of image.tar file to audit")
	flag.StringVar(&imageId, "image-id", "", "\t Docker image id")
	flag.StringVar(&scanId, "scan-id", "", "\t Scan id")
	flag.StringVar(&deepfenceKey, "deepfence-key", "", "\t Deepfence key for auth")
	flag.StringVar(&scanType, "scan-type", "base", "\t Comma separated string: base,java,python,ruby,php,nodejs,js,dotnet")
	flag.Int64Var(&failCVECount, "fail-cve-count", -1, "\t Fail the scan if cve count greater than or equals this value")
	flag.Float64Var(&failCVEScore, "fail-cve-score", -1, "\t Fail the scan if cve score greater than or equals this value")
	flag.StringVar(&maskCveIdArgs, "mask-cve-ids", "", "\t mask ids")

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s [options] -image-name=<image-name> -image-id=<image-id>\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Pass either image-name + image-id or image-path\n\n")
		fmt.Fprintf(os.Stderr, "E.g. ./deepaudit -mgmt-console-url=\"127.0.0.1:443\" -scan-type=\"all\" -image-name=\"host\" \n\n")
		flag.PrintDefaults()
	}
	flag.Parse()
	if imageName == "" && imageTarPath == "" {
		flag.Usage()
		os.Exit(1)
	}
	if imageName == "host" && hostName == "" {
		flag.Usage()
		os.Exit(1)
	}

	// base scan is mandatory *******************
	tmpScanTypes := strings.Split(scanType, ",")
	for _, tmpScanType := range tmpScanTypes {
		if inSlice(scanLanguages, tmpScanType) {
			scanTypes = append(scanTypes, tmpScanType)
		}
	}
	scanTypeStr = "base," + strings.Join(scanTypes, ",")
	var err error
	httpClient, err = buildClient()
	// image id is used to in docker save command
	// If user has already provided imageTarPath, there is no need to save the image
	// and hence image id not required.
	// For scenarios where imageTarPath is provided,  read from manifest file
	if imageName != "host" && imageId == "" && len(imageTarPath) == 0 {
		// strip image name with, docker.io and docker.io/library
		// kludge: could be done better
		tempImageName := strings.TrimPrefix(imageName, "docker.io/library/")
		tempImageName = strings.TrimPrefix(tempImageName, "docker.io/")
		imageName = tempImageName
		tmpImageId, err := containerRuntimeInterface.GetImageID(imageName)
		if err != nil {
			errMsg := fmt.Sprintf("Could not get image id: %s, please pass -image-id", err)
			fmt.Println(errMsg)
			sendScanLogsToLogstash(errMsg, "ERROR")
			os.Exit(1)
		}
		if string(tmpImageId) == "" {
			errMsg := "Could not get image id: Image doesn't exist, please give correct image name and tag"
			fmt.Println(errMsg)
			sendScanLogsToLogstash(errMsg, "ERROR")
			os.Exit(1)
		}
		imageId = strings.Trim(strings.TrimPrefix(string(tmpImageId), "sha256:"), "\n")
	}
	// setup
	mkdirRecursive("/data/fetcher/data")
	mkdirRecursive("/data/owasp-data/logs")
	if runtime.GOOS == "windows" {
		if _, errStat := os.Stat(windowsTempDir); os.IsNotExist(errStat) {
			os.MkdirAll(windowsTempDir, 0755)
		}
		if _, sysErrStat := os.Stat(windowsSysTempDir); os.IsNotExist(sysErrStat) {
			os.MkdirAll(windowsSysTempDir, 0755)
		}
		dirErrMsg = "The system cannot find the file specified."
		depcheckDataDir = "C:/ProgramData/Deepfence/temp/owasp-data/data/"
	}

	if runtime.GOOS == "windows" {
		dependency_check_cmd = "C:/'Program Files'/dependency-check/bin/dependency-check.bat --noupdate --data " + depcheckDataDir + " --suppression C:/'Program Files'/Deepfence/dependencycheck-base-suppression.xml --enableExperimental --project random --out " + filepath.Join(windowsTempDir, "output_"+start_time+".json") + " -f JSON %s"
	} else {
		dependency_check_cmd = "/usr/local/bin/dependency-check/bin/dependency-check.sh --noupdate --data " + depcheckDataDir + " --suppression /usr/local/bin/dependency-check/dependencycheck-base-suppression.xml --enableExperimental --project random --out /root/output_" + start_time + ".json -f JSON %s"
	}

	//fmt.Printf("Base Image scan started\n")
	// ---------
	node_type = ""
	global_host_name = hostName
	global_image_name = imageName
	global_image_id = imageId
	if imageName == "host" {
		node_id = hostName
		node_type = "host"
		isHostScan = true
		hostMountPath = strings.Replace(imageTarPath, "layer.tar", "", -1)
		global_image_id = hostName
	} else {
		node_id = imageName
		node_type = "container_image"
	}

	maskedCveIds = make(map[string]struct{})
	for _, val := range strings.Split(maskCveIdArgs, ",") {
		maskedCveIds[val] = struct{}{}
	}
	currentlyMaskedCveIds, err := getCurrentlyMaskedCveIds(node_id, node_type)
	if err != nil {
		log.Printf(err.Error())
	} else {
		for _, val := range currentlyMaskedCveIds {
			maskedCveIds[val] = struct{}{}
		}
	}

	// ------------------
	if scanId == "" || !strings.Contains(scanId, node_id) {
		scanId = node_id + "_" + getDatetimeNow()
	}

	go func() {
		sendScanLogsToLogstash("", "STARTED")
		ticker := time.NewTicker(2 * time.Minute)
		for {
			select {
			case <-ticker.C:
				sendScanLogsToLogstash("", "SCAN_IN_PROGRESS")
			case <-stopLogging:
				return
			}
		}
	}()

	// hostTarFile = /data/cve-scan-upload/dev-3/dev-3_2020-04-23T11:41:14.000/layer.tar
	// In k8s console, layer.tar will be present on the fetcher container, since there is no global
	// volume. So download it from fetcher.
	if imageTarPath != "" && !fileExists(imageTarPath) {
		err := downloadFileFromConsole(imageTarPath, imageTarPath, 1)
		if err != nil {
			logErrorAndExit(fmt.Sprintf("Error: %s", err))
		}
	}

	var manifestItem *manifestItem
	if !isHostScan {
		manifestItem = saveContainerImage(imageName, imageTarPath, imageId)
	}

	if !isHostScan {
		// Remove vulnerabilities from intermediate layers
		fileSystemsDir := "/data/fileSystems/"
		err = os.MkdirAll(fileSystemsDir, os.ModePerm)
		if err != nil {
			fmt.Printf("Error while creating fileSystems dir %s\n", err.Error())
		} else {
			fmt.Println("Extracting final file system of the image")
			fileSet = make(map[string]bool)
			outputTarPath := fileSystemsDir + "temp.tar"
			err = containerRuntimeInterface.ExtractFileSystem(imageTarPath, outputTarPath, imageName)
			if err == nil {
				// extracting list of file names with path from tar file
				cmd := "tar tf " + outputTarPath + " | grep -e [^/]$"
				files, execErr := ExecuteCommand(cmd)
				if execErr == nil {
					fileList := strings.Split(files, "\n")
					for _, val := range fileList {
						// This check is to handle tar structure returned from containerd api
						if strings.HasPrefix(val, "./") {
							val = strings.Replace(val, "./", "", 1)
						}
						fileSet["/"+val] = true
					}
				} else {
					fmt.Printf("Error extracting list of file names with path from tar file %s\n", execErr.Error())
				}
			}
			if err != nil {
				fmt.Printf("Error while extracting fileSystem from %s: %s\n", imageTarPath, err.Error())
			} else {
				fmt.Printf("Filesystem extracted at %s with number of files: %d\n", outputTarPath, len(fileSet))
			}
			deleteFiles(fileSystemsDir, "*.tar")
		}
	}

	// language scan
	if len(scanTypes) != 0 {
		if updateDepCheckData {
			depCheckErrMsg := checkDependencyData()
			if depCheckErrMsg != "" {
				logErrorAndExit(depCheckErrMsg)
			}
			fmt.Printf("Dependency data downloaded. Proceeding\n")
		}

		vulnerabilityDataPresent := true
		fileFd, err := os.Open(depcheckDataDir)
		if err != nil {
			vulnerabilityDataPresent = false
		} else {
			_, err := fileFd.Readdir(1)
			if err == io.EOF {
				vulnerabilityDataPresent = false
			}
		}
		if !vulnerabilityDataPresent {
			sendScanLogsToLogstash("Language vulnerability database not yet updated. Results may be incomplete", "WARN")
		} else {
			// Scans for different languages
			for _, scanLang := range scanTypes {
				errVal = getLanguageVulnerabilities(scanLang, fileSet)
				if errVal != "" {
					sendScanLogsToLogstash(errVal, "WARN")
				}
			}
		}
	}

	// base scan
	if isHostScan {
		getHostVulnerabilities(hostName, imageTarPath)
	} else {
		getContainerVulnerabilities(imageName, imageTarPath, imageId, manifestItem)
	}

	completeScan()
}

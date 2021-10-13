// Copyright 2017 clair authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package nvd implements a vulnerability metadata appender using the NIST NVD
// database.
package nvd

import (
	"bufio"
	"compress/gzip"
	"encoding/json"
	"errors"
	"fmt"
	"io"

	//"io/ioutil"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/quay/clair/v2/database"
	"github.com/quay/clair/v2/ext/vulnmdsrc"
	"github.com/quay/clair/v2/pkg/commonerr"
	"github.com/quay/clair/v2/pkg/httputil"
)

const (
	dataFeedURL     string = "https://nvd.nist.gov/feeds/json/cve/1.1/nvdcve-1.1-%s.json.gz"
	dataFeedMetaURL string = "https://nvd.nist.gov/feeds/json/cve/1.1/nvdcve-1.1-%s.meta"
	nvdUpdatedFlags        = "nvdUpdateHash"
	appenderName    string = "NVD"
	logDataFeedName string = "data feed name"
)

type appender struct {
	localPath      string
	dataFeedHashes map[string]string
	metadata       map[string]NVDMetadata
	hashFileName   string
	updaterKey     string
}

type NVDMetadata struct {
	CVSSv2 NVDmetadataCVSSv2
	CVSSv3 NVDmetadataCVSSv3
}

type NVDmetadataCVSSv2 struct {
	PublishedDateTime string
	Vectors           string
	Score             float64
}

type NVDmetadataCVSSv3 struct {
	Vectors             string
	Score               float64
	ExploitabilityScore float64
	ImpactScore         float64
}

func init() {
	vulnmdsrc.RegisterAppender(appenderName, &appender{updaterKey: nvdUpdatedFlags})
}

func (a *appender) BuildCache(datastore database.Datastore) (error, bool) {
	var err error

	// Init if necessary.
	if a.localPath == "" {
		// Create a temporary folder to store the NVD data and create hashes struct.
		a.localPath = "/tmp/nvd-data"
		a.hashFileName = filepath.Join(a.localPath, "file-hash.txt")
		os.Mkdir(a.localPath, 0755)
		a.metadata = make(map[string]NVDMetadata)
		a.dataFeedHashes = make(map[string]string)
	}

	// Get data feeds.
	dataFeedReaders, dataFeedHashes, err := getDataFeeds(datastore, a.localPath, a.hashFileName, a.updaterKey)
	if err != nil {
		return err, false
	}
	if (dataFeedReaders == nil) && (dataFeedHashes == nil) && (err == nil) {
		return nil, true
	}
	a.dataFeedHashes = dataFeedHashes

	// Parse data feeds.
	for dataFeedName, dataFileName := range dataFeedReaders {
		f, err := os.Open(dataFileName)
		if err != nil {
			log.WithError(err).WithField(logDataFeedName, dataFeedName).Error("could not open NVD data file")
			return commonerr.ErrCouldNotParse, false
		}

		r := bufio.NewReader(f)
		if err := a.parseDataFeed(r); err != nil {
			log.WithError(err).WithField(logDataFeedName, dataFeedName).Error("could not parse NVD data file")
			return err, false
		}
		f.Close()
	}

	return nil, true
}

func (a *appender) parseDataFeed(r io.Reader) error {
	var nvd nvd

	if err := json.NewDecoder(r).Decode(&nvd); err != nil {
		return commonerr.ErrCouldNotParse
	}

	for _, nvdEntry := range nvd.Entries {
		// Create metadata entry.
		if metadata := nvdEntry.Metadata(); metadata != nil {
			a.metadata[nvdEntry.Name()] = *metadata
		}
	}

	return nil
}

func (a *appender) Append(vulnName string, appendFunc vulnmdsrc.AppendFunc) error {
	if nvdMetadata, ok := a.metadata[vulnName]; ok {
		appendFunc(appenderName, nvdMetadata, SeverityFromCVSS(nvdMetadata.CVSSv2.Score))
	}

	return nil
}

func (a *appender) PurgeCache() {
	a.metadata = nil
}

func (a *appender) Clean() {
	os.RemoveAll(a.localPath)
}

func readHashFromFile(filePath string, datastore database.Datastore,
	dbKey string) map[string]string {

	filePtr, err := os.Open(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			flagValue, dbErr := datastore.GetKeyValue(dbKey)
			if dbErr != nil {
				dbErrVal := fmt.Sprintf("Error reading key %s from db.  ",
					dbKey, dbErr.Error())
				log.Info(dbErrVal)
				return nil
			}
			if flagValue == "" {
				return nil
			}
			mixValue := strings.Split(flagValue, "____")
			keyStrs := strings.Split(mixValue[0], "__")
			valueStrs := strings.Split(mixValue[1], "__")
			var outputVal = make(map[string]string)
			for i := 0; i < len(keyStrs); i++ {
				outputVal[keyStrs[i]] = valueStrs[i]
			}
			writeHashToFile(filePath, outputVal, datastore, dbKey, false)
			return outputVal
		}
		errStr := fmt.Sprintf("Error occurred while opening %s. Reason = %s",
			filePath, err.Error())
		log.Info(errStr)
		return nil
	}
	defer filePtr.Close()
	fileScanner := bufio.NewScanner(filePtr)
	if fileScanner == nil {
		log.Info("*** Bufio new scanner is null ***")
		return nil
	}
	fileScanner.Split(bufio.ScanLines)
	var fileLines []string
	for fileScanner.Scan() {
		fileLines = append(fileLines, fileScanner.Text())
	}
	var tmpSplitVal []string
	var outputVal = make(map[string]string)
	for _, lineVal := range fileLines {
		tmpSplitVal = strings.Split(lineVal, " ")
		outputVal[tmpSplitVal[0]] = tmpSplitVal[1]
	}
	return outputVal
}

func writeHashToFile(fileName string, inputVal map[string]string, datastore database.Datastore,
	dbKey string, dbWrite bool) {

	filePtr, errVal := os.OpenFile(fileName, os.O_RDWR|os.O_CREATE|os.O_SYNC, 0644)
	if errVal != nil {
		errStr := fmt.Sprintf("Unable to open file %s. Reason = %s",
			fileName, errVal.Error())
		log.Info(errStr)
		return
	}
	defer filePtr.Close()
	for key, value := range inputVal {
		filePtr.WriteString(fmt.Sprintf("%s %s\n", key, value))
	}
	filePtr.Sync()
	if dbWrite {
		var keyString string
		var valueString string
		for key, value := range inputVal {
			if len(keyString) == 0 {
				keyString = key
			} else {
				keyString = keyString + "__" + key
			}
			if len(valueString) == 0 {
				valueString = value
			} else {
				valueString = valueString + "__" + value
			}
		}
		finalString := keyString + "____" + valueString
		insertErr := datastore.InsertKeyValue(dbKey, finalString)
		if insertErr != nil {
			insertStr := fmt.Sprintf("Error while inserting %s. Reason %s\n",
				finalString, insertErr.Error())
			log.Info(insertStr)
		}
	}
	return
}

func getDataFeeds(datastore database.Datastore, localPath string, hashFile string, dbKey string) (map[string]string, map[string]string, error) {

	var dataFeedNames []string
	var tmpDataFeedHashes, outputHashes map[string]string

	for y := 2002; y <= time.Now().Year(); y++ {
		dataFeedNames = append(dataFeedNames, strconv.Itoa(y))
	}
	fileHashData := readHashFromFile(hashFile, datastore, dbKey)
	tmpDataFeedHashes = make(map[string]string)
	// Get hashes for these feeds.
	for _, dataFeedName := range dataFeedNames {
		hash, err := getHashFromMetaURL(fmt.Sprintf(dataFeedMetaURL, dataFeedName))
		if err != nil {
			log.WithError(err).WithField(logDataFeedName, dataFeedName).Warning("could not get NVD data feed hash")

			// It's not a big deal, no need interrupt, we're just going to download it again then.
			continue
			tmpDataFeedHashes[dataFeedName] = ""
		}
		tmpDataFeedHashes[dataFeedName] = hash
	}
	dataFeedReaders := make(map[string]string)
	outputHashes = make(map[string]string)
	for dataFeedName, _ := range tmpDataFeedHashes {
		if tmpDataFeedHashes[dataFeedName] == "" {
			if fileHashData != nil {
				outputHashes[dataFeedName] = fileHashData[dataFeedName]
			}
			continue
		}
		if fileHashData != nil {
			if tmpDataFeedHashes[dataFeedName] == fileHashData[dataFeedName] {
				outputHashes[dataFeedName] = fileHashData[dataFeedName]
				continue
			}
		}
		fileName := filepath.Join(localPath, fmt.Sprintf("%s.json", dataFeedName))
		os.Remove(fileName)
		err := downloadFeed(dataFeedName, fileName)
		if err == nil {
			dataFeedReaders[dataFeedName] = fileName
			outputHashes[dataFeedName] = tmpDataFeedHashes[dataFeedName]

		} else {
			errStr := fmt.Sprintf("Error while downloading data for %s from NVD.  Reason = %s", dataFeedName, err.Error())
			log.Info(errStr)
		}

	}
	os.Remove(hashFile)
	writeHashToFile(hashFile, outputHashes, datastore, dbKey, true)
	return dataFeedReaders, outputHashes, nil
}

func downloadFeed(dataFeedName, fileName string) error {
	// Download data feed.
	r, err := httputil.GetWithUserAgent(fmt.Sprintf(dataFeedURL, dataFeedName))
	if err != nil {
		log.WithError(err).WithField(logDataFeedName, dataFeedName).Error("could not download NVD data feed")
		return commonerr.ErrCouldNotDownload
	}
	if r == nil {
		log.WithField("package", "NVD").Info("No vulnerabilities obtained")
		return commonerr.ErrNotFound
	}
	defer r.Body.Close()

	if !httputil.Status2xx(r) {
		log.WithFields(log.Fields{"StatusCode": r.StatusCode, "DataFeedName": dataFeedName}).Error("Failed to download NVD data feed")
		return commonerr.ErrCouldNotDownload
	}

	// Un-gzip it.
	gr, err := gzip.NewReader(r.Body)
	if err != nil {
		log.WithError(err).WithFields(log.Fields{"StatusCode": r.StatusCode, "DataFeedName": dataFeedName}).Error("could not read NVD data feed")
		return commonerr.ErrCouldNotDownload
	}

	// Store it to a file at the same time if possible.
	f, err := os.Create(fileName)
	if err != nil {
		log.WithError(err).WithField("Filename", fileName).Warning("could not store NVD data feed to filesystem")
		return commonerr.ErrFilesystem
	}
	defer f.Close()

	_, err = io.Copy(f, gr)
	if err != nil {
		log.WithError(err).WithField("Filename", fileName).Warning("could not stream NVD data feed to filesystem")
		return commonerr.ErrFilesystem
	}

	return nil
}

func getHashFromMetaURL(metaURL string) (string, error) {
	r, err := httputil.GetWithUserAgent(metaURL)
	if err != nil {
		return "", err
	}
	if r == nil {
		log.WithField("package", "NVD").Info("No vulnerabilities obtained")
		return "", commonerr.ErrNotFound
	}
	defer r.Body.Close()
	if !httputil.Status2xx(r) {
		return "", fmt.Errorf("%v failed status code: %d", metaURL, r.StatusCode)
	}
	scanner := bufio.NewScanner(r.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "sha256:") {
			return strings.TrimPrefix(line, "sha256:"), nil
		}
	}
	if err := scanner.Err(); err != nil {
		return "", err
	}

	return "", errors.New("invalid .meta file format")
}

// SeverityFromCVSS converts the CVSS Score (0.0 - 10.0) into a
// database.Severity following the qualitative rating scale available in the
// CVSS v3.0 specification (https://www.first.org/cvss/specification-document),
// Table 14.
//
// The Negligible level is set for CVSS scores between [0, 1), replacing the
// specified None level, originally used for a score of 0.
func SeverityFromCVSS(score float64) database.Severity {
	switch {
	case score < 1.0:
		return database.NegligibleSeverity
	case score < 3.9:
		return database.LowSeverity
	case score < 6.9:
		return database.MediumSeverity
	case score < 8.9:
		return database.HighSeverity
	case score <= 10:
		return database.CriticalSeverity
	}
	return database.UnknownSeverity
}

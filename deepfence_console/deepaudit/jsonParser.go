package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

type depCheckStruct struct {
	ReportSchema string `json:"reportSchema,omitempty"`
	ScanInfo     struct {
		EngineVersion string `json:"engineVersion,omitempty"`
		DataSource    []struct {
			Name      string `json:"name,omitempty"`
			Timestamp string `json:"timestamp,omitempty"`
		} `json:"dataSource,omitempty"`
	} `json:"scanInfo,omitempty"`
	ProjectInfo struct {
		Name       string `json:"name,omitempty"`
		ReportDate string `json:"reportDate,omitempty"`
		Version    string `json:"version,omitempty"`
		Credits    struct {
			Nvd      string `json:"NVD,omitempty"`
			Npm      string `json:"NPM,omitempty"`
			Retirejs string `json:"RETIREJS,omitempty"`
			OssIndex string `json:"OSSINDEX,omitempty"`
		} `json:"credits,omitempty"`
	} `json:"projectInfo,omitempty"`
	Dependencies []struct {
		IsVirtual         bool     `json:"isVirtual,omitempty"`
		FileName          string   `json:"fileName,omitempty"`
		FilePath          string   `json:"filePath,omitempty"`
		Md5               string   `json:"md5,omitempty"`
		Sha1              string   `json:"sha1,omitempty"`
		Sha256            string   `json:"sha256,omitempty"`
		ProjectReferences []string `json:"projectReferences,omitempty"`
		EvidenceCollected struct {
			VendorEvidence []struct {
				TypeVal    string `json:"type,omitempty"`
				Confidence string `json:"confidence,omitempty"`
				Source     string `json:"source,omitempty"`
				Name       string `json:"name,omitempty"`
				Value      string `json:"value,omitempty"`
			} `json:"vendorEvidence,omitempty"`
			ProductEvidence []struct {
				TypeVal    string `json:"type,omitempty"`
				Confidence string `json:"confidence,omitempty"`
				Source     string `json:"source,omitempty"`
				Name       string `json:"name,omitempty"`
				Value      string `json:"value,omitempty"`
			} `json:"productEvidence,omitempty"`
			VersionEvidence []struct {
				TypeVal    string `json:"type,omitempty"`
				Confidence string `json:"confidence,omitempty"`
				Source     string `json:"source,omitempty"`
				Name       string `json:"name,omitempty"`
				Value      string `json:"value,omitempty"`
			} `json:"versionEvidence,omitempty"`
		} `json:"evidenceCollected,omitempty"`
		VulnerabilityIds []struct {
			ID         string `json:"id,omitempty"`
			Confidence string `json:"confidence,omitempty"`
			Url        string `json:"url,omitempty"`
		} `json:"vulnerabilityIds,omitempty"`
		RelatedDependencies []struct {
			IsVirtual  bool   `json:"isVirtual,omitempty"`
			FileName   string `json:"fileName,omitempty"`
			FilePath   string `json:"filePath,omitempty"`
			Sha256     string `json:"sha256,omitempty"`
			Sha1       string `json:"sha1,omitempty"`
			Md5        string `json:"md5,omitempty"`
			PackageIds []struct {
				ID  string `json:"id,omitempty"`
				URL string `json:"url,omitempty"`
			} `json:"packageIds,omitempty"`
		} `json:"relatedDependencies,omitempty"`
		Vulnerabilities []struct {
			Source   string `json:"source,omitempty"`
			Name     string `json:"name,omitempty"`
			Severity string `json:"severity,omitempty"`
			Cvssv2   struct {
				Score                   float64 `json:"score,omitempty"`
				AccessVector            string  `json:"accessVector,omitempty"`
				AccessComplexity        string  `json:"accessComplexity,omitempty"`
				Authenticationr         string  `json:"authenticationr,omitempty"`
				ConfidentialImpact      string  `json:"confidentialImpact,omitempty"`
				IntegrityImpact         string  `json:"integrityImpact,omitempty"`
				AvailabilityImpact      string  `json:"availabilityImpact,omitempty"`
				Severity                string  `json:"severity,omitempty"`
				Version                 string  `json:"version,omitempty"`
				ExploitabilityScore     string  `json:"exploitabilityScore,omitempty"`
				ImpactScore             string  `json:"impactScore,omitempty"`
				UserInteractionRequired string  `json:"userInteractionRequired,omitempty"`
				AcInsufInfo             string  `json:"acInsufInfo,omitempty"`
			} `json:"cvssv2,omitempty"`
			Cvssv3 struct {
				BaseScore             float64 `json:"baseScore,omitempty"`
				AttackVector          string  `json:"attackVector,omitempty"`
				AttackComplexity      string  `json:"attackComplexity,omitempty"`
				PrivilegesRequired    string  `json:"privilegesRequired,omitempty"`
				UserInteraction       string  `json:"userInteraction,omitempty"`
				Scope                 string  `json:"scope,omitempty"`
				ConfidentialityImpact string  `json:"confidentialityImpact,omitempty"`
				IntegrityImpact       string  `json:"integrityImpact,omitempty"`
				AvailabilityImpact    string  `json:"availabilityImpact,omitempty"`
				BaseSeverity          string  `json:"baseSeverity,omitempty"`
				ExploitabilityScore   string  `json:"exploitabilityScore,omitempty"`
				ImpactScore           string  `json:"impactScore,omitempty"`
				Version               string  `json:"version,omitempty"`
			} `json:"cvssv3,omitempty"`
			Cwes        []string `json:"cwes,omitempty"`
			Description string   `json:"description,omitempty"`
			Notes       string   `json:"notes,omitempty"`
			References  []struct {
				Source string `json:"source,omitempty"`
				Url    string `json:"url,omitempty"`
				Name   string `json:"name,omitempty"`
			} `json:"references,omitempty"`
			VulnerableSoftware []struct {
				Software struct {
					ID                     string `json:"id,omitempty"`
					VulnerabilityIDMatched string `json:"vulnerabilityIdMatched,omitempty"`
					VersionStartIncluding  string `json:"versionStartIncluding,omitempty"`
					VersionEndExcluding    string `json:"versionEndExcluding,omitempty"`
					Vulnerable             string `json:"vulnerable,omitempty"`
				} `json:"software,omitempty,omitempty"`
			} `json:"vulnerableSoftware,omitempty"`
		} `json:"vulnerabilities,omitempty,omitempty"`
		Description string `json:"description,omitempty"`
		Packages    []struct {
			ID         string `json:"id,omitempty"`
			Confidence string `json:"confidence,omitempty"`
			Url        string `json:"url,omitempty"`
		} `json:"packages,omitempty"`
		License string `json:"license,omitempty"`
	} `json:"dependencies,omitempty"`
}

var layerIdx = 3

func decodeDepCheckJson(language string, extFileDirList []string, fileSet map[string]bool) error {
	var fileName string
	var depCheckData depCheckStruct

	if runtime.GOOS == "windows" {
		tmpDir := "C:/ProgramData/Deepfence/temp" //windows result dir
		fileName = fmt.Sprintf(filepath.Join(tmpDir, "output_"+start_time+".json"))
	} else {
		fileName = fmt.Sprintf("/root/output_" + start_time + ".json")
	}
	fileBuff, err := ioutil.ReadFile(fileName)
	if err != nil {
		return err
	}
	err = json.Unmarshal(fileBuff, &depCheckData)
	if err != nil {
		return err
	}
	recordCount := len(depCheckData.Dependencies)
	dependencyList := depCheckData.Dependencies

	var cveJsonList string
	for i := 0; i < recordCount; i++ {
		if dependencyList[i].Vulnerabilities == nil {
			fmt.Printf("No vulnerabilities detected in %s\n",
				dependencyList[i].FileName)
			continue
		}
		pkgFilePath := dependencyList[i].FilePath
		vulnerabilityList := dependencyList[i].Vulnerabilities
		vulnerabilityCount := len(vulnerabilityList)
		for j := 0; j < vulnerabilityCount; j++ {
			var nodeData dfVulnStruct
			nodeData.Cve_severity = vulnerabilityList[j].Severity
			if vulnerabilityList[j].Cvssv3.AttackVector != "" {
				nodeData.Cve_attack_vector = vulnerabilityList[j].Cvssv3.AttackVector
			} else {
				nodeData.Cve_attack_vector = vulnerabilityList[j].Cvssv2.AccessVector
			}
			nodeData.Cve_id = vulnerabilityList[j].Name
			nodeData.Cve_description = vulnerabilityList[j].Description
			cveScore := vulnerabilityList[j].Cvssv3.BaseScore
			if cveScore == 0 {
				cveScore = vulnerabilityList[j].Cvssv2.Score
			}
			nodeData.Cve_cvss_score = fillMissingCveScore(vulnerabilityList[j].Severity, cveScore, nodeData.Cve_attack_vector)
			if vulnerabilityList[j].References != nil && len(vulnerabilityList[j].References) > 0 {
				nodeData.Cve_link = vulnerabilityList[j].References[0].Url
			} else {
				nodeData.Cve_link = ""
			}
			nodeData.Cve_fixed_in = ""
			if global_image_name == "host" {
				nodeData.Cve_container_layer = "host"
				nodeData.Cve_container_image = global_host_name
				nodeData.Cve_container_image_id = global_host_name
				nodeData.Cve_container_name = global_container_name
			} else {
				tmpFilePath := dependencyList[i].FilePath
				tmpDirList := strings.Split(tmpFilePath, string(os.PathSeparator))
				nodeData.Cve_container_layer = tmpDirList[layerIdx]
				nodeData.Cve_container_image = global_image_name
				nodeData.Cve_container_image_id = global_image_id
				nodeData.Cve_container_name = global_container_name
			}
			for _, tmpDir := range extFileDirList {
				if strings.HasPrefix(pkgFilePath, tmpDir) {
					pkgFilePath = strings.Replace(pkgFilePath, tmpDir, "", 1)
					break
				}
			}
			if global_image_name != "host" {
				pkgFilePath = strings.Replace(pkgFilePath, "/"+nodeData.Cve_container_layer, "", 1)
			}
			if pkgFilePath != "" && len(fileSet) > 100 && excludeVulnerability(pkgFilePath, fileSet) {
				fmt.Printf("Skipping vulnerability of %s as absent in fileset", pkgFilePath)
				continue
			}
			nodeData.Cve_caused_by_package = dependencyList[i].FileName
			nodeData.Cve_caused_by_package_path = pkgFilePath
			nodeData.Cve_type = language
			nodeData.Cve_overall_score = updateCveScore(vulnerabilityList[j].Severity, cveScore, nodeData.Cve_attack_vector)
			if _, found := maskedCveIds[nodeData.Cve_id]; found {
				nodeData.Masked = "true"
			} else {
				nodeData.Masked = "false"
			}
			cveJson, err := formatCveJson(nodeData)
			if err == nil && cveJson != "" {
				cveJsonList += cveJson + ","
			}
			if nodeData.Masked == "false" {
				cveCounter.addCveCount(nodeData.Cve_severity)
			}
		}
	}
	return sendCveJsonToLogstash("[" + trimSuffix(cveJsonList, ",") + "]")
}

func excludeVulnerability(pkgFilePath string, fileSet map[string]bool) bool {
	if fileSet[pkgFilePath] == true {
		return false
	}

	includingSplitStrings := []string{":", ".jar", ".war", ".pyc", ".whl", ".egg", "METADATA", "PKG-INFO", ".gemspec", "Rakefile", "composer.lock", "package.json", ".js", ".dll", ".exe"}
	for _, splitString := range includingSplitStrings {
		splits := strings.Split(pkgFilePath, splitString)
		if len(splits) > 1 {
			if fileSet[splits[0]] == true || fileSet[splits[0] + splitString] == true {
				return false
			}
		}
	}
	return true
}

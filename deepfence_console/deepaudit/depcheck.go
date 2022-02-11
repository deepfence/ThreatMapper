package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/juju/fslock"
)

var ignoreTarErrStr = "exit status 2"

func untarHostFiles(sourceDir string, fileExtn string, language string) (string, error) {
	var resultDir string
	var tmpExtn string
	var tmpErrVal error
	var tarWildCard string

	if strings.HasPrefix(fileExtn, ".") {
		tmpExtn = "tmp" + "-" + strings.Replace(fileExtn, ".", "", 1)
	} else {
		tmpExtn = "tmp" + "-" + fileExtn
	}
	resultDir, tmpErrVal = ioutil.TempDir("", tmpExtn)
	if tmpErrVal != nil {
		return "", tmpErrVal
	}
	if strings.HasPrefix(fileExtn, ".") {
		tarWildCard = "*" + fileExtn
	} else {
		tarWildCard = "*" + fileExtn + "*"
	}
	if !fileExists(sourceDir + language + ".tar") {
		err := downloadFileFromConsole(sourceDir+language+".tar", sourceDir+language+".tar", 1)
		if err != nil {
			return resultDir, err
		}
	}
	untarCmd := fmt.Sprintf("/bin/tar -xf %s -C %s --wildcards \"%s\" ", sourceDir+language+".tar", resultDir, tarWildCard)
	_, cmdErr := exec.Command("sh", "-c", untarCmd).Output()
	if cmdErr != nil && cmdErr.Error() != ignoreTarErrStr {
		fmt.Printf("Unable to untar \n")
		fmt.Printf("Cmd is %s error is %s \n", untarCmd, cmdErr.Error())
	}
	return resultDir, tmpErrVal
}

func deleteExtraFiles(srcDir string, fileExtn string) error {

	errVal := filepath.Walk(srcDir, func(fileNamePath string,
		fileInfo os.FileInfo, err error) error {
		if err != nil {
			fmt.Printf("Error while deleting. Reason = %s\n",
				err.Error())
		}
		if fileInfo == nil {
			return nil
		}
		if (!fileInfo.IsDir()) &&
			(filepath.Base(fileNamePath) != fileExtn) {
			errVal := os.Remove(fileNamePath)
			if errVal != nil {
				fmt.Printf("Error removing %s. Reason = %s \n",
					fileNamePath, errVal.Error())
			}
		}
		return nil
	})
	return (errVal)
}

func untarFiles(srcDir string, fileExtn string) (string, error) {

	var tmpExtn string
	var resultDir string
	var errVal error

	if strings.HasPrefix(fileExtn, ".") {
		tmpExtn = "tmp" + "-" + strings.Replace(fileExtn, ".", "", 1)
	} else {
		tmpExtn = "tmp" + "-" + fileExtn
	}
	if runtime.GOOS == "windows" {
		resultDir, errVal = ioutil.TempDir("C:/ProgramData/Deepfence/temp", tmpExtn)
		if errVal != nil {
			return "", errVal
		}
	} else {
		resultDir, errVal = ioutil.TempDir("", tmpExtn)
		if errVal != nil {
			return "", errVal
		}
	}
	var tarWildCard string
	var dirStrings []string
	var outputDir string
	err := filepath.Walk(srcDir, func(fileNamePath string, fileInfo os.FileInfo, errVal error) error {
		if errVal != nil {
			fmt.Printf("Error while untar. Reason = %s \n", errVal.Error())
		}
		if fileInfo == nil {
			return nil
		}
		if (!fileInfo.IsDir()) &&
			(filepath.Base(fileNamePath) == "layer.tar") {
			dirName := filepath.Dir(fileNamePath)
			if runtime.GOOS == "windows" {
				dirStrings = strings.Split(dirName, "\\")
			} else {
				dirStrings = strings.Split(dirName, "/")
			}
			newDirName := dirStrings[len(dirStrings)-1]
			if runtime.GOOS == "windows" {
				outputDir = resultDir + "\\" + newDirName
			} else {
				outputDir = path.Join(resultDir, newDirName)
			}
			localErr := os.MkdirAll(outputDir, 0755)
			if localErr != nil {
				return (localErr)
			}
			if strings.HasPrefix(fileExtn, ".") {
				tarWildCard = "*" + fileExtn
			} else {
				tarWildCard = "*" + fileExtn + "*"
			}
			if runtime.GOOS == "windows" {
				zipLoc := "C:/Program Files/7-zip/7z.exe"
				untarCmd := fmt.Sprintf("%s x %s -o%s %s", zipLoc, fileNamePath,
					outputDir, tarWildCard)
				oPathString := fmt.Sprintf("-o%s", outputDir)
				_, untarErr := exec.Command(zipLoc, "x", fileNamePath, oPathString, tarWildCard).Output()
				if untarErr != nil && untarErr.Error() != ignoreTarErrStr {
					fmt.Printf("Unable to untar \n")
					fmt.Printf("Cmd is %s error is %s \n",
						untarCmd, untarErr.Error())
				}
			} else {
				// Using 7z to untar which works for both tar and 7zip archives
				zipLoc := "/usr/bin/7z"
				untarCmd := fmt.Sprintf("%s x %s -o%s %s -r", zipLoc, fileNamePath, outputDir, tarWildCard)
				// untarCmd := fmt.Sprintf("/bin/tar -xf %s -C %s"+ " --wildcards \"%s\" ", fileNamePath, outputDir, tarWildCard)
				_, cmdErr := exec.Command("sh", "-c", untarCmd).Output()
				if cmdErr != nil && cmdErr.Error() != ignoreTarErrStr {
					fmt.Printf("Unable to untar \n")
					fmt.Printf("Cmd is %s error is %s \n",
						untarCmd, cmdErr.Error())
				}
			}
		}
		return nil
	})
	if !strings.HasPrefix(fileExtn, ".") {
		deleteExtraFiles(resultDir, fileExtn)
	}
	return resultDir, err
}

func getLanguageVulnerabilities(language string, fileSet map[string]bool) string {
	var fileExts []string
	var extFileDirList []string
	var cmdLine string
	var dirValues string
	var extFileDir string
	var err error
	/*var jsData []byte
	  var srcDirList []string
	  var srcDirListLen int
	  var srcDirErr*/
	var decodeErr error
	var errMsg string
	//var containerLayer string

	javaExt := []string{".jar", ".war"}
	pythonExt := []string{".pyc", ".whl", ".egg", "METADATA", "PKG-INFO"}
	rubyExt := []string{".gemspec", "Rakefile"}
	phpExt := []string{"composer.lock"}
	nodejsExt := []string{"package.json"}
	jsExt := []string{".js"}
	dotnetExt := []string{".dll", ".exe"}

	dirValues = ""
	if language == "java" {
		fileExts = javaExt
	} else if language == "python" {
		fileExts = pythonExt
	} else if language == "ruby" {
		fileExts = rubyExt
	} else if language == "php" {
		fileExts = phpExt
	} else if language == "nodejs" {
		fileExts = nodejsExt
	} else if language == "js" {
		fileExts = jsExt
	} else if language == "dotnet" {
		fileExts = dotnetExt
	}
	for i := 0; i < len(fileExts); i++ {
		if isHostScan {
			extFileDir, err = untarHostFiles(hostMountPath, fileExts[i], language)
		} else {
			extFileDir, err = untarFiles(tmp_path+"_backup/", fileExts[i])
		}
		if err != nil {
			tmpErrMsg := fmt.Sprintf("Error while trying to analyse files"+
				"of type %s. Reason = %s\n", fileExts[i], err.Error())
			fmt.Println(tmpErrMsg)
			errMsg = errMsg + tmpErrMsg
			continue
		}
		extFileDirList = append(extFileDirList, extFileDir)
	}
	extDirLen := len(extFileDirList)
	if extDirLen == 0 {
		return errMsg
	}
	/*
	   if( (language == "java") || (language == "python") ||
	               (language == "ruby") || (language == "php") ||
	                    (language == "dotnet")) || (language == "js") ||
	                                                   (language == "nodejs"){
	*/
	fmt.Printf("Number of entries in fileset %d\n\n", len(fileSet))
	for i := 0; i < extDirLen; i++ {
		extFileDir = extFileDirList[i]
		if strings.HasPrefix(fileExts[i], ".") {
			if runtime.GOOS == "windows" {
				dirValues = dirValues + " --scan " + extFileDir + "\\**\\*" + fileExts[i]
			} else {
				dirValues = dirValues + " --scan " + extFileDir + "/**/*" + fileExts[i]
			}
		} else {
			if runtime.GOOS == "windows" {
				dirValues = dirValues + " --scan " + extFileDir + "\\**\\" + fileExts[i]
			} else {
				dirValues = dirValues + " --scan " + extFileDir + "/**/" + fileExts[i]
			}
		}
	}
	cmdLine = fmt.Sprintf(dependency_check_cmd, dirValues)
	fmt.Printf("Dependency check cmd for %s is %s \n", language, cmdLine)
	lock := fslock.New(lockFileName)
	lock.Lock()
	if runtime.GOOS == "windows" {
		powershell, lookupErr := exec.LookPath("powershell.exe")
		if lookupErr != nil {
			errMsg = fmt.Sprintf("Powershell does not exist. Unable to execute CVE scan.")
			return errMsg
		}
		_, err = exec.Command(powershell, "-c", cmdLine).Output()
	} else {
		_, err = exec.Command("sh", "-c", cmdLine).Output()
	}
	lock.Unlock()
	if err != nil {
		errMsg = fmt.Sprintf("Unable to execute command for %s "+
			"vulnerabilities. Reason = %s \n", language, err.Error())
		fmt.Printf(errMsg)
		// if output file is present,
		// parse it for vulnerabilities, as a best-case scenario
		vulnOutputFileName := "/root/output_" + start_time + ".json"
		_, errStat := os.Stat(vulnOutputFileName)
		if errStat != nil {
			if os.IsNotExist(errStat) {
				for i := 0; i < extDirLen; i++ {
					deleteFiles(extFileDirList[i], "*")
					os.RemoveAll(extFileDirList[i])
				}
				return errMsg
			}
		}
	}
	fmt.Printf("Now analysing the output file \n")
	decodeErr = decodeDepCheckJson(language, extFileDirList, fileSet)
	if decodeErr != nil {
		errMsg = fmt.Sprintf("Error while decoding file for %s. Reason =%s \n",
			language, decodeErr.Error())
		return errMsg
	}
	fmt.Printf("Now deleting the output file \n")
	if runtime.GOOS == "windows" {
		tmpDir := "C:/ProgramData/Deepfence/temp"
		os.Remove(filepath.Join(tmpDir, "output_"+start_time+".json"))
	} else {
		os.Remove("/root/output_" + start_time + ".json")
	}
	//os.Remove("/tmp/depcheck_"+start_time+".log")
	/*} else if (language == "js") {
	      for i := 0; i< extDirLen; i++ {
	          extFileDir = extFileDirList[i]
	          srcDirList, srcDirErr = getDirectoryList(extFileDir)
	          if (srcDirErr != nil) {
	              fmt.Printf("Unable to list all directories of %s. Reason = %s \n",
	                                                          extFileDir,err.Error())
	              continue
	          }
	          srcDirListLen = len(srcDirList)
	          for j := 0; j < srcDirListLen; j++ {
	              cmdLine = fmt.Sprintf(retire_cmd,"-j","--jspath",srcDirList[j])
	              fmt.Printf("Now executing the command %s\n",cmdLine)
	              jsData, err = exec.Command("sh","-c",cmdLine).CombinedOutput()
	              if(err != nil) {
	                  fmt.Printf("Error while executing %s. Reason = %s \n",
	                                                          cmdLine, err.Error())
	                  continue
	              }
	              containerLayer = getLayerVal(srcDirList[j],image_name)
	              fmt.Println("Output is")
	              fmt.Println(string(jsData))
	              decodeErr = decodeJsJson(jsData,containerLayer,language)
	              if(decodeErr != nil) {
	                  errMsg = fmt.Sprintf("Error while decoding file for %s."+
	                                "Reason =%s \n", language,decodeErr.Error())
	                  fmt.Printf("%s \n",errMsg)
	              }
	          }
	      }
	  } else if (language == "nodejs") {
	      for i := 0; i< extDirLen; i++ {
	          extFileDir = extFileDirList[i]
	          srcDirList, srcDirErr = getDirectoryList(extFileDir)
	          if (srcDirErr != nil) {
	              fmt.Printf("Unable to list all directories of %s. Reason = %s \n",
	                                                          extFileDir,err.Error())
	              continue
	          }
	          srcDirListLen = len(srcDirList)
	          for j := 0; j < srcDirListLen; j++ {
	              cmdLine = fmt.Sprintf(retire_cmd,"-n","--nodepath",srcDirList[j])
	              fmt.Printf("Now executing the command %s\n",cmdLine)
	              jsData, err = exec.Command("sh","-c",cmdLine).CombinedOutput()
	              if(err != nil) {
	                  fmt.Printf("Error while executing %s. Reason = %s \n",
	                                                          cmdLine, err.Error())
	                  continue
	              }
	              containerLayer = getLayerVal(srcDirList[j],image_name)
	              fmt.Println("Output is")
	              fmt.Println(string(jsData))
	              decodeErr = decodeJsJson(jsData,containerLayer,language)
	              if(decodeErr != nil) {
	                  errMsg = fmt.Sprintf("Error while decoding file for %s. "+
	                                    "Reason =%s \n", language,decodeErr.Error())
	              }
	          }
	      }
	  }*/
	for i := 0; i < extDirLen; i++ {
		deleteFiles(extFileDirList[i], "*")
		os.RemoveAll(extFileDirList[i])
	}
	return ""
}

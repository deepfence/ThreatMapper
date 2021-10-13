// osrelease is a go package to make reading the contents of os-release files easier
//
// See https://www.freedesktop.org/software/systemd/man/os-release.html
package osrelease

import (
	"bufio"
	"errors"
	"os"
	"strings"
)

const EtcOsRelease string = "etc/os-release"
const UsrLibOsRelease string = "usr/lib/os-release"
const EtcLsbRelease string = "etc/lsb-release"
const EtcCentOSRelease string = "etc/centos-release"
const EtcRedhatRelease string = "etc/redhat-release"

func GetOSVersion(rootDir string) (string, error) {
	osName := ""
	versionId := ""

	// Check os-release, lsb-release
	osReleaseMap, err := readFiles(rootDir)
	if err == nil {
		var ok bool
		osName, ok := osReleaseMap["ID"]
		if !ok {
			osName, ok = osReleaseMap["DISTRIB_ID"]
		}
		versionId, ok = osReleaseMap["VERSION_ID"]
		if !ok {
			versionId, ok = osReleaseMap["DISTRIB_RELEASE"]
		}
		osName = strings.ToLower(osName)
		// Fedora - dont return version
		if osName == "fedora" {
			return osName, nil
		}
		versionId = strings.Replace(versionId, ".", "", -1)
		// CentOS and RHEL - send only version major
		if osName == "rhel" || osName == "centos" {
			return osName + versionId[0:1], nil
		}
		return osName + versionId, nil
	}
	// Check centos-release
	lines, err := parseFile(rootDir + EtcCentOSRelease)
	if err == nil && len(lines) > 0 {
		line := strings.Replace(lines[0], "CentOS release ", "", -1)
		osName = "centos"
		versionId = strings.Split(line, ".")[0]
		return osName + versionId, nil
	}
	// Check redhat-release
	lines, err = parseFile(rootDir + EtcRedhatRelease)
	if err == nil && len(lines) > 0 {
		line := strings.Replace(lines[0], "Red Hat Enterprise Linux Server release ", "", -1)
		osName = "rhel"
		versionId = strings.Split(line, ".")[0]
		return osName + versionId, nil
	}
	return "", err
}

// Read and return os-release, trying EtcOsRelease, followed by UsrLibOsRelease.
// err will contain an error message if neither file exists or failed to parse
func readFiles(rootDir string) (osrelease map[string]string, err error) {
	if rootDir == "" {
		rootDir = "/"
	}
	osrelease, err = readFile(rootDir + EtcOsRelease)
	if err != nil {
		osrelease, err = readFile(rootDir + UsrLibOsRelease)
		if err != nil {
			osrelease, err = readFile(rootDir + EtcLsbRelease)
		}
	}
	return
}

// Similar to Read(), but takes the name of a file to load instead
func readFile(filename string) (osrelease map[string]string, err error) {
	osrelease = make(map[string]string)
	err = nil

	lines, err := parseFile(filename)
	if err != nil {
		return
	}

	for _, v := range lines {
		key, value, err := parseLine(v)
		if err == nil {
			osrelease[key] = value
		}
	}
	return
}

func parseFile(filename string) (lines []string, err error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	return lines, scanner.Err()
}

func parseLine(line string) (key string, value string, err error) {
	err = nil

	// skip empty lines
	if len(line) == 0 {
		err = errors.New("Skipping: zero-length")
		return
	}

	// skip comments
	if line[0] == '#' {
		err = errors.New("Skipping: comment")
		return
	}

	// try to split string at the first '='
	splitString := strings.SplitN(line, "=", 2)
	if len(splitString) != 2 {
		err = errors.New("Can not extract key=value")
		return
	}

	// trim white space from key and value
	key = splitString[0]
	key = strings.Trim(key, " ")
	value = splitString[1]
	value = strings.Trim(value, " ")

	// Handle double quotes
	if strings.ContainsAny(value, `"`) {
		first := string(value[0:1])
		last := string(value[len(value)-1:])

		if first == last && strings.ContainsAny(first, `"'`) {
			value = strings.TrimPrefix(value, `'`)
			value = strings.TrimPrefix(value, `"`)
			value = strings.TrimSuffix(value, `'`)
			value = strings.TrimSuffix(value, `"`)
		}
	}

	// expand anything else that could be escaped
	value = strings.Replace(value, `\"`, `"`, -1)
	value = strings.Replace(value, `\$`, `$`, -1)
	value = strings.Replace(value, `\\`, `\`, -1)
	value = strings.Replace(value, "\\`", "`", -1)
	return
}

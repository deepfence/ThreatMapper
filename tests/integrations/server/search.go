package server

import (
	"errors"
	"fmt"
	"time"

	"github.com/deepfence/ThreatMapper/tests_integrations/utils"
)

func Test_search_top_vuln_hosts(setup utils.GraphDBSetup) (time.Duration, error) {
	res, duration, err := utils.RunDeepfenceCtl([]string{"top", "--toptype=vulnerability", "--type=host", "--num=5"})
	if err != nil {
		return duration, err
	}
	if len(res[""].([]map[string]interface{})) != 5 {
		return duration, errors.New("Not matching")
	}
	return duration, nil
}

func Test_search_all_vulnerabilities(setup utils.GraphDBSetup) (time.Duration, error) {
	res, duration, err := utils.RunDeepfenceCtl([]string{"issues", "--type=vulnerability"})
	if err != nil {
		return duration, err
	}
	if len(res[""].([]map[string]interface{})) != setup.NumVulnerabilities {
		return duration, errors.New("Not matching")
	}
	return duration, nil
}

func Test_search_all_vulnerability_count(setup utils.GraphDBSetup) (time.Duration, error) {
	res, duration, err := utils.RunDeepfenceCtl([]string{"count", "--type=vulnerability"})
	if err != nil {
		return duration, err
	}
	if int64(res["count"].(float64)) != int64(setup.NumVulnerabilities) {
		return duration, fmt.Errorf("Not matching: %v != %v", res["count"], setup.NumVulnerabilities)
	}
	return duration, nil
}

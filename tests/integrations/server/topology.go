package server

import (
	"errors"
	"log"
	"time"

	"github.com/deepfence/ThreatMapper/tests_integrations/utils"
)

func Test_topology(setup utils.GraphDBSetup) (time.Duration, error) {
	res, duration, err := utils.RunDeepfenceCtl([]string{"graph", "topology"})
	if err != nil {
		log.Fatal(err)
	}
	nodes, has := res["nodes"].(map[string]interface{})
	if !has {
		return duration, errors.New("Does not contain nodes")
	}
	if _, has := nodes["in-the-internet"]; !has {
		return duration, errors.New("Does not contain in-the-internet")
	}
	if _, has := nodes["out-the-internet"]; !has {
		return duration, errors.New("Does not contain out-the-internet")
	}
	return duration, err
}

func Test_topology_hosts(setup utils.GraphDBSetup) (time.Duration, error) {
	res, duration, err := utils.RunDeepfenceCtl([]string{"graph", "topology", "--root=hosts"})
	if err != nil {
		log.Fatal(err)
	}
	nodes, has := res["nodes"].(map[string]interface{})
	if !has {
		return duration, errors.New("Does not contain nodes")
	}
	if _, has := nodes["in-the-internet"]; !has {
		return duration, errors.New("Does not contain in-the-internet")
	}
	if _, has := nodes["out-the-internet"]; !has {
		return duration, errors.New("Does not contain out-the-internet")
	}
	return duration, err
}

func Test_topology_containers(setup utils.GraphDBSetup) (time.Duration, error) {
	res, duration, err := utils.RunDeepfenceCtl([]string{"graph", "topology", "--root=containers"})
	if err != nil {
		log.Fatal(err)
	}
	nodes, has := res["nodes"].(map[string]interface{})
	if !has {
		return duration, errors.New("Does not contain nodes")
	}
	if _, has := nodes["in-the-internet"]; !has {
		return duration, errors.New("Does not contain in-the-internet")
	}
	if _, has := nodes["out-the-internet"]; !has {
		return duration, errors.New("Does not contain out-the-internet")
	}
	return duration, err
}

func Test_topology_pods(setup utils.GraphDBSetup) (time.Duration, error) {
	res, duration, err := utils.RunDeepfenceCtl([]string{"graph", "topology", "--root=pods"})
	if err != nil {
		log.Fatal(err)
	}
	nodes, has := res["nodes"].(map[string]interface{})
	if !has {
		return duration, errors.New("Does not contain nodes")
	}
	if _, has := nodes["in-the-internet"]; !has {
		return duration, errors.New("Does not contain in-the-internet")
	}
	if _, has := nodes["out-the-internet"]; !has {
		return duration, errors.New("Does not contain out-the-internet")
	}
	return duration, err
}

func Test_topology_kubernetes(setup utils.GraphDBSetup) (time.Duration, error) {
	res, duration, err := utils.RunDeepfenceCtl([]string{"graph", "topology", "--root=kubernetes"})
	if err != nil {
		log.Fatal(err)
	}
	nodes, has := res["nodes"].(map[string]interface{})
	if !has {
		return duration, errors.New("Does not contain nodes")
	}
	if _, has := nodes["in-the-internet"]; !has {
		return duration, errors.New("Does not contain in-the-internet")
	}
	if _, has := nodes["out-the-internet"]; !has {
		return duration, errors.New("Does not contain out-the-internet")
	}
	return duration, err
}

package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"reflect"
	"runtime"
	"strconv"
	"sync"
	"time"

	"github.com/fatih/color"

	"github.com/deepfence/ThreatMapper/tests_integrations/server"
	"github.com/deepfence/ThreatMapper/tests_integrations/utils"
)

func GetFunctionName(i interface{}) string {
	return runtime.FuncForPC(reflect.ValueOf(i).Pointer()).Name()
}

var (
	max_worker int
)

type TestFunc func(utils.GraphDBSetup) (time.Duration, error)

func init() {
	var err error
	tmp_max_worker := os.Getenv("DF_TEST_MAX_WORKER")
	if tmp_max_worker == "" {
		max_worker = 8
	} else {
		max_worker, err = strconv.Atoi(tmp_max_worker)
		if err != nil {
			log.Fatal("DF_TEST_MAX_WORKER is not a number: %v", tmp_max_worker)
		}
	}
}

type WorkerEntry struct {
	index int
	test  TestFunc
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	var enableBench = flag.Int("bench", 0, "Run benchmarks")
	var numHosts = flag.Int("num-hosts", 0, "Total number of hosts")
	var numVulns = flag.Int("num-vulns", 0, "Total number of vulnerabilities")
	flag.Parse()

	test_list := []TestFunc{
		server.Test_topology,
		server.Test_topology_hosts,
		server.Test_topology_containers,
		server.Test_topology_pods,
		server.Test_topology_kubernetes,

		server.Test_search_all_vulnerabilities,
		server.Test_search_all_vulnerability_count,
		server.Test_search_top_vuln_hosts,
	}

	max_worker = min(max_worker, len(test_list))

	setup := utils.GraphDBSetup{
		NumHosts:           *numHosts,
		NumVulnerabilities: *numVulns,
	}

	valid_tests := run_tests(setup, test_list)
	if *enableBench != 0 {
		run_bench(setup, valid_tests, *enableBench)
	}
}

func run_tests(setup utils.GraphDBSetup, test_list []TestFunc) []TestFunc {
	res := []TestFunc{}
	var wg sync.WaitGroup
	// Test loop
	passed := make([]bool, len(test_list))
	test_queue := make(chan WorkerEntry)
	for i := 0; i < max_worker; i += 1 {
		go func() {
			for entry := range test_queue {
				_, err := entry.test(setup)
				passed[entry.index] = err == nil
			}
			wg.Done()
		}()
	}
	wg.Add(max_worker)

	for i, test := range test_list {
		test_queue <- WorkerEntry{
			index: i,
			test:  test,
		}
	}
	close(test_queue)
	wg.Wait()

	fmt.Printf("\n\n=== Tests results ===\n\n")
	for i := range test_list {
		if passed[i] {
			color.Green("%v: passed\n", GetFunctionName(test_list[i]))
			res = append(res, test_list[i])
		} else {
			color.Red("%v: failed!\n", GetFunctionName(test_list[i]))
		}
	}
	return res
}

func run_bench(setup utils.GraphDBSetup, test_list []TestFunc, count int) {
	var wg sync.WaitGroup
	// Bench loop
	benchs := make([][]time.Duration, len(test_list))

	test_queue := make(chan WorkerEntry)
	for i := 0; i < max_worker; i += 1 {
		go func() {
			for entry := range test_queue {
				benchs[entry.index] = make([]time.Duration, 0, count)
				for n := 0; n < count; n += 1 {
					t, err := entry.test(setup)
					if err != nil {
						color.Yellow("Test failed when it should not have: %v at iteration %v: %v\n", entry.index, n, err)
						continue // Skip error
					}
					benchs[entry.index] = append(benchs[entry.index], t)
				}
			}
			wg.Done()
		}()
	}

	wg.Add(max_worker)
	for i, test := range test_list {
		test_queue <- WorkerEntry{
			index: i,
			test:  test,
		}
	}
	close(test_queue)
	wg.Wait()
	fmt.Printf("\n\n=== Bench results ===\n\n")
	for i := range test_list {
		var avg time.Duration
		for n := range benchs[i] {
			avg += benchs[i][n]
		}
		avg /= time.Duration(len(benchs[i]))
		fmt.Printf("%v: %v\n", GetFunctionName(test_list[i]), avg)
	}
}

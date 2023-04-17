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
)

func GetFunctionName(i interface{}) string {
	return runtime.FuncForPC(reflect.ValueOf(i).Pointer()).Name()
}

var (
	max_worker int
)

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
	test  func() (time.Duration, error)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	var enableBench = flag.Int("bench", 0, "Run benchmarks")
	flag.Parse()

	test_list := []func() (time.Duration, error){
		server.Test_topology,
		server.Test_topology_hosts,
		server.Test_topology_containers,
		server.Test_topology_pods,
		server.Test_topology_kubernetes,
	}

	max_worker = min(max_worker, len(test_list))

	valid_tests := run_tests(test_list)
	if *enableBench != 0 {
		run_bench(valid_tests, *enableBench)
	}
}

func run_tests(test_list []func() (time.Duration, error)) []func() (time.Duration, error) {
	res := []func() (time.Duration, error){}
	var wg sync.WaitGroup
	// Test loop
	passed := make([]bool, len(test_list))
	test_queue := make(chan WorkerEntry)
	for i := 0; i < max_worker; i += 1 {
		go func() {
			for entry := range test_queue {
				_, err := entry.test()
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

func run_bench(test_list []func() (time.Duration, error), count int) {
	var wg sync.WaitGroup
	// Bench loop
	benchs := make([][]time.Duration, len(test_list))

	test_queue := make(chan WorkerEntry)
	for i := 0; i < max_worker; i += 1 {
		go func() {
			for entry := range test_queue {
				benchs[entry.index] = make([]time.Duration, 0, count)
				for n := 0; n < count; n += 1 {
					t, err := entry.test()
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

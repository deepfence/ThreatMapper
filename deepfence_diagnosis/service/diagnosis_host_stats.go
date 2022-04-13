package main

import (
	"context"
	"encoding/json"
	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/mem"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"math"
	"net/http"
	"time"
)

type HostStats struct {
	Cpu    float64 `json:"cpu"`
	Memory float64 `json:"memory"`
}

func getCPUUsagePercent() (float64, error) {
	// keeping a 200 ms sleep to retrieve cpu usage percentage
	percentage, err := cpu.Percent(time.Duration(200)*time.Millisecond, false)
	if err != nil {
		return 0.00, err
	}
	return math.Ceil(percentage[0]*100) / 100, nil
}

func getMemoryUsagePercent() (float64, error) {
	vmstat, err := mem.VirtualMemory()
	if err != nil {
		return 0.00, err
	}
	return math.Ceil(vmstat.UsedPercent*100) / 100, nil
}

func getCpuMemoryStats(w http.ResponseWriter, r *http.Request) {
	hostStats := HostStats{}
	if nodeMetrics != "true" {
		json.NewEncoder(w).Encode(&hostStats)
		return
	}
	if orchestrator == kubernetesOrchestrator {
		// check if metrics server is set up in the cluster
		if kubeMetricsCli == nil {
			json.NewEncoder(w).Encode(&hostStats)
			return
		}
		options := metav1.ListOptions{}
		nodes, err := getClusterNodes(options)
		if err != nil {
			json.NewEncoder(w).Encode(&hostStats)
			return
		}
		cpuResourceLimits := map[string]int64{}
		memoryResourceLimits := map[string]int64{}
		for _, node := range nodes {
			nodeCpu := node.Status.Capacity.Cpu()
			cpuResourceLimits[node.Name] = nodeCpu.MilliValue()
			nodeMemory := node.Status.Capacity.Memory()
			memoryResourceLimits[node.Name] = nodeMemory.Value()
		}
		ctx := context.Background()
		nodeMetrics, err := kubeMetricsCli.MetricsV1beta1().NodeMetricses().List(ctx, options)
		if err != nil {
			json.NewEncoder(w).Encode(&hostStats)
			return
		}
		cpuResourceRequests := map[string]int64{}
		memoryResourceRequests := map[string]int64{}
		for _, nodeMetric := range nodeMetrics.Items {
			nodeName := nodeMetric.ObjectMeta.Name
			nodeMemory := nodeMetric.Usage.Memory().Value()
			nodeCpu := nodeMetric.Usage.Cpu().MilliValue()
			cpuResourceRequests[nodeName] = nodeCpu
			memoryResourceRequests[nodeName] = nodeMemory
		}
		cpuPercent := map[string]float64{}
		memoryPercent := map[string]float64{}
		for nodeName, value := range memoryResourceRequests {
			memoryPercent[nodeName] = (float64(value) / float64(memoryResourceLimits[nodeName])) * 100.0
		}
		for nodeName, value := range cpuResourceRequests {
			cpuPercent[nodeName] = (float64(value) / float64(cpuResourceLimits[nodeName])) * 100.0
		}
		totalMemoryRequest := float64(0)
		totalCpuRequest := float64(0)
		for _, value := range memoryPercent {
			totalMemoryRequest += value
		}
		for _, value := range cpuPercent {
			totalCpuRequest += value
		}
		totalCpuPercent := totalCpuRequest / float64(len(cpuPercent))
		totalMemoryPercent := totalMemoryRequest / float64(len(cpuPercent))

		hostStats.Cpu = math.Ceil(totalCpuPercent*100) / 100
		hostStats.Memory = math.Ceil(totalMemoryPercent*100) / 100
	} else {
		cpuPercentage, err := getCPUUsagePercent()
		if err == nil {
			hostStats.Cpu = cpuPercentage
		}
		memoryUsagePercentage, err := getMemoryUsagePercent()
		if err == nil {
			hostStats.Memory = memoryUsagePercentage
		}
	}
	// encode into json
	json.NewEncoder(w).Encode(&hostStats)
}

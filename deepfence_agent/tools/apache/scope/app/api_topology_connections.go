package app

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	ot "github.com/opentracing/opentracing-go"
	otlog "github.com/opentracing/opentracing-go/log"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	log "github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/common/xfer"
	hst "github.com/weaveworks/scope/probe/host"
	"github.com/weaveworks/scope/render"
	"github.com/weaveworks/scope/render/detailed"
	"github.com/weaveworks/scope/report"
)

const (
	connectionWebsocketLoop      = 5 * time.Second
	vulnerabilityScanStatusKey   = "vulnerability_scan_status"
	vulnerabilityScanStatusLabel = "Vulnerability Scan Status"
	secretScanStatusKey          = "secret_scan_status"
	secretScanStatusLabel        = "Secret Scan Status"
	complianceScanStatusKey      = "compliance_scan_status"
	complianceScanStatusLabel    = "Compliance Scan Status"
	nodeSeverityKey              = "node_severity"
	nodeSeverityLabel            = "Node Severity"
)

var (
	topologyIdOrder = map[string]int{cloudProvidersID: 1, cloudRegionsID: 2, kubernetesClustersID: 3, hostsID: 4, servicesID: 5, podsID: 6, containersID: 7, processesID: 8}
)

// APITopologyConnection is returned by the /api/connection/{name} handler.
type APITopologyConnection struct {
	Connections []detailed.ConnectionSummary `json:"connections"`
}

func handleConnections(ctx context.Context, renderer render.Renderer, transformer render.Transformer, rc detailed.RenderContext, w http.ResponseWriter, _ *http.Request) {
	connectionSummaryMap := detailed.GetTopologyConnectionSummaries(
		ctx,
		detailed.Summaries(ctx, rc, render.Render(ctx, rc.Report, renderer, transformer).Nodes, true),
		render.Render(ctx, rc.Report, renderer, transformer).Nodes,
	)
	connectionSummaries := make([]detailed.ConnectionSummary, len(connectionSummaryMap))
	count := 0
	for _, v := range connectionSummaryMap {
		connectionSummaries[count] = v
		count += 1
	}
	respondWith(ctx, w, http.StatusOK, APITopologyConnection{
		Connections: connectionSummaries,
	})
}

type Filters struct {
	Providers []string `json:"providers"`
	Regions   []string `json:"regions"`
	Hosts     []string `json:"hosts"`
}

type Result struct {
	Nodes detailed.NodeSummaries               `json:"nodes"`
	Edges detailed.TopologyConnectionSummaries `json:"edges"`
}

func handleTopologyGraph(
	ctx context.Context,
	rep Reporter,
	w http.ResponseWriter,
	r *http.Request,
) {
	if err := r.ParseForm(); err != nil {
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}
	filters := Filters{
		Providers: []string{},
		Regions:   []string{},
		Hosts:     []string{},
	}

	if p := r.PostForm.Get("providers"); p != "" {
		ps := strings.Split(p, ",")
		filters.Providers = append(filters.Providers, ps...)
	}

	if r := r.PostForm.Get("regions"); r != "" {
		rs := strings.Split(r, ",")
		filters.Regions = append(filters.Regions, rs...)
	}

	if h := r.PostForm.Get("hosts"); h != "" {
		hs := strings.Split(h, ",")
		filters.Hosts = append(filters.Hosts, hs...)
	}

	fmt.Printf("%v\n", filters)

	ChangeFilters(filters.Providers, filters.Regions, filters.Hosts)

	s, err := rep.AdminSummary(nil, time.Now())
	if err != nil {
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}
	var graph RenderedGraph
	json.Unmarshal([]byte(s), &graph)

	newTopo, newConnections := graphToSummaries(graph, filters.Regions, filters.Hosts)

	respondWith(ctx, w, http.StatusOK, Result{Nodes: newTopo, Edges: newConnections})
}

func handleConnectionsWebsocket(
	ctx context.Context,
	rep Reporter,
	w http.ResponseWriter,
	r *http.Request,
) {
	if err := r.ParseForm(); err != nil {
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}
	loop := connectionWebsocketLoop
	if t := r.Form.Get("t"); t != "" {
		var err error
		if loop, err = time.ParseDuration(t); err != nil {
			respondWith(ctx, w, http.StatusBadRequest, t)
			return
		}
	}

	conn, err := xfer.Upgrade(w, r, nil)
	if err != nil {
		// log.Info("Upgrade:", err)
		return
	}
	defer conn.Close()

	ignoreCollapsed, ignoreConnections, ignoreMetadata, ignoreMetrics := false, false, false, false
	if r.Form.Get("ignore_collapsed") == "true" {
		ignoreCollapsed = true
	}
	if r.Form.Get(render.IgnoreConnections) == "true" {
		ignoreConnections = true
	}
	if r.Form.Get(render.IgnoreMetadata) == "true" {
		ignoreMetadata = true
	}
	if r.Form.Get(render.IgnoreMetrics) == "true" {
		ignoreMetrics = true
	}
	wc := connectionWebsocketState{
		rep:               rep,
		values:            r.Form,
		conn:              conn,
		startReportingAt:  deserializeTimestamp(r.Form.Get("timestamp")),
		channelOpenedAt:   time.Now(),
		topologyFilters:   make(map[string]detailed.NodeFilters),
		removedTopology:   make(map[string]struct{}),
		ignoreCollapsed:   ignoreCollapsed,
		ignoreConnections: ignoreConnections,
		ignoreMetadata:    ignoreMetadata,
		ignoreMetrics:     ignoreMetrics,
		censorCfg:         report.GetCensorConfigFromRequest(r),
	}
	quit := make(chan struct{})
	resetTimer := make(chan struct{}, 1)
	wait := make(chan struct{}, 1)
	rep.WaitOn(ctx, wait)
	defer rep.UnWait(ctx, wait)
	tick := time.Tick(loop)

	processWsInputMessage := func(message []byte) bool {
		var topologyFilters detailed.TopologyFilters
		if err := json.Unmarshal(message, &topologyFilters); err != nil {
			log.Error("err:", err)
			return false
		}

		fmt.Printf("processWS: %v\n", topologyFilters)

		wc.Lock()
		wc.inputReceived = true
		if len(topologyFilters.Add.Children) > 0 {
			uniqueID := topologyFilters.Add.TopologyId + ":" + topologyFilters.Add.NodeId
			wc.topologyFilters[uniqueID] = topologyFilters.Add
			wc.removedTopology = map[string]struct{}{}
		} else if len(topologyFilters.Remove.Children) > 0 {
			uniqueID := topologyFilters.Remove.TopologyId + ":" + topologyFilters.Remove.NodeId
			wc.removedTopology[topologyFilters.Remove.NodeId] = struct{}{}
			delete(wc.topologyFilters, uniqueID)
			// Delete the children also
			for uid, nodeFilter := range wc.topologyFilters {
				for parentTopologyId, parentNodeId := range nodeFilter.Parents {
					if parentTopologyId == topologyFilters.Remove.TopologyId && parentNodeId == topologyFilters.Remove.NodeId {
						delete(wc.topologyFilters, uid)
						if ignoreCollapsed == true {
							wc.removedTopology[nodeFilter.NodeId] = struct{}{}
						}
						break
					}
				}
			}
		} else {
			wc.Unlock()
			close(quit)
			return true
		}
		wc.Unlock()

		// reset the ticker so that we send the diff immediately
		tick = time.Tick(loop)
		resetTimer <- struct{}{}
		return false
	}

	go func(wc *connectionWebsocketState) {
		for {
			_, message, err := wc.conn.ReadMessage()
			if err != nil {
				if !xfer.IsExpectedWSCloseError(err) {
					log.Error("err:", err)
				}
				close(quit)
				break
			}
			toBreak := processWsInputMessage(message)
			if toBreak {
				break
			}
		}
	}(&wc)

	for {
		if err := wc.update(ctx); err != nil {
			log.Errorf("%v", err)
			return
		}

		select {
		case <-wait:
		case <-tick:
		case <-resetTimer:
		case <-quit:
			return
		}
	}
}

type connectionWebsocketState struct {
	rep                 Reporter
	values              url.Values
	conn                xfer.Websocket
	topologyFilters     map[string]detailed.NodeFilters
	removedTopology     map[string]struct{}
	inputReceived       bool
	previousTopo        detailed.NodeSummaries
	previousConnections detailed.TopologyConnectionSummaries
	censorCfg           report.CensorConfig
	ignoreCollapsed     bool
	ignoreConnections   bool
	ignoreMetadata      bool
	ignoreMetrics       bool
	startReportingAt    time.Time
	reportTimestamp     time.Time
	channelOpenedAt     time.Time
	sync.RWMutex
}

func contains(s []string, str string) bool {
	for _, v := range s {
		if v == str {
			return true
		}
	}
	return false
}

func graphToSummaries(graph RenderedGraph, region_filter []string, host_filter []string) (detailed.NodeSummaries, detailed.TopologyConnectionSummaries) {
	nodes := detailed.NodeSummaries{}
	edges := detailed.TopologyConnectionSummaries{}

	for _, conn := range graph.Connections {
		left_splits := strings.Split(conn.Source, ";")
		right_splits := strings.Split(conn.Target, ";")
		source := ""
		if contains(host_filter, left_splits[2]) {
			source = left_splits[2] + ";" + left_splits[3]
		} else if contains(region_filter, left_splits[1]) {
			source = left_splits[2] + ";<host>"
		} else {
			source = left_splits[1] + ";<cloud_region>"
		}

		target := ""
		if contains(host_filter, right_splits[2]) {
			target = right_splits[2] + ";" + right_splits[3]
		} else if contains(region_filter, right_splits[1]) {
			target = right_splits[2] + ";<host>"
		} else {
			target = right_splits[1] + ";<cloud_region>"
		}

		if source == "internet;<cloud_region>" {
			source = "in-the-internet"
		}
		if target == "internet;<cloud_region>" {
			target = "out-the-internet"
		}
		fmt.Printf("%v -> %v\n", source, target)
		edges[source+target] = detailed.ConnectionSummary{Source: source, Target: target}
	}

	nodes["in-the-internet"] = detailed.NodeSummary{
		ImmediateParentID: "",
		BasicNodeSummary: detailed.BasicNodeSummary{
			ID:     "in-the-internet",
			Rank:   "in-theinternet",
			Label:  "The Internet",
			Shape:  "cloud",
			Pseudo: true,
		},
	}

	nodes["out-the-internet"] = detailed.NodeSummary{
		ImmediateParentID: "",
		BasicNodeSummary: detailed.BasicNodeSummary{
			ID:     "out-the-internet",
			Rank:   "out-theinternet",
			Label:  "The Internet",
			Shape:  "cloud",
			Pseudo: true,
		},
	}

	for _, cp := range graph.Providers {
		nodes[cp] = detailed.NodeSummary{
			ImmediateParentID: "",
			BasicNodeSummary: detailed.BasicNodeSummary{
				ID:    cp + ";<cloud_provider>",
				Rank:  cp,
				Label: cp,
				Shape: cp,
			},
			Metadata: []report.MetadataRow{
				{
					ID:       "name",
					Label:    "Name",
					Value:    cp,
					Priority: 1,
				},
				{
					ID:       "label",
					Label:    "Label",
					Value:    cp,
					Priority: 2,
				},
			},
			Type: "cloud_provider",
		}
	}

	for cp, crs := range graph.Regions {
		for _, cr := range crs {
			nodes[cr] = detailed.NodeSummary{
				ImmediateParentID: cp + ";<cloud_provider>",
				BasicNodeSummary: detailed.BasicNodeSummary{
					ID:    cr + ";<cloud_region>",
					Rank:  cr,
					Label: cr,
					Shape: report.Circle,
				},
				Metadata: []report.MetadataRow{
					{
						ID:       "name",
						Label:    "Name",
						Value:    cr,
						Priority: 1,
					},
					{
						ID:       "label",
						Label:    "Label",
						Value:    cr,
						Priority: 2,
					},
				},
				Type: "cloud_region",
			}
		}
	}

	for _, n := range graph.Hosts {
		for cr, hosts := range n {
			for _, host := range hosts {
				nodes[host] = detailed.NodeSummary{
					ImmediateParentID: cr + ";<cloud_region>",
					BasicNodeSummary: detailed.BasicNodeSummary{
						ID:    host + ";<host>",
						Rank:  host,
						Label: host,
						Shape: report.Host,
					},
					Metrics: []report.MetricRow{
						{ID: hst.CPUUsage, Metric: &report.Metric{}, Label: "CPU", Value: 0.0, Format: report.PercentFormat, Priority: 1},
						{ID: hst.MemoryUsage, Metric: &report.Metric{}, Label: "Memory", Value: 0.0, Format: report.FilesizeFormat, Priority: 2},
						{ID: hst.Load1, Metric: &report.Metric{}, Label: "Load (1m)", Value: 0.0, Format: report.DefaultFormat, Group: "load", Priority: 11},
					},
					Metadata: []report.MetadataRow{
						{
							ID:       "name",
							Label:    "Name",
							Value:    host,
							Priority: 1,
						},
						{
							ID:       "label",
							Label:    "Label",
							Value:    host,
							Priority: 2,
						},
						{ID: report.KernelVersion, Label: "Kernel version", Value: report.FromLatest, Priority: 1},
						{ID: report.Uptime, Label: "Uptime", Value: report.FromLatest, Priority: 2},
						{ID: report.HostName, Label: "Hostname", Value: host, Priority: 11},
						{ID: report.OS, Label: "OS", Value: report.FromLatest, Priority: 12},
						{ID: hst.LocalNetworks, Label: "Local networks", Value: report.FromSets, Priority: 13},
						{ID: hst.InterfaceNames, Label: "Interface Names", Value: report.FromLatest, Priority: 15},
						//PublicIpAddr:   {ID: PublicIpAddr, Label: "Public IP Address", Value: report.FromLatest, Priority: 16},
						{ID: hst.ProbeId, Label: "Probe ID", Value: report.FromLatest, Priority: 17},
						//ScopeVersion:  {ID: ScopeVersion, Label: "Scope version", Value: report.FromLatest, Priority: 14},
						{ID: hst.InterfaceIPs, Label: "All Interface IP's", Value: report.FromLatest, Priority: 21},
						{ID: report.CloudProvider, Label: "Cloud Provider", Value: report.FromLatest, Priority: 22},
						{ID: report.CloudRegion, Label: "Cloud Region", Value: report.FromLatest, Priority: 23},
						{ID: hst.CloudMetadata, Label: "Cloud Metadata", Value: report.FromLatest, Priority: 24},
						{ID: report.KubernetesClusterId, Label: "Kubernetes Cluster Id", Value: report.FromLatest, Priority: 25},
						{ID: report.KubernetesClusterName, Label: "Kubernetes Cluster Name", Value: report.FromLatest, Priority: 26},
						{ID: hst.UserDfndTags, Label: "User Defined Tags", Value: report.FromLatest, Priority: 27},
						{ID: hst.AgentVersion, Label: "Sensor Version", Value: report.FromLatest, Priority: 28},
						{ID: hst.IsUiVm, Label: "UI vm", Value: "yes", Priority: 29},
						{ID: hst.AgentRunning, Label: "Sensor", Value: "yes", Priority: 33},
					},
					Type: "host",
				}
			}
		}
	}

	for h, n := range graph.Processes {
		for _, id := range n {
			nodes[id] = detailed.NodeSummary{
				ImmediateParentID: h + ";<host>",
				BasicNodeSummary: detailed.BasicNodeSummary{
					ID:    id,
					Label: id,
					Shape: report.Process,
				},
				Metadata: []report.MetadataRow{
					{
						ID:       "name",
						Label:    "Name",
						Value:    id,
						Priority: 1,
					},
					{
						ID:       "label",
						Label:    "Label",
						Value:    id,
						Priority: 2,
					},
				},
				Type: "process",
			}
		}
	}

	for h, n := range graph.Pods {
		for _, id := range n {
			nodes[id] = detailed.NodeSummary{
				ImmediateParentID: h + ";<host>",
				BasicNodeSummary: detailed.BasicNodeSummary{
					ID:    id,
					Label: id,
					Shape: report.Pod,
				},
				Metadata: []report.MetadataRow{
					{
						ID:       "name",
						Label:    "Name",
						Value:    id,
						Priority: 1,
					},
					{
						ID:       "label",
						Label:    "Label",
						Value:    id,
						Priority: 2,
					},
				},
				Type: "pod",
			}
		}
	}

	for h, n := range graph.Containers {
		for _, id := range n {
			nodes[id] = detailed.NodeSummary{
				ImmediateParentID: h + ";<host>",
				BasicNodeSummary: detailed.BasicNodeSummary{
					ID:    id,
					Label: id,
					Shape: report.Container,
				},
				Type: "container",
			}
		}
	}

	return nodes, edges

}

func (wc *connectionWebsocketState) update(ctx context.Context) error {
	wc.RLock()
	topologyFilters := wc.topologyFilters
	inputReceived := wc.inputReceived
	ignoreConnections := wc.ignoreConnections
	//ignoreMetadata := wc.ignoreMetadata
	//ignoreMetrics := wc.ignoreMetrics
	removedTopology := make(map[string]struct{}, len(wc.removedTopology))
	for k, v := range wc.removedTopology {
		removedTopology[k] = v
	}
	wc.removedTopology = map[string]struct{}{}
	wc.RUnlock()
	if !inputReceived {
		return nil
	}
	span := ot.StartSpan("websocket.Render", ot.Tag{"topology_connection", ""})
	defer span.Finish()
	ctx = ot.ContextWithSpan(ctx, span)

	//ctx = context.WithValue(ctx, render.IgnoreConnections, ignoreConnections)
	//ctx = context.WithValue(ctx, render.IgnoreMetadata, ignoreMetadata)
	//ctx = context.WithValue(ctx, render.IgnoreMetrics, ignoreMetrics)

	// We measure how much time has passed since the channel was opened
	// and add it to the initial report timestamp to get the timestamp
	// of the snapshot we want to report right now.
	// NOTE: Multiplying `timestampDelta` by a constant factor here
	// would have an effect of fast-forward, which is something we
	// might be interested in implementing in the future.
	timestampDelta := time.Since(wc.channelOpenedAt)
	reportTimestamp := wc.startReportingAt.Add(timestampDelta)
	span.LogFields(otlog.String("opened-at", wc.channelOpenedAt.String()),
		otlog.String("timestamp", reportTimestamp.String()))

	//start := time.Now()
	//re, err := wc.rep.Report(ctx, reportTimestamp)
	//fmt.Printf("Report gen: %v\n", time.Since(start))
	//if err != nil {
	//	return errors.Wrap(err, "Error generating report")
	//}
	//if ignoreConnections == true {
	//	re.Endpoint = report.MakeTopology()
	//}

	//newTopo := make(detailed.NodeSummaries)
	//leafChildTopologyID := cloudProvidersID
	//var nodeSummaries detailed.NodeSummaries

	//for _, nodeFilter := range topologyFilters {
	//	for _, c := range nodeFilter.Children {
	//		if topologyIdOrder[c.TopologyID] >= topologyIdOrder[leafChildTopologyID] {
	//			leafChildTopologyID = c.TopologyID
	//		}
	//	}
	//}

	//var nodeIdVulnerabilityStatusMap, nodeIdComplianceStatusMap, nodeSeverityMap, nodeIdSecretStatusMap map[string]string
	//if ignoreMetadata == false {
	//	nodeIdVulnerabilityStatusMap, _, nodeIdComplianceStatusMap, _, nodeSeverityMap, nodeIdSecretStatusMap, _ = nStatus.getNodeStatus()
	//}
	//childrenCount := make(map[string]map[string]int)

	c, r, h := []string{}, []string{}, []string{}
	for _, nodeFilter := range topologyFilters {
		id := strings.Split(nodeFilter.NodeId, ";")[0]
		if nodeFilter.TopologyId == cloudProvidersID {
			c = append(c, id)
		} else if nodeFilter.TopologyId == cloudRegionsID {
			r = append(r, id)
		} else if nodeFilter.TopologyId == hostsID {
			h = append(h, id)
		}
	}
	fmt.Printf("%v\n%v\n%v\n", c, r, h)
	ChangeFilters(c, r, h)

	//connected_processes := map[string][]string{}
	s, err := wc.rep.AdminSummary(nil, time.Now())
	if err != nil {
		logrus.Errorf("Admin sum: %v", err)
	}
	var graph RenderedGraph
	json.Unmarshal([]byte(s), &graph)

	//simpleFilters := map[string]struct{}{}
	//for _, nodeFilter := range topologyFilters {
	//	simpleFilters[nodeFilter.NodeId] = struct{}{}
	//}
	//		if _, ok2 := simpleFilters[rightHost]; ok2 {
	//			newConnections[leftProcess+rightProcess] = detailed.ConnectionSummary{Source: leftProcess, Target: rightProcess}
	//		} else {
	//			newConnections[leftProcess+rightHost] = detailed.ConnectionSummary{Source: leftProcess, Target: rightHost}
	//		}
	//	} else {
	//		newConnections[leftHost+rightHost] = detailed.ConnectionSummary{Source: leftHost, Target: rightHost}
	//	}
	//}
	//fmt.Printf("Connections gen: %v\n", time.Since(start))
	//fmt.Printf("connections processes: %v\n", len(connected_processes))

	//for i, proc := range re.Process.Nodes {
	//	if vals, ok := connected_processes[proc.ID]; ok {
	//		proc.Adjacency = report.MakeIDList(vals...)
	//		re.Process.Nodes[i] = proc
	//	}
	//}

	//for _, nodeFilter := range topologyFilters {
	//	nodeChildrenCount := make(map[string]int)
	//	for _, c := range nodeFilter.Children {
	//		adjacency := true
	//		if c.TopologyID == cloudProvidersID {
	//			adjacency = true
	//		}
	//		filtersMap := make(map[string][]string, len(wc.values)+1+len(c.Filters))
	//		for k, v := range wc.values {
	//			filtersMap[k] = v
	//		}
	//		if nodeFilter.NodeId != "" {
	//			filtersMap[nodeFilter.TopologyId] = []string{nodeFilter.NodeId}
	//		}
	//		for k, v := range c.Filters {
	//			filtersMap[k] = []string{v}
	//		}
	//		renderer, filter, err := topologyRegistry.RendererForTopology(c.TopologyID, filtersMap, re)
	//		if err != nil {
	//			continue
	//		}

	//		//if c.TopologyID == "processes" {
	//		//	fmt.Printf("Doing PROCESS RENDER====%v %v %v\n", wc.values, filtersMap, c.Filters)
	//		//}
	//		rend := render.Render(ctx, re, renderer, filter)
	//		//if c.TopologyID == "processes" {
	//		//	fmt.Printf("Done PROCESS RENDER====%v, %v\n", len(rend.Nodes), rend.Filtered)
	//		//}

	//		//for k, node := range rend.Nodes {
	//		//	fmt.Printf("after2 -> %v adjacency: %v\n", k, len(node.Adjacency))
	//		//}

	//		summaries := detailed.Summaries(
	//			ctx,
	//			RenderContextForReporter(wc.rep, re),
	//			rend.Nodes,
	//			adjacency,
	//		)

	//		nodeSummaries = detailed.CensorNodeSummaries(
	//			summaries,
	//			wc.censorCfg,
	//		)
	//		var vulnerabilityScanStatus, complianceScanStatus, nodeSeverity, secretScanStatus string
	//		var ok bool
	//		counter := 0

	//		for k, v := range nodeSummaries {
	//			if adjacency == false && v.Pseudo == true {
	//				continue
	//			}
	//			if ignoreMetadata == false {
	//				vulnerabilityScanStatus = ""
	//				complianceScanStatus = ""
	//				nodeSeverity = ""
	//				secretScanStatus = ""
	//				if c.TopologyID == hostsID && v.Pseudo == false {
	//					vulnerabilityScanStatus, ok = nodeIdVulnerabilityStatusMap[v.Label]
	//					if !ok {
	//						vulnerabilityScanStatus = scanStatusNeverScanned
	//					}
	//					secretScanStatus, ok = nodeIdSecretStatusMap[v.Label]
	//					if !ok {
	//						secretScanStatus = scanStatusNeverScanned
	//					}
	//					nodeSeverity, _ = nodeSeverityMap[v.Label]
	//				} else if (c.TopologyID == containersID || c.TopologyID == containersByImageID) && v.Pseudo == false {
	//					vulnerabilityScanStatus, ok = nodeIdVulnerabilityStatusMap[v.Image]
	//					if !ok {
	//						vulnerabilityScanStatus = scanStatusNeverScanned
	//					}
	//					if c.TopologyID == containersID {
	//						secretScanStatus, ok = nodeIdSecretStatusMap[strings.Split(v.ID, ";")[0]]
	//					} else {
	//						secretScanStatus, ok = nodeIdSecretStatusMap[v.Label]
	//					}
	//					if !ok {
	//						secretScanStatus = scanStatusNeverScanned
	//					}
	//				}
	//				if c.TopologyID == hostsID || c.TopologyID == containersID || c.TopologyID == containersByImageID {
	//					complianceScanStatus, ok = nodeIdComplianceStatusMap[v.ID]
	//					if !ok {
	//						complianceScanStatus = scanStatusNeverScanned
	//					}
	//					v.Metadata = append(v.Metadata, []report.MetadataRow{
	//						{ID: vulnerabilityScanStatusKey, Label: vulnerabilityScanStatusLabel, Value: vulnerabilityScanStatus, Priority: 50.0},
	//						{ID: complianceScanStatusKey, Label: complianceScanStatusLabel, Value: complianceScanStatus, Priority: 51.0},
	//						{ID: nodeSeverityKey, Label: nodeSeverityLabel, Value: nodeSeverity, Priority: 52.0},
	//						{ID: secretScanStatusKey, Label: secretScanStatusLabel, Value: secretScanStatus, Priority: 50.0},
	//					}...)
	//				}
	//			}
	//			v.ImmediateParentID = nodeFilter.NodeId
	//			filterOut := false
	//			if c.TopologyID == hostsID {
	//				filterOut = filterOnVulnStatus(vulnerabilityScanStatus, c.Filters[vulnerabilityScanStatusKey])
	//				filterOut = filterOut || filterOnComplianceStatus(complianceScanStatus, c.Filters[complianceScanStatusKey])
	//			} else if c.TopologyID == containersID {
	//				filterOut = filterOnVulnStatus(vulnerabilityScanStatus, c.Filters[vulnerabilityScanStatusKey])
	//			}
	//			if !filterOut {
	//				newTopo[k] = v
	//				counter += 1
	//			}
	//		}
	//		nodeChildrenCount[c.TopologyID] = counter
	//	}
	//	childrenCount[nodeFilter.NodeId] = nodeChildrenCount
	//}

	//fmt.Printf("Render gen: %v\n", time.Since(start))

	//newConnections := make(detailed.TopologyConnectionSummaries)
	//if ignoreConnections == false {
	//	// Once we expand cloud provider, we have k8s clusters and regions at the same level, so we will not get correct edges
	//	if leafChildTopologyID != cloudProvidersID {
	//		leafChildTopologyID = processesID
	//	}
	//	renderer, filter, err := topologyRegistry.RendererForTopology(leafChildTopologyID, map[string][]string{}, re)
	//	if err == nil {

	//		nodes := render.Render(ctx, re, renderer, filter).Nodes
	//		newConnections = detailed.GetTopologyConnectionSummaries(
	//			ctx,
	//			newTopo,
	//			nodes,
	//		)
	//	}
	//}
	//fmt.Printf("connections in-mem: %v\n", len(newConnections))

	//if len(removedTopology) > 0 {
	//	removedNodes := make(map[string]struct{})
	//	for nodeID, node := range wc.previousTopo {
	//		if _, ok := removedTopology[node.ImmediateParentID]; ok {
	//			delete(wc.previousTopo, nodeID)
	//			removedNodes[nodeID] = struct{}{}
	//		}
	//	}
	//	for k, v := range wc.previousConnections {
	//		if _, ok := removedNodes[v.Source]; ok {
	//			delete(wc.previousConnections, k)
	//			continue
	//		}
	//		if _, ok := removedNodes[v.Target]; ok {
	//			delete(wc.previousConnections, k)
	//		}
	//	}
	//}

	newTopo, newConnections := graphToSummaries(graph, r, h)

	topologyConnectionDiff := detailed.TopologyConnectionDiff{
		Nodes: detailed.TopoDiff(wc.previousTopo, newTopo),
		//Metadata: detailed.TopologyConnectionDiffMetadata{
		//	ChildrenCount: childrenCount,
		//},
	}
	if len(newConnections) > 1000 {
		//wc.Lock()
		//wc.ignoreConnections = true
		//wc.Unlock()
		//ignoreConnections = true
		//newConnections = detailed.TopologyConnectionSummaries{}
		topologyConnectionDiff.Metadata.RecommendedView = "table"
	}
	wc.RLock()
	topologyConnectionDiff.Edges = detailed.GetConnectionDiff(wc.previousConnections, newConnections)
	wc.RUnlock()
	if len(topologyConnectionDiff.Nodes.Add) > 300 {
		topologyConnectionDiff.Metadata.RecommendedView = "table"
	}
	if ignoreConnections == true {
		topologyConnectionDiff.Metadata.Connections = "disabled"
	}
	topologyConnectionDiff.Reset = topologyConnectionDiff.Nodes.Reset

	wc.Lock()
	wc.previousTopo = newTopo
	wc.previousConnections = newConnections
	wc.Unlock()

	if err := wc.conn.WriteJSON(topologyConnectionDiff); err != nil {
		if !xfer.IsExpectedWSCloseError(err) {
			return errors.Wrap(err, "cannot serialize topology diff")
		}
	}

	//fmt.Printf("Diff gen: %v\n", time.Since(start))
	return nil
}

func filterOnVulnStatus(nodeValue string, filterValue string) bool {
	filterOut := false
	if filterValue != "" {
		vals := strings.Split(filterValue, ",")
		foundInFilterVal := false
		for _, filterValue := range vals {
			if filterValue == nodeValue {
				foundInFilterVal = true
			}
		}
		filterOut = !foundInFilterVal
	}
	return filterOut
}

func filterOnComplianceStatus(nodeValue string, filterValue string) bool {
	filterOut := false
	if filterValue != "" {
		vals := strings.Split(filterValue, ",")
		foundInFilterVal := false
		for _, filterValue := range vals {
			if strings.Contains(nodeValue, filterValue) {
				foundInFilterVal = true
			}
		}
		filterOut = !foundInFilterVal
	}
	return filterOut
}

package app

import (
	"context"
	"encoding/json"
	ot "github.com/opentracing/opentracing-go"
	otlog "github.com/opentracing/opentracing-go/log"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
	"github.com/weaveworks/scope/common/xfer"
	"github.com/weaveworks/scope/render"
	"github.com/weaveworks/scope/render/detailed"
	"github.com/weaveworks/scope/report"
	"net/http"
	"net/url"
	"reflect"
	"strings"
	"sync"
	"time"
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

		wc.Lock()
		wc.inputReceived = true
		if !reflect.DeepEqual(topologyFilters.Add, detailed.NodeFilters{}) {
			uniqueID := topologyFilters.Add.TopologyId + ":" + topologyFilters.Add.NodeId
			wc.topologyFilters[uniqueID] = topologyFilters.Add
			wc.removedTopology = map[string]struct{}{}
		} else if !reflect.DeepEqual(topologyFilters.Remove, detailed.NodeFilters{}) {
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

func (wc *connectionWebsocketState) update(ctx context.Context) error {
	wc.RLock()
	topologyFilters := wc.topologyFilters
	inputReceived := wc.inputReceived
	ignoreConnections := wc.ignoreConnections
	ignoreMetadata := wc.ignoreMetadata
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
	re, err := wc.rep.Report(ctx, reportTimestamp)
	if err != nil {
		return errors.Wrap(err, "Error generating report")
	}
	if ignoreConnections == true {
		re.Endpoint = report.MakeTopology()
	}

	newTopo := make(detailed.NodeSummaries)
	leafChildTopologyID := cloudProvidersID
	var nodeSummaries detailed.NodeSummaries

	for _, nodeFilter := range topologyFilters {
		for _, c := range nodeFilter.Children {
			if topologyIdOrder[c.TopologyID] >= topologyIdOrder[leafChildTopologyID] {
				leafChildTopologyID = c.TopologyID
			}
		}
	}

	var nodeIdVulnerabilityStatusMap, nodeIdComplianceStatusMap, nodeSeverityMap, nodeIdSecretStatusMap map[string]string
	if ignoreMetadata == false {
		nodeIdVulnerabilityStatusMap, _, nodeIdComplianceStatusMap, _, nodeSeverityMap, nodeIdSecretStatusMap, _ = nStatus.getNodeStatus()
	}
	childrenCount := make(map[string]map[string]int)

	for _, nodeFilter := range topologyFilters {
		nodeChildrenCount := make(map[string]int)
		for _, c := range nodeFilter.Children {
			adjacency := false
			if c.TopologyID == cloudProvidersID {
				adjacency = true
			}
			filtersMap := make(map[string][]string, len(wc.values)+1+len(c.Filters))
			for k, v := range wc.values {
				filtersMap[k] = v
			}
			if nodeFilter.NodeId != "" {
				filtersMap[nodeFilter.TopologyId] = []string{nodeFilter.NodeId}
			}
			for k, v := range c.Filters {
				filtersMap[k] = []string{v}
			}
			renderer, filter, err := topologyRegistry.RendererForTopology(c.TopologyID, filtersMap, re)
			if err != nil {
				continue
			}
			nodeSummaries = detailed.CensorNodeSummaries(
				detailed.Summaries(
					ctx,
					RenderContextForReporter(wc.rep, re),
					render.Render(ctx, re, renderer, filter).Nodes,
					adjacency,
				),
				wc.censorCfg,
			)
			var vulnerabilityScanStatus, complianceScanStatus, nodeSeverity, secretScanStatus string
			var ok bool
			counter := 0
			for k, v := range nodeSummaries {
				if adjacency == false && v.Pseudo == true {
					continue
				}
				if ignoreMetadata == false {
					vulnerabilityScanStatus = ""
					complianceScanStatus = ""
					nodeSeverity = ""
					secretScanStatus = ""
					if c.TopologyID == hostsID && v.Pseudo == false {
						vulnerabilityScanStatus, ok = nodeIdVulnerabilityStatusMap[v.Label]
						if !ok {
							vulnerabilityScanStatus = scanStatusNeverScanned
						}
						secretScanStatus, ok = nodeIdSecretStatusMap[v.Label]
						if !ok {
							secretScanStatus = scanStatusNeverScanned
						}
						nodeSeverity, _ = nodeSeverityMap[v.Label]
					} else if (c.TopologyID == containersID || c.TopologyID == containersByImageID) && v.Pseudo == false {
						vulnerabilityScanStatus, ok = nodeIdVulnerabilityStatusMap[v.Image]
						if !ok {
							vulnerabilityScanStatus = scanStatusNeverScanned
						}
						if c.TopologyID == containersID {
							secretScanStatus, ok = nodeIdSecretStatusMap[strings.Split(v.ID, ";")[0]]
						} else {
							secretScanStatus, ok = nodeIdSecretStatusMap[v.Label]
						}
						if !ok {
							secretScanStatus = scanStatusNeverScanned
						}
					}
					if c.TopologyID == hostsID || c.TopologyID == containersID || c.TopologyID == containersByImageID {
						complianceScanStatus, ok = nodeIdComplianceStatusMap[v.ID]
						if !ok {
							complianceScanStatus = scanStatusNeverScanned
						}
						v.Metadata = append(v.Metadata, []report.MetadataRow{
							{ID: vulnerabilityScanStatusKey, Label: vulnerabilityScanStatusLabel, Value: vulnerabilityScanStatus, Priority: 50.0},
							{ID: complianceScanStatusKey, Label: complianceScanStatusLabel, Value: complianceScanStatus, Priority: 51.0},
							{ID: nodeSeverityKey, Label: nodeSeverityLabel, Value: nodeSeverity, Priority: 52.0},
							{ID: secretScanStatusKey, Label: secretScanStatusLabel, Value: secretScanStatus, Priority: 50.0},
						}...)
					}
				}
				v.ImmediateParentID = nodeFilter.NodeId
				filterOut := false
				if c.TopologyID == hostsID {
					filterOut = filterOnVulnStatus(vulnerabilityScanStatus, c.Filters[vulnerabilityScanStatusKey])
					filterOut = filterOut || filterOnComplianceStatus(complianceScanStatus, c.Filters[complianceScanStatusKey])
				} else if c.TopologyID == containersID {
					filterOut = filterOnVulnStatus(vulnerabilityScanStatus, c.Filters[vulnerabilityScanStatusKey])
				}
				if !filterOut {
					newTopo[k] = v
					counter += 1
				}
			}
			nodeChildrenCount[c.TopologyID] = counter
		}
		childrenCount[nodeFilter.NodeId] = nodeChildrenCount
	}

	newConnections := make(detailed.TopologyConnectionSummaries)
	if ignoreConnections == false {
		// Once we expand cloud provider, we have k8s clusters and regions at the same level, so we will not get correct edges
		if leafChildTopologyID != cloudProvidersID {
			leafChildTopologyID = processesID
		}
		renderer, filter, err := topologyRegistry.RendererForTopology(leafChildTopologyID, map[string][]string{}, re)
		if err == nil {
			newConnections = detailed.GetTopologyConnectionSummaries(
				ctx,
				newTopo,
				render.Render(ctx, re, renderer, filter).Nodes,
			)
		}
	}

	if len(removedTopology) > 0 {
		removedNodes := make(map[string]struct{})
		for nodeID, node := range wc.previousTopo {
			if _, ok := removedTopology[node.ImmediateParentID]; ok {
				delete(wc.previousTopo, nodeID)
				removedNodes[nodeID] = struct{}{}
			}
		}
		for k, v := range wc.previousConnections {
			if _, ok := removedNodes[v.Source]; ok {
				delete(wc.previousConnections, k)
				continue
			}
			if _, ok := removedNodes[v.Target]; ok {
				delete(wc.previousConnections, k)
			}
		}
	}

	topologyConnectionDiff := detailed.TopologyConnectionDiff{
		Nodes: detailed.TopoDiff(wc.previousTopo, newTopo),
		Metadata: detailed.TopologyConnectionDiffMetadata{
			ChildrenCount: childrenCount,
		},
	}
	if len(newConnections) > 1000 {
		wc.Lock()
		wc.ignoreConnections = true
		wc.Unlock()
		ignoreConnections = true
		newConnections = detailed.TopologyConnectionSummaries{}
		topologyConnectionDiff.Metadata.RecommendedView = "table"
	}
	topologyConnectionDiff.Edges = detailed.GetConnectionDiff(wc.previousConnections, newConnections)
	if len(topologyConnectionDiff.Nodes.Add) > 300 {
		topologyConnectionDiff.Metadata.RecommendedView = "table"
	}
	if ignoreConnections == true {
		topologyConnectionDiff.Metadata.Connections = "disabled"
	}
	topologyConnectionDiff.Reset = topologyConnectionDiff.Nodes.Reset

	wc.previousTopo = newTopo
	wc.previousConnections = newConnections

	if err := wc.conn.WriteJSON(topologyConnectionDiff); err != nil {
		if !xfer.IsExpectedWSCloseError(err) {
			return errors.Wrap(err, "cannot serialize topology diff")
		}
	}
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
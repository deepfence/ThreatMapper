package app

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"context"

	"github.com/NYTimes/gziphandler"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"

	"github.com/weaveworks/scope/common/hostname"
	"github.com/weaveworks/scope/common/xfer"
	"github.com/weaveworks/scope/report"
)

var (
	// Version - set at buildtime.
	Version = "dev"

	// UniqueID - set at runtime.
	UniqueID = "0"
)

// contextKey is a wrapper type for use in context.WithValue() to satisfy golint
// https://github.com/golang/go/issues/17293
// https://github.com/golang/lint/pull/245
type contextKey string

// RequestCtxKey is key used for request entry in context
const RequestCtxKey contextKey = contextKey("request")

// CtxHandlerFunc is a http.HandlerFunc, with added contexts
type CtxHandlerFunc func(context.Context, http.ResponseWriter, *http.Request)

func requestContextDecorator(f CtxHandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), RequestCtxKey, r)
		f(ctx, w, r)
	}
}

// URLMatcher uses request.RequestURI (the raw, unparsed request) to attempt
// to match pattern.  It does this as go's URL.Parse method is broken, and
// mistakenly unescapes the Path before parsing it.  This breaks %2F (encoded
// forward slashes) in the paths.
func URLMatcher(pattern string) mux.MatcherFunc {
	return func(r *http.Request, rm *mux.RouteMatch) bool {
		vars, match := matchURL(r, pattern)
		if match {
			rm.Vars = vars
		}
		return match
	}
}

func matchURL(r *http.Request, pattern string) (map[string]string, bool) {
	matchParts := strings.Split(pattern, "/")
	path := strings.SplitN(r.RequestURI, "?", 2)[0]
	parts := strings.Split(path, "/")
	if len(parts) != len(matchParts) {
		return nil, false
	}

	vars := map[string]string{}
	for i, part := range parts {
		unescaped, err := url.QueryUnescape(part)
		if err != nil {
			return nil, false
		}
		match := matchParts[i]
		if strings.HasPrefix(match, "{") && strings.HasSuffix(match, "}") {
			vars[strings.Trim(match, "{}")] = unescaped
		} else if matchParts[i] != unescaped {
			return nil, false
		}
	}
	return vars, true
}

func gzipHandler(h http.HandlerFunc) http.Handler {
	return gziphandler.GzipHandler(h)
}

// RegisterTopologyRoutes registers the various topology routes with a http mux.
func RegisterTopologyRoutes(router *mux.Router, r Reporter, capabilities map[string]bool) {
	get := router.Methods("GET").Subrouter()
	get.Handle("/topology-api",
		gzipHandler(requestContextDecorator(apiHandler(r, capabilities))))
	get.Handle("/topology-api/topology",
		gzipHandler(requestContextDecorator(topologyRegistry.makeTopologyList(r))))
	get.Handle("/topology-api/topology/{topology}",
		gzipHandler(requestContextDecorator(topologyRegistry.captureRenderer(r, handleTopology)))).
		Name("api_topology_topology")
	get.Handle("/topology-api/connection/{topology}",
		gzipHandler(requestContextDecorator(topologyRegistry.captureRenderer(r, handleConnections)))).
		Name("api_topology_connections")
	get.Handle("/topology-api/topology-connection-ws",
		requestContextDecorator(captureReporter(r, handleConnectionsWebsocket))). // NB not gzip!
		Name("api_topology_connections_ws")
	get.Handle("/topology-api/topology/{topology}/ws",
		requestContextDecorator(captureReporter(r, handleWebsocket))). // NB not gzip!
		Name("api_topology_topology_ws")
	get.MatcherFunc(URLMatcher("/topology-api/topology/{topology}/{id}")).Handler(
		gzipHandler(requestContextDecorator(topologyRegistry.captureRenderer(r, handleNode)))).
		Name("api_topology_topology_id")
	get.Handle("/topology-api/report",
		gzipHandler(requestContextDecorator(makeRawReportHandler(r))))
	get.Handle("/topology-api/probes",
		gzipHandler(requestContextDecorator(makeProbeHandler(r))))
}

// RegisterReportPostHandler registers the handler for report submission
func RegisterReportPostHandler(a Adder, router *mux.Router, r Reporter) {
	post := router.Methods("POST").Subrouter()
	post.Handle("/topology-api/topology-graph",
		requestContextDecorator(captureReporter(r, handleTopologyGraph))).
		Name("api_topology_graph")
	post.HandleFunc("/topology-api/report", requestContextDecorator(func(ctx context.Context, w http.ResponseWriter, r *http.Request) {
		var (
			buf    = &bytes.Buffer{}
			reader = io.TeeReader(r.Body, buf)
		)

		gzipped := strings.Contains(r.Header.Get("Content-Encoding"), "gzip")
		if !gzipped {
			reader = io.TeeReader(r.Body, gzip.NewWriter(buf))
		}

		contentType := r.Header.Get("Content-Type")
		var isMsgpack int
		switch {
		case strings.HasPrefix(contentType, "application/msgpack"):
			isMsgpack = 1
		case strings.HasPrefix(contentType, "application/json"):
			isMsgpack = 0
		case strings.HasPrefix(contentType, "application/binc"):
			isMsgpack = 2
		default:
			respondWith(ctx, w, http.StatusBadRequest, fmt.Errorf("Unsupported Content-Type: %v", contentType))
			return
		}

		rpt, err := report.MakeFromBinary(ctx, reader, gzipped, isMsgpack)
		if err != nil {
			respondWith(ctx, w, http.StatusBadRequest, err)
			return
		}

		// a.Add(..., buf) assumes buf is gzip'd msgpack
		//if !isMsgpack {
		//	buf, _ = rpt.WriteBinary()
		//}

		//if err := a.Add(ctx, *rpt, buf.Bytes()); err != nil {
		var unusedParam []byte
		//for i := 0; i < 2500; i++ {
		//	rpts := rpt.Copy()
		//	for k, n := range rpts.Host.Nodes {
		//		n.ID = fmt.Sprintf("%v%v", i, n.ID)
		//		n.Latest = n.Latest.Set("host_name", time.Now(), n.ID)
		//		n.Latest = n.Latest.Set("host_node_id", time.Now(), n.ID)
		//		n.Latest = n.Latest.Set("probeId", time.Now(), n.ID)
		//		n.Latest = n.Latest.Set("control_probe_id", time.Now(), n.ID)
		//		rpts.Host.Nodes[k] = n
		//	}

		//	for k, n := range rpts.Process.Nodes {
		//		n.ID = fmt.Sprintf("%v%v", i, n.ID)
		//		rpts.Process.Nodes[k] = n
		//	}

		//	for k, n := range rpts.Endpoint.Nodes {
		//		n.ID = fmt.Sprintf("%v%v", i, n.ID)
		//		host,_ := n.Latest.Lookup("host_node_id")
		//		n.Latest = n.Latest.Set("host_node_id", time.Now(), fmt.Sprintf("%v%v", i, host))
		//		rpts.Endpoint.Nodes[k] = n
		//	}

		//	for k, n := range rpts.Container.Nodes {
		//		n.ID = fmt.Sprintf("%v%v", i, n.ID)
		//		n.Latest = n.Latest.Set("host_name", time.Now(), n.ID)
		//		n.Latest = n.Latest.Set("host_node_id", time.Now(), n.ID)
		//		rpts.Container.Nodes[k] = n
		//	}

		//	if err := a.Add(ctx, rpts, unusedParam); err != nil {
		//		log.Errorf("Error Adding report: %v", err)
		//		respondWith(ctx, w, http.StatusInternalServerError, err)
		//		return
		//	}
		//}

		if err := a.Add(ctx, *rpt, unusedParam); err != nil {
			log.Errorf("Error Adding report: %v", err)
			respondWith(ctx, w, http.StatusInternalServerError, err)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
}

// RegisterAdminRoutes registers routes for admin calls with a http mux.
func RegisterAdminRoutes(router *mux.Router, reporter Reporter) {
	get := router.Methods("GET").Subrouter()
	get.Handle("/admin/summary", requestContextDecorator(func(ctx context.Context, w http.ResponseWriter, r *http.Request) {
		summary, err := reporter.AdminSummary(ctx, time.Now())
		if err != nil {
			respondWith(ctx, w, http.StatusBadRequest, err)
		}
		fmt.Fprintln(w, summary)
	}))
}

var newVersion = struct {
	sync.Mutex
	*xfer.NewVersionInfo
}{}

// NewVersion is called to expose new version information to /api
func NewVersion(version, downloadURL string) {
	newVersion.Lock()
	defer newVersion.Unlock()
	newVersion.NewVersionInfo = &xfer.NewVersionInfo{
		Version:     version,
		DownloadURL: downloadURL,
	}
}

func apiHandler(rep Reporter, capabilities map[string]bool) CtxHandlerFunc {
	return func(ctx context.Context, w http.ResponseWriter, r *http.Request) {
		respondWith(ctx, w, http.StatusOK, xfer.Details{
			ID:           UniqueID,
			Version:      Version,
			Hostname:     hostname.Get(),
			Plugins:      report.Report{}.Plugins,
			Capabilities: capabilities,
			NewVersion:   newVersion.NewVersionInfo,
		})
	}
}

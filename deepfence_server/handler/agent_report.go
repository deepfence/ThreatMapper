package handler

import (
	"bytes"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/weaveworks/scope/report"
)

var agent_report_ingesters map[directory.NamespaceID]*ingesters.Ingester[report.Report]

func init() {
	agent_report_ingesters = map[directory.NamespaceID]*ingesters.Ingester[report.Report]{}
}

func getAgentReportIngester(ctx context.Context) (*ingesters.Ingester[report.Report], error) {
	nid, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}

	ing, has := agent_report_ingesters[nid]
	if has {
		return ing, nil
	}
	new_entry, err := ingesters.NewNeo4jCollector(ctx)
	if err != nil {
		return nil, err
	}
	agent_report_ingesters[nid] = &new_entry
	return &new_entry, nil
}

func (h *Handler) IngestAgentReport(w http.ResponseWriter, r *http.Request) {
	var (
		buf    = &bytes.Buffer{}
		reader = io.TeeReader(r.Body, buf)
	)

	gzipped := strings.Contains(r.Header.Get("Content-Encoding"), "gzip")
	if !gzipped {
		reader = io.TeeReader(r.Body, gzip.NewWriter(buf))
	}

	ctx := directory.NewAccountContext()

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

	ingester, err := getAgentReportIngester(ctx)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	if err := (*ingester).Ingest(ctx, *rpt); err != nil {
		log.Error().Msgf("Error Adding report: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

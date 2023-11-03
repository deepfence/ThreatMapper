package handler

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"sync"

	httpext "github.com/go-playground/pkg/v5/net/http"
	jsoniter "github.com/json-iterator/go"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report"
	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

var agent_report_ingesters sync.Map

func init() {
	agent_report_ingesters = sync.Map{}
}

func getAgentReportIngester(ctx context.Context) (*ingesters.Ingester[report.CompressedReport], error) {
	nid, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}

	ing, has := agent_report_ingesters.Load(nid)
	if has {
		return ing.(*ingesters.Ingester[report.CompressedReport]), nil
	}
	new_entry, err := ingesters.NewNeo4jCollector(ctx)
	if err != nil {
		return nil, err
	}
	true_new_entry, loaded := agent_report_ingesters.LoadOrStore(nid, &new_entry)
	if loaded {
		new_entry.Close()
	}
	return true_new_entry.(*ingesters.Ingester[report.CompressedReport]), nil
}

var bufferPool = sync.Pool{
	New: func() any {
		return new(bytes.Buffer)
	},
}

func (h *Handler) IngestAgentReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	ingester, err := getAgentReportIngester(ctx)
	if err != nil {
		log.Error().Msgf("Error report ingest: %v", err)
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	if !(*ingester).IsReady() {
		respondWith(ctx, w, http.StatusServiceUnavailable, err)
		return
	}

	buffer := bufferPool.Get().(*bytes.Buffer)
	buffer.Reset()
	_, err = io.Copy(buffer, r.Body)
	if err != nil {
		bufferPool.Put(buffer)
		log.Error().Msgf("Error reading body: %v", err)
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	gzr, err := gzip.NewReader(buffer)
	if err != nil {
		bufferPool.Put(buffer)
		log.Error().Msgf("Error gzip reader: %v", err)
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}
	decoder := json.NewDecoder(gzr)
	if err := (*ingester).Ingest(ctx, report.CompressedReport{
		Decoder: decoder,
		Cleanup: func() {
			bufferPool.Put(buffer)
		},
	}); err != nil {
		bufferPool.Put(buffer)
		respondWith(ctx, w, http.StatusServiceUnavailable, err)
		return
	}

	res := controls.AgentBeat{
		BeatRateSec: 30 * ingesters.Push_back.Load(),
	}
	err = httpext.JSON(w, http.StatusOK, res)

	if err != nil {
		log.Error().Msgf("Cannot send beat: %v", err)
		w.WriteHeader(http.StatusGone)
		return
	}
}

func (h *Handler) IngestSyncAgentReport(w http.ResponseWriter, r *http.Request) {
	var (
		buf = &bytes.Buffer{}
	)

	reader := io.TeeReader(r.Body, gzip.NewWriter(buf))

	ctx := r.Context()

	data, err := io.ReadAll(reader)
	r.Body.Close()
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var rpt ingesters.ReportIngestionData

	err = jsoniter.Unmarshal(data, &rpt)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	//TODO
	//ingester, err := getAgentReportIngester(ctx)
	//if err != nil {
	//	respondWith(ctx, w, http.StatusBadRequest, err)
	//	return
	//}

	//if err := (*ingester).PushToDB(rpt); err != nil {
	//	log.Error().Msgf("Error pushing report: %v", err)
	//	respondWith(ctx, w, http.StatusInternalServerError, err)
	//	return
	//}
	w.WriteHeader(http.StatusOK)
}

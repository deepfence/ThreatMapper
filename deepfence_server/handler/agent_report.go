package handler

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"io"
	"net/http"
	"sync"

	jsoniter "github.com/json-iterator/go"

	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	reportUtils "github.com/deepfence/golang_deepfence_sdk/utils/report"
)

var agent_report_ingesters sync.Map

func init() {
	agent_report_ingesters = sync.Map{}
}

func getAgentReportIngester(ctx context.Context) (*ingesters.Ingester[*report.Report], error) {
	nid, err := directory.ExtractNamespace(ctx)
	if err != nil {
		return nil, err
	}

	ing, has := agent_report_ingesters.Load(nid)
	if has {
		return ing.(*ingesters.Ingester[*report.Report]), nil
	}
	new_entry, err := ingesters.NewNeo4jCollector(ctx)
	if err != nil {
		return nil, err
	}
	true_new_entry, loaded := agent_report_ingesters.LoadOrStore(nid, &new_entry)
	if loaded {
		new_entry.Close()
	}
	return true_new_entry.(*ingesters.Ingester[*report.Report]), nil
}

func (h *Handler) IngestAgentReport(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	rawReport := reportUtils.RawReport{}

	dec := jsoniter.NewDecoder(r.Body)
	err := dec.Decode(&rawReport)
	if err != nil {
		log.Error().Msgf("Error unmarshal: %v", err)
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}
	b64, err := base64.StdEncoding.DecodeString(rawReport.GetPayload())
	if err != nil {
		log.Error().Msgf("Error b64 reader: %v", err)
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}
	sr := bytes.NewReader(b64)
	gzr, err := gzip.NewReader(sr)
	if err != nil {
		log.Error().Msgf("Error gzip reader: %v", err)
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	rpt := report.MakeReport()
	dec_inner := jsoniter.NewDecoder(gzr)
	err = dec_inner.Decode(&rpt)

	if err != nil {
		log.Error().Msgf("Error sonic unmarshal: %v", err)
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	ingester, err := getAgentReportIngester(ctx)
	if err != nil {
		log.Error().Msgf("Error report ingest: %v", err)
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	if err := (*ingester).Ingest(ctx, &rpt); err != nil {
		log.Error().Msgf("Error Adding report: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) IngestSyncAgentReport(w http.ResponseWriter, r *http.Request) {
	var (
		buf    = &bytes.Buffer{}
		reader = io.TeeReader(r.Body, buf)
	)

	reader = io.TeeReader(r.Body, gzip.NewWriter(buf))

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

	ingester, err := getAgentReportIngester(ctx)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	if err := (*ingester).PushToDB(rpt); err != nil {
		log.Error().Msgf("Error pushing report: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

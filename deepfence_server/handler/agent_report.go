package handler

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"

	"github.com/bytedance/sonic"
	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	"github.com/deepfence/ThreatMapper/deepfence_server/pkg/scope/report"
	"github.com/deepfence/golang_deepfence_sdk/utils/directory"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
	reportUtils "github.com/deepfence/golang_deepfence_sdk/utils/report"
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
	ctx := r.Context()

	//contentType := r.Header.Get("Content-Type")
	//var isMsgpack int
	//switch {
	//case strings.HasPrefix(contentType, "application/msgpack"):
	//	isMsgpack = 1
	//case strings.HasPrefix(contentType, "application/json"):
	//	isMsgpack = 0
	//case strings.HasPrefix(contentType, "application/binc"):
	//	isMsgpack = 2
	//default:
	//	respondWith(ctx, w, http.StatusBadRequest, fmt.Errorf("Unsupported Content-Type: %v", contentType))
	//	return
	//}
	data, err := io.ReadAll(r.Body)
	r.Body.Close()
	if err != nil {
		log.Error().Msgf("Error reading all: %v", err)
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var rawReport reportUtils.RawReport

	err = sonic.Unmarshal(data, &rawReport)
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
	data, err = io.ReadAll(gzr)
	if err != nil {
		log.Error().Msgf("Error read all raw: %v", err)
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}
	rpt := report.MakeReport()
	err = sonic.Unmarshal(data, &rpt)

	//if err := codec.NewDecoderBytes([]byte(rawReport.GetPayload()), &codec.JsonHandle{}).Decode(&rpt); err != nil {
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

	if err := (*ingester).Ingest(ctx, rpt); err != nil {
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

	err = json.Unmarshal(data, &rpt)
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

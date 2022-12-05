package handler

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/http"

	"github.com/deepfence/ThreatMapper/deepfence_server/controls"
	"github.com/deepfence/ThreatMapper/deepfence_server/ingesters"
	openapi "github.com/deepfence/ThreatMapper/deepfence_server_client"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
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
	//buf    = &bytes.Buffer{}
	//reader = io.TeeReader(r.Body, buf)
	)

	//gzipped := strings.Contains(r.Header.Get("Content-Encoding"), "gzip")
	//if !gzipped {
	//	reader = io.TeeReader(r.Body, gzip.NewWriter(buf))
	//}

	ctx := directory.NewAccountContext()

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
	data, err := ioutil.ReadAll(r.Body)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	var rawReport openapi.ApiDocsRawReport
	err = json.Unmarshal(data, &rawReport)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}
	rpt := report.MakeReport()
	err = json.Unmarshal([]byte(rawReport.GetPayload()), &rpt)

	//if err := codec.NewDecoderBytes([]byte(rawReport.GetPayload()), &codec.JsonHandle{}).Decode(&rpt); err != nil {
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	ingester, err := getAgentReportIngester(ctx)
	if err != nil {
		respondWith(ctx, w, http.StatusBadRequest, err)
		return
	}

	if err := (*ingester).Ingest(ctx, rpt); err != nil {
		log.Error().Msgf("Error Adding report: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
		return
	}

	actions, err := controls.GetAgentActions(ctx, rpt.ID)
	if err != nil {
		log.Error().Msgf("Cannot get actions: ", err)
	}

	res := ctl.AgentControls{
		BeatRateSec: 30,
		Commands:    actions,
	}
	b, err := json.Marshal(res)
	if err != nil {
		log.Error().Msgf("Cannot marshal controls: %v", err)
		respondWith(ctx, w, http.StatusInternalServerError, err)
	}

	w.Header().Add("Content-Type", "application/json")
	_, err = w.Write(b)

	if err != nil {
		log.Error().Msgf("Cannot send controls: %v", err)
		w.WriteHeader(http.StatusGone)
	}
}

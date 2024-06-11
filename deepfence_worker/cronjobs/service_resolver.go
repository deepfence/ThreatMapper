package cronjobs

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	wutils "github.com/deepfence/ThreatMapper/deepfence_worker/utils"
	"github.com/hibiken/asynq"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const (
	threatIntelResolverURL = "https://threat-intel.deepfence.io/threat-intel"
)

type CloudInfo struct {
	Type     string `json:"type"`
	Region   string `json:"region"`
	Provider string `json:"provider"`
}

type IPResponse struct {
	Infos []CloudInfo `json:"Infos"`
}

type ServicesResponse struct {
	Infos []string `json:"infos"`
}

type IPRequest struct {
	IPv4s []string `json:"ipv4s"`
	IPv6s []string `json:"ipv6s"`
}

func requestCloudInfo(ctx context.Context, strIps []string) ([]CloudInfo, error) {
	// check if token is present
	var infos []CloudInfo
	token, err := FetchLicense(ctx)
	if err != nil || token == "" {
		log.Error().Err(err).Msg("token is required to access threat intel")
		return infos, err
	}

	bodyReq := IPRequest{
		IPv4s: strIps,
	}
	b, err := json.Marshal(bodyReq)
	if err != nil {
		return infos, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, threatIntelResolverURL+"/cloud-ips", bytes.NewReader(b))
	if err != nil {
		return infos, err
	}

	req.Header.Set("x-license-key", token)

	q := req.URL.Query()
	q.Add("version", wutils.Version)
	q.Add("product", utils.Project)
	req.URL.RawQuery = q.Encode()

	log.Info().Msgf("query threatintel at %s", req.URL.String())

	tr := http.DefaultTransport.(*http.Transport).Clone()
	tr.TLSClientConfig = &tls.Config{
		InsecureSkipVerify: true,
	}
	hc := http.Client{
		Timeout:   1 * time.Minute,
		Transport: tr,
	}
	resp, err := hc.Do(req)
	if err != nil {
		log.Error().Err(err).Msg("failed http request")
		return infos, err
	}

	if resp.StatusCode != http.StatusOK {
		return infos, fmt.Errorf("%d invaid response code", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Err(err).Msg("failed read response body")
		return infos, err
	}
	defer resp.Body.Close()

	var res IPResponse
	if err := json.Unmarshal(body, &res); err != nil {
		log.Error().Err(err).Msg("failed to decode response body")
		return infos, err
	}

	return res.Infos, nil
}

func requestCloudServices(ctx context.Context) ([]string, error) {
	// check if token is present
	var infos []string
	token, err := FetchLicense(ctx)
	if err != nil || token == "" {
		log.Error().Err(err).Msg("token is required to access threat intel")
		return infos, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, threatIntelResolverURL+"/cloud-services", nil)
	if err != nil {
		return infos, err
	}

	req.Header.Set("x-license-key", token)

	q := req.URL.Query()
	q.Add("version", wutils.Version)
	q.Add("product", utils.Project)
	req.URL.RawQuery = q.Encode()

	log.Info().Msgf("query threatintel at %s", req.URL.String())

	tr := http.DefaultTransport.(*http.Transport).Clone()
	tr.TLSClientConfig = &tls.Config{
		InsecureSkipVerify: true,
	}
	hc := http.Client{
		Timeout:   1 * time.Minute,
		Transport: tr,
	}
	resp, err := hc.Do(req)
	if err != nil {
		log.Error().Err(err).Msg("failed http request")
		return infos, err
	}

	if resp.StatusCode != http.StatusOK {
		return infos, fmt.Errorf("%d invaid response code", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Err(err).Msg("failed read response body")
		return infos, err
	}
	defer resp.Body.Close()

	var res ServicesResponse
	if err := json.Unmarshal(body, &res); err != nil {
		log.Error().Err(err).Msg("failed to decode response body")
		return infos, err
	}

	return res.Infos, nil
}

func IngestServiceNodes(ctx context.Context, task *asynq.Task) error {

	log := log.WithCtx(ctx)

	log.Info().Msgf("Ingest cloud services nodes")
	defer log.Info().Msgf("Ingest cloud services nodes done")

	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}

	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	infos, err := requestCloudServices(ctx)
	if err != nil {
		return err
	}

	if _, err = session.Run(ctx,
		`UNWIND $batch as row
		MERGE (n:Node{node_id:row})
		ON CREATE SET n.pseudo = true,
				      n.cloud_provider = 'internet',
				      n.cloud_region = 'internet',
		              n.active = false,
		              n.node_name = row`,
		map[string]interface{}{"batch": infos},
	); err != nil {
		return err
	}

	return nil
}

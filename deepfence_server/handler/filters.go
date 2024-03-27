package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	httpext "github.com/go-playground/pkg/v5/net/http"
	"github.com/neo4j/neo4j-go-driver/v4/neo4j"
)

func (h *Handler) GetHostsForFilter(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	t := r.URL.Query().Get("type")
	if t == "" {
		h.complianceError(w, "type is required")
		return
	}

	switch t {
	case "vulnerability":
		t = "VulnerabilityScan"
	case "compliance":
		t = "ComplianceScan"
	case "malware":
		t = "MalwareScan"
	case "secret":
		t = "SecretScan"
	default:
		h.complianceError(w, "Invalid type")
	}
	hosts, err := getHost(ctx, t)
	if err != nil {
		h.complianceError(w, "Error getting hosts")
		return
	}

	err = httpext.JSON(w, http.StatusOK, hosts)
	return
}

type actionStruct struct {
	NodeID   string                `json:"node_id" required:"true"`
	NodeType controls.ScanResource `json:"node_type" required:"true"`
	BinArgs  map[string]string     `json:"bin_args" required:"true"`
}

func getHost(ctx context.Context, scanType string) ([]string, error) {
	actions, err := getScanHostAction(ctx, scanType)
	if err != nil {
		return []string{}, err
	}

	hosts := make(map[string]string)

	for i := range actions {
		var a actionStruct
		err = json.Unmarshal([]byte(actions[i].RequestPayload), &a)
		if err != nil {
			return []string{}, err
		}

		switch a.NodeType {
		case controls.Host:
			if a.BinArgs["node_id"] != "" {
				hosts[a.BinArgs["node_id"]] = a.BinArgs["node_id"]
			}
		}
	}

	var hostList []string
	for _, v := range hosts {
		hostList = append(hostList, v)
	}

	return hostList, nil
}

func getScanHostAction(ctx context.Context, scanType string) ([]controls.Action, error) {
	driver, err := directory.Neo4jClient(ctx)
	if err != nil {
		return []controls.Action{}, err
	}

	session := driver.NewSession(neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close()

	tx, err := session.BeginTransaction(neo4j.WithTxTimeout(30 * time.Second))
	if err != nil {
		return []controls.Action{}, err
	}
	defer tx.Close()

	query := `
	MATCH (n:` + scanType + `)
	RETURN n.trigger_action
	`

	res, err := tx.Run(query, nil)

	rec, err := res.Collect()
	if err != nil {
		return []controls.Action{}, err
	}

	if len(rec) == 0 {
		return []controls.Action{}, nil
	}

	var action []controls.Action
	for i := range rec {
		var a controls.Action
		err = json.Unmarshal([]byte(rec[i].Values[0].(string)), &a)
		if err != nil {
			return []controls.Action{}, err
		}
		action = append(action, a)
	}

	return action, nil
}

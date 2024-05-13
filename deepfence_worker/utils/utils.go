package utils

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/reporters"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/minio/minio-go/v7"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func TimeRangeFilter(key string, start, end time.Time) []reporters.CompareFilter {
	return []reporters.CompareFilter{
		{
			FieldName:   key,
			FieldValue:  strconv.FormatInt(start.UnixMilli(), 10),
			GreaterThan: true,
		},
		{
			FieldName:   key,
			FieldValue:  strconv.FormatInt(end.UnixMilli(), 10),
			GreaterThan: false,
		},
	}
}

// used to replace http:// or https:// from registry url
var httpReplacer = strings.NewReplacer(
	"http://", "",
	"https://", "",
)

func RunCommand(cmd *exec.Cmd) (*bytes.Buffer, error) {
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	errorOnRun := cmd.Run()
	if errorOnRun != nil {
		return nil, errors.New(fmt.Sprint(errorOnRun) + ": " + stderr.String())
	}
	return &out, nil
}

func GetEntityIdFromScanID(ctx context.Context, scanId, scanType string, tx neo4j.ExplicitTransaction) (string, error) {

	entityId := ""
	query := `MATCH (s:` + scanType + `{node_id:'` + scanId + `'}) - [:SCANNED] -> (n)
		WITH labels(n) as label, n
		RETURN
		CASE
			WHEN 'ContainerImage' IN label or 'Container' in label
			THEN [(ci:ContainerImage{node_id:n.docker_image_id}) - [:IS] -> (cis) | cis.node_id]
			ELSE [n.node_id]
		END`
	res, err := tx.Run(ctx, query, map[string]interface{}{})
	if err != nil {
		return "", err
	}

	rec, err := res.Single(ctx)
	if err != nil {
		return "", err
	}

	values := rec.Values[0].([]interface{})
	if len(values) > 0 {
		entityId = values[0].(string)
	}

	if len(entityId) == 0 {
		entityId = scanId
	}

	return entityId, nil
}

func GetVulnerabilityNodeID(packageName, cveID, entityID string) string {
	nodeId := packageName + cveID
	if len(entityID) > 0 {
		nodeId = nodeId + "_" + entityID
	}
	return nodeId
}

func UpdateRules(ctx context.Context, path string, rulesPath string) error {

	mc, err := directory.FileServerClient(directory.WithDatabaseContext(ctx))
	if err != nil {
		return err
	}

	data, err := mc.DownloadFileContexts(ctx, path, minio.GetObjectOptions{})
	if err != nil {
		return err
	}

	if err := utils.ExtractTarGz(bytes.NewReader(data), rulesPath); err != nil {
		return err
	}

	return nil
}

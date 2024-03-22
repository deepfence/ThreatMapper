package cronjobs

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/hibiken/asynq"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const (
	contentTypeJson = "application/json"
)

func UpdateLicenseStatus(ctx context.Context, task *asynq.Task) error {

	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	currentLicense, err := pgClient.GetLicense(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		// License not registered yet
		return nil
	} else if err != nil {
		return err
	}
	license, _, err := model.FetchLicense(ctx, currentLicense.LicenseKey.String(), currentLicense.LicenseEmail, pgClient)
	if err != nil {
		return err
	}
	err = license.Save(ctx, pgClient)
	if err != nil {
		return err
	}
	return nil
}

func PublishLicenseUsageToLicenseServer(ctx context.Context, task *asynq.Task) error {
	err := publishLicenseUsageToLicenseServer(ctx)
	if err != nil {
		log.Error().Err(err).Msg("PublishLicenseUsageToLicenseServer")
	}
	return err
}

type ReportLicensePayload struct {
	LicenseKey                              string `json:"license_key"`
	DfClusterID                             int64  `json:"df_cluster_id"`
	CurrentNumberOfHosts                    int64  `json:"current_no_of_hosts"`
	CurrentNumberOfCloudAccounts            int64  `json:"current_no_of_cloud_accounts"`
	CurrentNumberOfRegistries               int64  `json:"current_no_of_registries"`
	NotificationThresholdPercentage         int32  `json:"notification_threshold_percentage"`
	NotificationThresholdUpdatedAtTimestamp int64  `json:"notification_threshold_updated_at_timestamp"`
}

func publishLicenseUsageToLicenseServer(ctx context.Context) error {
	pgClient, err := directory.PostgresClient(ctx)
	if err != nil {
		return err
	}
	license, err := model.GetLicense(ctx, pgClient)
	if errors.Is(err, sql.ErrNoRows) {
		// License not registered yet
		return nil
	} else if err != nil {
		return err
	}

	nc, err := directory.Neo4jClient(ctx)
	if err != nil {
		return err
	}
	session := nc.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	tx, err := session.BeginTransaction(ctx, neo4j.WithTxTimeout(15*time.Second))
	if err != nil {
		return err
	}
	defer tx.Close(ctx)

	res, err := tx.Run(ctx, `MATCH (n:Node)
			WHERE n.pseudo = false AND n.active = true AND n.agent_running = true
			return count(n)`,
		map[string]interface{}{})
	if err != nil {
		return err
	}
	rec, err := res.Single(ctx)
	if err != nil {
		return err
	}

	var activeAgentNodes int64
	if rec.Values[0] != nil {
		activeAgentNodes = rec.Values[0].(int64)
	}

	consoleIDSetting, err := model.GetSettingByKey(ctx, pgClient, model.ConsoleIDKey)
	if err != nil {
		return err
	}
	consoleID, err := strconv.ParseInt(fmt.Sprintf("%.0f", consoleIDSetting.Value.Value), 10, 64)
	if err != nil {
		return err
	}

	reportLicensePayload := ReportLicensePayload{
		LicenseKey:                              license.LicenseKey,
		DfClusterID:                             consoleID,
		CurrentNumberOfHosts:                    activeAgentNodes,
		CurrentNumberOfCloudAccounts:            0,
		CurrentNumberOfRegistries:               0,
		NotificationThresholdPercentage:         license.NotificationThresholdPercentage,
		NotificationThresholdUpdatedAtTimestamp: license.NotificationThresholdUpdatedAt,
	}
	reportLicensePayloadJson, err := json.Marshal(reportLicensePayload)
	if err != nil {
		return err
	}

	httpClient, err := utils.NewHTTPClient()
	if err != nil {
		return err
	}
	httpClient.Timeout = 15 * time.Second
	resp, err := httpClient.Post(model.ReportLicenseUsageURL, contentTypeJson, bytes.NewBuffer(reportLicensePayloadJson))
	if err != nil {
		return err
	}
	if resp.StatusCode != 200 {
		defer resp.Body.Close()
		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return err
		}
		var licenseResp model.LicenseServerResponse
		err = json.Unmarshal(respBody, &licenseResp)
		if err != nil {
			return err
		}
		return errors.New(licenseResp.Error.Message)
	}
	return nil
}

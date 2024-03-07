package cronjobs

import (
	"context"
	"database/sql"
	"errors"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/directory"
	"github.com/hibiken/asynq"
)

const (
	contentTypeJson = "application/json"
)

func UpdateLicenseStatus(ctx context.Context, task *asynq.Task) error {

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
	err = license.Save(ctx, pgClient)
	if err != nil {
		return err
	}
	return nil
}

package email

import (
	"context"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

func SendUserInviteEmail(ctx context.Context, emailId string, createdByUser *model.User, inviteURL string) error {
	return nil
}

package api_messages //nolint:stylecheck

const (
	SuccessRegistryUpdated            = "registry updated successfully"
	SuccessRegistryCreated            = "registry added successfully"
	SuccessCloudControlsEnabled       = "controls enabled successfully"
	SuccessCloudControlsDisabled      = "controls disabled successfully"
	SuccessIntegrationDeleted         = "integration deleted successfully"
	SuccessIntegrationUpdated         = "integration updated successfully"
	SuccessIntegrationCreated         = "integration added successfully"
	SuccessEmailConfigCreated         = "email configuration added successfully"
	SuccessEmailConfigTest            = "test email sent successfully"
	ErrIntegrationDoesNotExist        = "integration does not exist"
	ErrIntegrationTypeCannotBeUpdated = "integration type cannot be updated"
	ErrIntegrationTypeEmpty           = "integration type cannot be empty"
	ErrNotificationTypeEmpty          = "notification type cannot be empty"
)

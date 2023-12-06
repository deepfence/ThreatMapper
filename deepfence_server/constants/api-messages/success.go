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
	ErrIntegrationDoesNotExist        = "integration does not exist"
	ErrIntegrationTypeCannotBeUpdated = "integration type cannot be updated"
)

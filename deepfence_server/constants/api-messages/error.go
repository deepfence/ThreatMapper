package api_messages //nolint:stylecheck

// Registry errors
const (
	ErrRegistryExists     = "registry with this name already exists"
	ErrRegistryNotExists  = "registry with this name does not exists"
	ErrRegistryAuthFailed = "Authentication failed for given credentials"
	ErrRegistryIDMissing  = "registry id is missing"
)

// Integration errors
const (
	ErrIntegrationExists = "integration with this configuration already exists"
	ErrInvalidCredential = "invalid credentials"
)

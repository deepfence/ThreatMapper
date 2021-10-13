package azure

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strings"
	"time"

	"github.com/Azure/go-autorest/autorest"
	"github.com/Azure/go-autorest/autorest/azure"
	"github.com/Azure/go-autorest/autorest/azure/auth"
	"github.com/Azure/go-autorest/autorest/azure/cli"
	"github.com/turbot/steampipe-plugin-sdk/plugin"
)

// Session info
type Session struct {
	SubscriptionID string
	TenantID       string
	Authorizer     autorest.Authorizer
	Expires        *time.Time
}

// GetNewSession creates an session configured from environment variables/CLI in the order:
// 1. Client credentials
// 2. Client certificate
// 3. Username password
// 4. MSI
// 5. CLI
func GetNewSession(ctx context.Context, d *plugin.QueryData, tokenAudience string) (session *Session, err error) {
	cacheKey := "GetNewSession"
	if cachedData, ok := d.ConnectionManager.Cache.Get(cacheKey); ok {
		session = cachedData.(*Session)
		if session.Expires != nil && WillExpireIn(*session.Expires, 0) {
			d.ConnectionManager.Cache.Delete("GetNewSession")
		} else {
			return cachedData.(*Session), nil
		}
	}

	azureConfig := GetConfig(d.Connection)

	if azureConfig.TenantID != nil {
		os.Setenv("AZURE_TENANT_ID", *azureConfig.TenantID)
	}
	if azureConfig.SubscriptionID != nil {
		os.Setenv("AZURE_SUBSCRIPTION_ID", *azureConfig.SubscriptionID)
	}
	if azureConfig.ClientID != nil {
		os.Setenv("AZURE_CLIENT_ID", *azureConfig.ClientID)
	}
	if azureConfig.ClientSecret != nil {
		os.Setenv("AZURE_CLIENT_SECRET", *azureConfig.ClientSecret)
	}
	if azureConfig.CertificatePath != nil {
		os.Setenv("AZURE_CERTIFICATE_PATH", *azureConfig.CertificatePath)
	}
	if azureConfig.CertificatePassword != nil {
		os.Setenv("AZURE_CERTIFICATE_PASSWORD", *azureConfig.CertificatePassword)
	}
	if azureConfig.Username != nil {
		os.Setenv("AZURE_USERNAME", *azureConfig.Username)
	}
	if azureConfig.Username != nil {
		os.Setenv("AZURE_PASSWORD", *azureConfig.Password)
	}

	logger := plugin.Logger(ctx)
	subscriptionID := os.Getenv("AZURE_SUBSCRIPTION_ID")
	tenantID := os.Getenv("AZURE_TENANT_ID")

	authMethod, resource, err := getApplicableAuthorizationDetails(ctx, tokenAudience)
	if err != nil {
		logger.Debug("GetNewSession__", "getApplicableAuthorizationDetails error", err)
		return nil, err
	}

	var authorizer autorest.Authorizer
	var expiresOn time.Time

	// so if it was not in cache - create session
	switch authMethod {
	case "Environment":
		authorizer, err = auth.NewAuthorizerFromEnvironmentWithResource(resource)
		if err != nil {
			logger.Debug("GetNewSession__", "NewAuthorizerFromEnvironmentWithResource error", err)
			return nil, err
		}

	// In this case need to get the details of SUBSCRIPTION_ID
	// And TENANT_ID if tokenAudience is GRAPH
	case "CLI":
		authorizer, err = auth.NewAuthorizerFromCLIWithResource(resource)
		if err != nil {
			logger.Debug("GetNewSession__", "NewAuthorizerFromCLIWithResource error", err)

			// In case the password got changed, and the session token stored in the system, or the CLI is outdated
			if strings.Contains(err.Error(), "invalid_grant") {
				return nil, fmt.Errorf("ValidationError: The credential data used by CLI has been expired because you might have changed or reset the password. Please clear browser's cookies and run 'az login'")
			}
			return nil, err
		}
	default:
		// authorizer, err = auth.NewAuthorizerFromCLIWithResource(resource)
		token, err := cli.GetTokenFromCLI(resource)
		if err != nil {
			return nil, err
		}

		// var adalToken adal.Token
		adalToken, err := token.ToADALToken()
		expiresOn = adalToken.Expires()

		if err != nil {
			logger.Debug("GetNewSession__", "NewAuthorizerFromCLIWithResource error", err)

			if strings.Contains(err.Error(), "invalid_grant") {
				return nil, fmt.Errorf("ValidationError: The credential data used by CLI has been expired because you might have changed or reset the password. Please clear browser's cookies and run 'az login'")
			}
			return nil, err
		}
		authorizer = autorest.NewBearerAuthorizer(&adalToken)
	}

	if authMethod == "CLI" {
		subscription, err := getSubscriptionFromCLI(resource)
		if err != nil {
			logger.Debug("GetNewSession__", "getSubscriptionFromCLI error", err)
			return nil, err
		}
		tenantID = subscription.TenantID

		// If "AZURE_SUBSCRIPTION_ID" is set then it will take precedence over the subscription set in the CLI
		if subscriptionID == "" {
			subscriptionID = subscription.SubscriptionID
		}
	}

	sess := &Session{
		SubscriptionID: subscriptionID,
		Authorizer:     authorizer,
		TenantID:       tenantID,
		Expires:        &expiresOn,
	}

	if sess.Expires != nil {
		d.ConnectionManager.Cache.SetWithTTL(cacheKey, sess, time.Until(*sess.Expires))
	} else {
		d.ConnectionManager.Cache.Set(cacheKey, sess)
	}

	return sess, err
}

func getApplicableAuthorizationDetails(ctx context.Context, tokenAudience string) (authMethod string, resource string, err error) {
	logger := plugin.Logger(ctx)
	subscriptionID := os.Getenv("AZURE_SUBSCRIPTION_ID")
	tenantID := os.Getenv("AZURE_TENANT_ID")

	// 1. Client credentials
	clientID := os.Getenv("AZURE_CLIENT_ID")
	clientSecret := os.Getenv("AZURE_CLIENT_SECRET")

	// 2. Client certificate
	certificatePath := os.Getenv("AZURE_CERTIFICATE_PATH")
	certificatePassword := os.Getenv("AZURE_CERTIFICATE_PASSWORD")

	// 3. Username password
	username := os.Getenv("AZURE_USERNAME")
	password := os.Getenv("AZURE_PASSWORD")

	authMethod = "CLI"
	if subscriptionID == "" || (subscriptionID == "" && tenantID == "") {
		authMethod = "CLI"
	} else if ((subscriptionID != "" && tenantID != "" && clientID != "") && (clientSecret != "" ||
		(certificatePath != "" && certificatePassword != "") ||
		(username != "" && password != ""))) ||
		(subscriptionID != "" && tenantID == "") {
		authMethod = "Environment"
	}

	logger.Trace("getApplicableAuthorizationDetails_", "Auth Method: ", authMethod)

	var environment azure.Environment
	// get the environment endpoint to be used for authorization
	if v := os.Getenv("AZURE_ENVIRONMENT"); v == "" {
		environment = azure.PublicCloud
	} else {
		environment, err = azure.EnvironmentFromName(v)
		if err != nil {
			logger.Error("Unable to get environment", "ERROR", err)
			return
		}
	}
	logger.Trace("getApplicableAuthorizationDetails_", "tokenAudience: ", tokenAudience)

	switch tokenAudience {
	case "GRAPH":
		resource = environment.GraphEndpoint
	case "VAULT":
		resource = strings.TrimSuffix(environment.KeyVaultEndpoint, "/")
	case "MANAGEMENT":
		resource = environment.ResourceManagerEndpoint
	default:
		resource = environment.ResourceManagerEndpoint
	}

	logger.Trace("getApplicableAuthorizationDetails_", "resource: ", resource)

	return
}

type subscription struct {
	SubscriptionID string `json:"subscriptionID,omitempty"`
	TenantID       string `json:"tenantID,omitempty"`
}

// https://github.com/Azure/go-autorest/blob/3fb5326fea196cd5af02cf105ca246a0fba59021/autorest/azure/cli/token.go#L126
// NewAuthorizerFromCLIWithResource creates an Authorizer configured from Azure CLI 2.0 for local development scenarios.
func getSubscriptionFromCLI(resource string) (*subscription, error) {
	// This is the path that a developer can set to tell this class what the install path for Azure CLI is.
	const azureCLIPath = "AzureCLIPath"

	// The default install paths are used to find Azure CLI. This is for security, so that any path in the calling program's Path environment is not used to execute Azure CLI.
	azureCLIDefaultPathWindows := fmt.Sprintf("%s\\Microsoft SDKs\\Azure\\CLI2\\wbin; %s\\Microsoft SDKs\\Azure\\CLI2\\wbin", os.Getenv("ProgramFiles(x86)"), os.Getenv("ProgramFiles"))

	// Default path for non-Windows.
	const azureCLIDefaultPath = "/bin:/sbin:/usr/bin:/usr/local/bin"

	// Validate resource, since it gets sent as a command line argument to Azure CLI
	const invalidResourceErrorTemplate = "Resource %s is not in expected format. Only alphanumeric characters, [dot], [colon], [hyphen], and [forward slash] are allowed."
	match, err := regexp.MatchString("^[0-9a-zA-Z-.:/]+$", resource)
	if err != nil {
		return nil, err
	}
	if !match {
		return nil, fmt.Errorf(invalidResourceErrorTemplate, resource)
	}

	// Execute Azure CLI to get token
	var cliCmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cliCmd = exec.Command(fmt.Sprintf("%s\\system32\\cmd.exe", os.Getenv("windir")))
		cliCmd.Env = os.Environ()
		cliCmd.Env = append(cliCmd.Env, fmt.Sprintf("PATH=%s;%s", os.Getenv(azureCLIPath), azureCLIDefaultPathWindows))
		cliCmd.Args = append(cliCmd.Args, "/c", "az")
	} else {
		cliCmd = exec.Command("az")
		cliCmd.Env = os.Environ()
		cliCmd.Env = append(cliCmd.Env, fmt.Sprintf("PATH=%s:%s", os.Getenv(azureCLIPath), azureCLIDefaultPath))
	}
	cliCmd.Args = append(cliCmd.Args, "account", "get-access-token", "-o", "json", "--resource", resource)

	var stderr bytes.Buffer
	cliCmd.Stderr = &stderr

	output, err := cliCmd.Output()
	if err != nil {
		return nil, fmt.Errorf("Invoking Azure CLI failed with the following error: %v", err)
	}

	var tokenResponse map[string]interface{}
	err = json.Unmarshal(output, &tokenResponse)
	if err != nil {
		return nil, err
	}

	return &subscription{
		SubscriptionID: tokenResponse["subscription"].(string),
		TenantID:       tokenResponse["tenant"].(string),
	}, nil
}

// WillExpireIn returns true if the Token will expire after the passed time.Duration interval
// from now, false otherwise.
func WillExpireIn(t time.Time, d time.Duration) bool {
	return !t.After(time.Now().Add(d))
}

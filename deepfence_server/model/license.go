package model

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/google/uuid"
)

const (
	DateLayout1               = "2006-01-02 15:04:05.999999-07:00"
	DateLayout2               = "2006-01-02 15:04:05 UTC"
	licenseDefaultMessage     = "License Active"
	licenseDefaultDescription = "Your license is valid and active"
	licenseExpiredMessage     = "License Expired"
	licenseExpiredDescription = `Your license expired on %s.
To renew your license, please contact %s`
	numberOfHostsExceededMessage     = "License Count Exceeded"
	numberOfHostsExceededDescription = `Your license doesn't allow you to use Deepfence on more than %d hosts. Current usage is %d.
Please reduce the number of hosts or upgrade your license by contacting %s`

	licenseDefaultNumberOfHosts            = 100000
	licenseDefaultNumberOfCloudAccounts    = 100000
	licenseDefaultNumberOfRegistries       = 100000
	licenseDefaultNumberOfImagesInRegistry = 1000000
	licenseDefaultDuration                 = 365 * 24 * time.Hour

	DeepfenceSupportEmail = "community-support@deepfence.io"

	errGenerateLicense = "Could not generate license. Please navigate to this URL in the browser to generate one: "
)

const (
	LicenseServerURL      = "https://license.deepfence.io/threatmapper"
	GenerateLicenseAPIURL = LicenseServerURL + "/generate-license?first_name=%s&last_name=%s&email=%s&company=%s&resend_email=%t"
	GetLicenseAPIURL      = LicenseServerURL + "/license?license_key=%s"
	ReportLicenseUsageURL = LicenseServerURL + "/report-license"
)

type GenerateLicenseRequest struct {
	FirstName   string `json:"first_name" validate:"required,user_name,min=2,max=32" required:"true"`
	LastName    string `json:"last_name" validate:"required,user_name,min=2,max=32" required:"true"`
	Email       string `json:"email" validate:"required,email" required:"true"`
	Company     string `json:"company" validate:"required,company_name,min=2,max=32" required:"true"`
	ResendEmail bool   `json:"resend_email" required:"true"`
}

type GenerateLicenseResponse struct {
	Message             string `json:"message" required:"true"`
	Success             bool   `json:"success" required:"true"`
	GenerateLicenseLink string `json:"generate_license_link"`
}

type RegisterLicenseRequest struct {
	Email      string `json:"email" validate:"omitempty,email"`
	LicenseKey string `json:"license_key" validate:"required,uuid4" required:"true"`
}

type RegisterLicenseResponse struct {
	LicenseKey  string `json:"license_key" required:"true"`
	EmailDomain string `json:"email_domain" required:"true"`
}

type NotificationThresholdUpdateRequest struct {
	NotificationThresholdPercentage int32 `json:"notification_threshold_percentage" validate:"required,min=50,max=100" required:"true"`
}

type RegistryCredentials struct {
	Password    string `json:"password"`
	RegistryURL string `json:"registry_url"`
	Username    string `json:"username"`
}

type License struct {
	LicenseKey                      string              `json:"key"`
	LicenseKeyUUID                  uuid.UUID           `json:"-"`
	LicenseEmail                    string              `json:"license_email"`
	LicenseEmailDomain              string              `json:"license_email_domain"`
	IsActive                        bool                `json:"is_active"`
	EndDate                         string              `json:"end_date"`
	NoOfHosts                       int64               `json:"no_of_hosts"`
	NoOfCloudAccounts               int64               `json:"no_of_cloud_accounts"`
	NoOfRegistries                  int64               `json:"no_of_registries"`
	NoOfImagesInRegistry            int64               `json:"no_of_images_in_registry"`
	CurrentHosts                    int64               `json:"current_hosts"`
	DeepfenceSupportEmail           string              `json:"deepfence_support_email"`
	NotificationThresholdPercentage int32               `json:"notification_threshold_percentage"`
	NotificationThresholdUpdatedAt  int64               `json:"notification_threshold_updated_at"`
	StartDate                       string              `json:"start_date"`
	Message                         string              `json:"message"`
	Description                     string              `json:"description"`
	LicenseType                     string              `json:"license_type"`
	RegistryCredentials             RegistryCredentials `json:"registry_credentials"`
}

type LicenseServerResponse struct {
	Data  License `json:"data"`
	Error struct {
		ErrorFields map[string]string `json:"error_fields"`
		Message     string            `json:"message"`
	} `json:"error"`
	Success bool `json:"success"`
}

func GenerateLicense(req GenerateLicenseRequest) (*GenerateLicenseResponse, map[string]string, error) {
	generateLicenseAPIURL := fmt.Sprintf(GenerateLicenseAPIURL, req.FirstName, req.LastName, req.Email, req.Company, req.ResendEmail)
	var licenseResp *LicenseServerResponse
	var responseCode int
	var err error

	retryCounter := 0
	for {
		licenseResp, responseCode, err = generateLicense(generateLicenseAPIURL)
		if err != nil {
			retryCounter += 1
			if retryCounter > 3 {
				break
			}
			time.Sleep(3 * time.Second)
			continue
		}
		break
	}
	if err != nil {
		log.Error().Msgf("Could not generate license key: %v", err)
		return &GenerateLicenseResponse{
			Message: errGenerateLicense, Success: false, GenerateLicenseLink: generateLicenseAPIURL}, nil, nil
	}
	if responseCode == http.StatusBadRequest || licenseResp.Success == false {
		if len(licenseResp.Error.ErrorFields) > 0 {
			return nil, licenseResp.Error.ErrorFields, nil
		} else {
			return &GenerateLicenseResponse{
				Message: licenseResp.Error.Message, Success: false, GenerateLicenseLink: generateLicenseAPIURL}, nil, nil
		}
	}
	return &GenerateLicenseResponse{Message: licenseResp.Data.Message, Success: true}, nil, nil
}

func generateLicense(generateLicenseAPIURL string) (*LicenseServerResponse, int, error) {
	httpClient, err := utils.NewHTTPClient()
	if err != nil {
		return nil, 0, err
	}
	httpClient.Timeout = 10 * time.Second
	resp, err := httpClient.Get(generateLicenseAPIURL)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, err
	}
	var licenseResp LicenseServerResponse
	err = json.Unmarshal(respBody, &licenseResp)
	if err != nil {
		log.Warn().Msgf("Error in generating license: %s", string(respBody))
		return nil, resp.StatusCode, err
	}
	return &licenseResp, resp.StatusCode, nil
}

func FetchLicense(ctx context.Context, licenseKey string, email string, pgClient *postgresqlDb.Queries) (*License, int, error) {
	var licenseResp *LicenseServerResponse
	var err error
	retryCounter := 0
	for {
		licenseResp, err = fetchLicense(licenseKey)
		if err != nil {
			retryCounter += 1
			if retryCounter > 3 {
				break
			}
			time.Sleep(3 * time.Second)
			continue
		}
		break
	}
	if err != nil {
		log.Error().Msgf("Could not fetch license details: %v", err)
		return generateDefaultLicense(ctx, email, pgClient), 0, nil
	}

	if licenseResp.Success == false {
		return nil, http.StatusBadRequest, errors.New(licenseResp.Error.Message)
	}
	license := licenseResp.Data
	licenseKeyUUID, err := utils.UUIDFromString(license.LicenseKey)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	license.LicenseKeyUUID = licenseKeyUUID
	return &license, 0, nil
}

func fetchLicense(licenseKey string) (*LicenseServerResponse, error) {
	httpClient, err := utils.NewHTTPClient()
	if err != nil {
		return nil, err
	}
	httpClient.Timeout = 10 * time.Second
	resp, err := httpClient.Get(fmt.Sprintf(GetLicenseAPIURL, licenseKey))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var licenseResp LicenseServerResponse
	err = json.Unmarshal(respBody, &licenseResp)
	if err != nil {
		log.Warn().Msgf("Error in fetching license: %s", string(respBody))
		return nil, err
	}
	return &licenseResp, nil
}

func generateDefaultLicense(ctx context.Context, email string, pgClient *postgresqlDb.Queries) *License {
	// In case of air-gapped environment, or when license server is not reachable, create license with default values
	var defaultLicenseUUID uuid.UUID
	var startDate time.Time

	dbLicense, err := GetLicense(ctx, pgClient)
	if err != nil {
		defaultLicenseUUID = utils.NewUUID()
		startDate = time.Now().UTC()
	} else {
		defaultLicenseUUID = dbLicense.LicenseKeyUUID
		startDate, err = time.Parse(DateLayout2, dbLicense.StartDate)
		if err != nil {
			startDate = time.Now().UTC()
		} else {
			now := time.Now().UTC()
			if now.Before(startDate) {
				startDate = time.Now().UTC()
			}
		}
	}
	endDate := startDate.Add(licenseDefaultDuration)

	emailDomain, _ := utils.GetEmailDomain(email)

	return &License{
		LicenseKey:                      defaultLicenseUUID.String(),
		LicenseKeyUUID:                  defaultLicenseUUID,
		LicenseEmail:                    email,
		LicenseEmailDomain:              emailDomain,
		IsActive:                        true,
		EndDate:                         endDate.Format(DateLayout1),
		NoOfHosts:                       licenseDefaultNumberOfHosts,
		NoOfCloudAccounts:               licenseDefaultNumberOfCloudAccounts,
		NoOfRegistries:                  licenseDefaultNumberOfRegistries,
		NoOfImagesInRegistry:            licenseDefaultNumberOfImagesInRegistry,
		CurrentHosts:                    0,
		DeepfenceSupportEmail:           DeepfenceSupportEmail,
		NotificationThresholdPercentage: 100,
		StartDate:                       startDate.Format(DateLayout1),
		Message:                         licenseDefaultMessage,
		Description:                     licenseDefaultDescription,
		LicenseType:                     "annual_subscription",
		RegistryCredentials:             RegistryCredentials{},
	}
}

func (l *License) Save(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	registryCredentials, err := json.Marshal(l.RegistryCredentials)
	if err != nil {
		return err
	}
	startDate, err := parseDate(l.StartDate)
	if err != nil {
		return err
	}
	endDate, err := parseDate(l.EndDate)
	if err != nil {
		return err
	}
	isActive := l.IsActive
	message := licenseDefaultMessage
	description := licenseDefaultDescription
	if l.CurrentHosts > l.NoOfHosts {
		isActive = false
		message = numberOfHostsExceededMessage
		description = fmt.Sprintf(numberOfHostsExceededDescription, l.NoOfHosts, l.CurrentHosts, l.DeepfenceSupportEmail)
	}
	if endDate.Before(time.Now().UTC()) {
		isActive = false
		message = licenseExpiredMessage
		description = fmt.Sprintf(licenseExpiredDescription, endDate, l.DeepfenceSupportEmail)
	}
	_, err = pgClient.UpsertLicense(ctx, postgresqlDb.UpsertLicenseParams{
		LicenseKey:            l.LicenseKeyUUID,
		LicenseEmail:          l.LicenseEmail,
		LicenseEmailDomain:    l.LicenseEmailDomain,
		StartDate:             startDate,
		EndDate:               endDate,
		NoOfHosts:             l.NoOfHosts,
		NoOfCloudAccounts:     l.NoOfCloudAccounts,
		NoOfRegistries:        l.NoOfRegistries,
		NoOfImagesInRegistry:  l.NoOfImagesInRegistry,
		CurrentHosts:          l.CurrentHosts,
		IsActive:              isActive,
		LicenseType:           l.LicenseType,
		DeepfenceSupportEmail: l.DeepfenceSupportEmail,
		RegistryCredentials:   registryCredentials,
		Message:               message,
		Description:           description,
	})
	return err
}

func (l *License) UpdateNotificationThresholdPercentage(ctx context.Context, pgClient *postgresqlDb.Queries, threshold int32) error {
	return pgClient.UpdateNotificationThreshold(ctx, postgresqlDb.UpdateNotificationThresholdParams{
		NotificationThresholdPercentage: threshold,
		LicenseKey:                      l.LicenseKeyUUID,
	})
}

func (l *License) Delete(ctx context.Context, pgClient *postgresqlDb.Queries) error {
	return pgClient.DeleteLicense(ctx, l.LicenseKeyUUID)
}

func GetLicense(ctx context.Context, pgClient *postgresqlDb.Queries) (*License, error) {
	pgLicense, err := pgClient.GetLicense(ctx)
	if err != nil {
		return nil, err
	}
	var registryCredentials RegistryCredentials
	err = json.Unmarshal(pgLicense.RegistryCredentials, &registryCredentials)
	if err != nil {
		return nil, err
	}
	endDate := formatDate(pgLicense.EndDate)
	license := License{
		LicenseKey:            pgLicense.LicenseKey.String(),
		LicenseKeyUUID:        pgLicense.LicenseKey,
		LicenseEmail:          pgLicense.LicenseEmail,
		LicenseEmailDomain:    pgLicense.LicenseEmailDomain,
		IsActive:              pgLicense.IsActive,
		EndDate:               endDate,
		NoOfHosts:             pgLicense.NoOfHosts,
		NoOfCloudAccounts:     pgLicense.NoOfCloudAccounts,
		NoOfRegistries:        pgLicense.NoOfRegistries,
		NoOfImagesInRegistry:  pgLicense.NoOfImagesInRegistry,
		CurrentHosts:          pgLicense.CurrentHosts,
		DeepfenceSupportEmail: pgLicense.DeepfenceSupportEmail,
		StartDate:             formatDate(pgLicense.StartDate),
		Message:               pgLicense.Message,
		Description:           pgLicense.Description,
		LicenseType:           pgLicense.LicenseType,
		RegistryCredentials:   registryCredentials,
	}
	return &license, err
}

func formatDate(dt time.Time) string {
	return dt.Format(DateLayout2)
}

func parseDate(dateString string) (time.Time, error) {
	return time.Parse(DateLayout1, dateString)
}

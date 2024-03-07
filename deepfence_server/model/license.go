package model

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"time"

	postgresqlDb "github.com/deepfence/ThreatMapper/deepfence_utils/postgresql/postgresql-db"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	"github.com/google/uuid"
)

const (
	dateLayout                = "2006-01-02 15:04:05.999999-07:00"
	dateLayout2               = "2006-01-02 15:04:05"
	licenseDefaultMessage     = "License Active"
	licenseDefaultDescription = "Your license is valid and active"
	licenseExpiredMessage     = "License Expired"
	licenseExpiredDescription = `Your license expired on %s.
To renew your license, please contact %s`
	numberOfHostsExceededMessage     = "License Count Exceeded"
	numberOfHostsExceededDescription = `Your license doesn't allow you to use Deepfence on more than %d hosts. Current usage is %d.
Please reduce the number of hosts or upgrade your license by contacting %s`

	errGenerateLicense = "Could not generate license. Please navigate to this URL in the browser to generate one: "
)

const (
	LicenseServerURL      = "https://license.deepfence.io/threatmapper"
	GenerateLicenseAPIURL = LicenseServerURL + "/generate-license?first_name=%s&last_name=%s&email=%s&company=%s&resend_email=%t"
	GetLicenseAPIURL      = LicenseServerURL + "/license?license_key=%s"
)

type GenerateLicenseRequest struct {
	FirstName   string `json:"first_name" validate:"required,user_name,min=2,max=32" required:"true"`
	LastName    string `json:"last_name" validate:"required,user_name,min=2,max=32" required:"true"`
	Email       string `json:"email" validate:"required,email" required:"true"`
	Company     string `json:"company" validate:"required,company_name,min=2,max=32" required:"true"`
	ResendEmail bool   `json:"resend_email" required:"true"`
}

type RegisterLicenseRequest struct {
	LicenseKey string `json:"license_key" validate:"required,uuid4" required:"true"`
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
		Message string `json:"message"`
	} `json:"error"`
	Success bool `json:"success"`
}

func GenerateLicense(req GenerateLicenseRequest) (*MessageResponse, error) {
	message := MessageResponse{Message: ""}
	generateLicenseAPIURL := fmt.Sprintf(GenerateLicenseAPIURL, req.FirstName, req.LastName, req.Email, req.Company, req.ResendEmail)
	var msg string
	var err error

	retryCounter := 0
	for {
		msg, err = generateLicense(generateLicenseAPIURL)
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
		message.Message = errGenerateLicense + generateLicenseAPIURL
		return &message, err
	}
	message.Message = msg
	return &message, nil
}

func generateLicense(generateLicenseAPIURL string) (string, error) {
	httpClient, err := utils.NewHTTPClient()
	if err != nil {
		return "", err
	}
	httpClient.Timeout = 15 * time.Second
	resp, err := httpClient.Get(generateLicenseAPIURL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var licenseResp LicenseServerResponse
	err = json.Unmarshal(respBody, &licenseResp)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != 200 {
		return "", errors.New(licenseResp.Error.Message)
	}
	if !licenseResp.Success {
		return "", errors.New(licenseResp.Error.Message)
	}
	return licenseResp.Data.Message, nil
}

func FetchLicense(licenseKey string) (*License, error) {
	var license *License
	var err error
	retryCounter := 0
	for {
		license, err = fetchLicense(licenseKey)
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
		return nil, err
	}
	return license, nil
}

func fetchLicense(licenseKey string) (*License, error) {
	httpClient, err := utils.NewHTTPClient()
	if err != nil {
		return nil, err
	}
	httpClient.Timeout = 15 * time.Second
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
		return nil, err
	}
	if resp.StatusCode != 200 {
		return nil, errors.New(licenseResp.Error.Message)
	}
	if !licenseResp.Success {
		return nil, errors.New(licenseResp.Error.Message)
	}
	license := licenseResp.Data
	licenseKeyUUID, err := utils.UUIDFromString(license.LicenseKey)
	if err != nil {
		return nil, err
	}
	license.LicenseKeyUUID = licenseKeyUUID
	return &license, nil
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
		LicenseKey:                      l.LicenseKeyUUID,
		StartDate:                       startDate,
		EndDate:                         endDate,
		NoOfHosts:                       l.NoOfHosts,
		NoOfCloudAccounts:               l.NoOfCloudAccounts,
		NoOfRegistries:                  l.NoOfRegistries,
		NoOfImagesInRegistry:            l.NoOfImagesInRegistry,
		CurrentHosts:                    l.CurrentHosts,
		IsActive:                        isActive,
		LicenseType:                     l.LicenseType,
		DeepfenceSupportEmail:           l.DeepfenceSupportEmail,
		NotificationThresholdPercentage: l.NotificationThresholdPercentage,
		RegistryCredentials:             registryCredentials,
		Message:                         message,
		Description:                     description,
	})
	return err
}

func (l *License) UpdateNotificationThresholdPercentage(ctx context.Context, pgClient *postgresqlDb.Queries, threshold int32) error {
	return pgClient.UpdateNotificationThreshold(ctx, postgresqlDb.UpdateNotificationThresholdParams{
		NotificationThresholdPercentage: threshold,
		LicenseKey:                      l.LicenseKeyUUID,
	})
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
	thresholdUpdatedAt := int64(0)
	if pgLicense.NotificationThresholdUpdatedAt.Valid {
		thresholdUpdatedAt = pgLicense.NotificationThresholdUpdatedAt.Time.Unix()
	}
	license := License{
		LicenseKey:                      pgLicense.LicenseKey.String(),
		LicenseKeyUUID:                  pgLicense.LicenseKey,
		IsActive:                        pgLicense.IsActive,
		EndDate:                         endDate,
		NoOfHosts:                       pgLicense.NoOfHosts,
		NoOfCloudAccounts:               pgLicense.NoOfCloudAccounts,
		NoOfRegistries:                  pgLicense.NoOfRegistries,
		NoOfImagesInRegistry:            pgLicense.NoOfImagesInRegistry,
		CurrentHosts:                    pgLicense.CurrentHosts,
		DeepfenceSupportEmail:           pgLicense.DeepfenceSupportEmail,
		NotificationThresholdPercentage: pgLicense.NotificationThresholdPercentage,
		NotificationThresholdUpdatedAt:  thresholdUpdatedAt,
		StartDate:                       formatDate(pgLicense.StartDate),
		Message:                         pgLicense.Message,
		Description:                     pgLicense.Description,
		LicenseType:                     pgLicense.LicenseType,
		RegistryCredentials:             registryCredentials,
	}
	return &license, err
}

func formatDate(dt time.Time) string {
	return dt.Format(dateLayout2) + " UTC"
}

func parseDate(dateString string) (time.Time, error) {
	return time.Parse(dateLayout, dateString)
}
